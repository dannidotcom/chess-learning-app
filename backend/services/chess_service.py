"""
Service métier pour les opérations d'échecs.

Respecte les principes SOLID :

- **S** (SRP) : Ce service ne gère que la logique d'analyse d'échecs.
  La communication avec le moteur est déléguée à IChessEngine (core/engine.py).
  La communication avec l'IA est déléguée à LlmService (services/llm_service.py).

- **D** (DIP) : Dépend de l'interface IChessEngine, pas de l'implémentation concrète.

- **O** (OCP) : Les nouvelles analyses s'ajoutent par extension, pas par modification.
"""

import json
import logging
from pathlib import Path
from typing import Optional

import chess

from core.config import config
from core.engine import IChessEngine, EngineFactory

logger = logging.getLogger(__name__)


class ChessService:
    """
    Service métier pour l'analyse de parties d'échecs.
    
    Encapsule toute la logique d'analyse :
    - Coup IA
    - Analyse de position
    - MultiPV
    - Revue de partie avec détection d'erreurs
    - Identification d'ouvertures
    
    Utilise IChessEngine via EngineFactory (injection de dépendance).
    """

    def __init__(self, engine: Optional[IChessEngine] = None):
        """
        Args:
            engine: Moteur d'échecs. Si None, utilise EngineFactory.
        """
        self._engine = engine or EngineFactory.get_engine()
        self._opening_book: Optional[dict] = self._load_opening_book()

    # ── Services principaux ──────────────────────────────────────────────

    def get_best_move(self, fen: str, elo: int = 1500, depth: int = 14) -> dict:
        """
        Calcule le meilleur coup pour une position.
        
        Args:
            fen: Position au format FEN
            elo: Niveau de force (0 = max)
            depth: Profondeur d'analyse
            
        Returns:
            dict avec 'move' (UCI), 'san' (notation algébrique)
            ou {'game_over': True, 'result': '...'} si partie terminée
            
        Raises:
            ValueError: Si le FEN est invalide
        """
        board = chess.Board(fen)

        # Vérifier si la partie est terminée
        if board.is_game_over():
            return {"game_over": True, "result": board.result()}

        # Calculer le meilleur coup via le moteur
        move = self._engine.get_best_move(board, elo=elo, depth=depth)
        if move is None:
            return {"game_over": True, "result": board.result()}

        return {"move": move.uci(), "san": board.san(move)}

    def analyse_position(self, fen: str, depth: int = 18) -> dict:
        """
        Analyse complète d'une position.
        
        Délègue le calcul à IChessEngine.analyse().
        """
        board = chess.Board(fen)
        return self._engine.analyse(board, depth=depth)

    def analyse_multi_pv(self, fen: str, pv_count: int = 3, depth: int = 14) -> dict:
        """
        Analyse MultiPV : les N meilleurs coups avec leurs évaluations.
        
        Utile pour l'apprentissage : montre les alternatives au meilleur coup.
        """
        board = chess.Board(fen)
        lines = self._engine.analyse_multi_pv(board, pv_count=pv_count, depth=depth)
        return {"lines": lines}

    def get_hint(self, fen: str, elo: int = 1500) -> dict:
        """
        Donne un indice : le meilleur coup à jouer.
        
        Utilise une profondeur réduite pour être rapide
        et un niveau ELO adapté au joueur.
        """
        board = chess.Board(fen)
        move = self._engine.get_best_move(board, elo=elo, depth=10)
        if move is None:
            return {"game_over": True, "result": board.result()}
        return {"move": move.uci(), "san": board.san(move)}

    def review_game(self, moves: list[str]) -> dict:
        """
        Analyse complète d'une partie jouée.
        
        Pour chaque coup, calcule l'évaluation et détecte :
        - Les erreurs (blunder) : perte > 300 centipions
        - Les fautes (mistake) : perte > 150 centipions
        - Les imprécisions (inaccuracy) : perte > 75 centipions
        
        Args:
            moves: Liste des coups en notation SAN
            
        Returns:
            dict avec la liste des coups analysés, le résultat,
            et des statistiques
        """
        board = chess.Board()
        reviews = []

        for i, san in enumerate(moves):
            try:
                board.push_san(san)
            except ValueError:
                logger.warning("Coup invalide ignoré: %s", san)
                continue

            # Analyser la position après chaque coup
            analysis = self._engine.analyse(board, depth=14)
            pv = analysis.get("best_line", [])
            best_san = pv[0] if pv else None
            is_best = (san == best_san)

            entry = {
                "move_number": i + 1,
                "move": san,
                "fen": board.fen(),
                "eval_cp": analysis.get("eval_cp"),
                "best_move": best_san,
                "is_best": is_best,
                "blunder": False,
                "mistake": False,
                "inaccuracy": False,
            }
            reviews.append(entry)

        # Classification des erreurs par différence d'évaluation
        self._classify_errors(reviews)

        return {
            "moves": reviews,
            "result": board.result() if board.is_game_over() else "*",
            "total_moves": len(reviews),
        }

    def identify_opening(self, moves: list[str]) -> dict:
        """
        Identifie le nom de l'ouverture à partir des coups joués.
        
        Parcourt l'arbre d'ouvertures (fichier JSON) pour trouver
        la correspondance la plus longue.
        
        Args:
            moves: Liste des coups en notation SAN
            
        Returns:
            dict avec 'name' (nom de l'ouverture) et 'moves' (suites possibles)
        """
        if not self._opening_book:
            return {"name": "", "moves": []}

        current = self._opening_book
        for m in moves:
            if m in current.get("moves", {}):
                current = current["moves"][m]
            else:
                break

        return {
            "name": current.get("name", ""),
            "moves": list(current.get("moves", {}).keys()),
        }

    def validate_move(self, fen: str, from_square: str, to_square: str,
                      promotion: Optional[str] = None) -> dict:
        """
        Valide un coup et retourne la nouvelle position.
        
        Args:
            fen: Position actuelle
            from_square: Case départ
            to_square: Case arrivée
            promotion: Pièce de promotion optionnelle
            
        Returns:
            dict avec valid, fen, san, game_over, result
        """
        board = chess.Board(fen)
        uci = f"{from_square}{to_square}{promotion or ''}"

        try:
            move = chess.Move.from_uci(uci)
        except ValueError:
            return {"valid": False}

        if move not in board.legal_moves:
            return {"valid": False}

        board.push(move)
        return {
            "valid": True,
            "fen": board.fen(),
            "san": board.san(move),
            "game_over": board.is_game_over(),
            "result": board.result() if board.is_game_over() else None,
        }

    # ── Méthodes privées ─────────────────────────────────────────────────

    def _classify_errors(self, reviews: list[dict]) -> None:
        """
        Classe chaque coup comme erreur, faute ou imprécision
        en comparant l'évaluation avant et après le coup.
        
        Seuils (en centipions) :
        - Blunder : > 300
        - Mistake : > 150
        - Inaccuracy : > 75
        """
        for i in range(1, len(reviews)):
            prev_eval = reviews[i - 1].get("eval_cp")
            curr_eval = reviews[i].get("eval_cp")
            if prev_eval is None or curr_eval is None:
                continue

            diff = abs(curr_eval - prev_eval)
            if diff > 300:
                reviews[i]["blunder"] = True
            elif diff > 150:
                reviews[i]["mistake"] = True
            elif diff > 75:
                reviews[i]["inaccuracy"] = True

    def _load_opening_book(self) -> Optional[dict]:
        """
        Charge le livre d'ouvertures depuis le fichier JSON.
        
        Returns:
            dict ou None si le fichier est introuvable ou invalide
        """
        path = config.OPENING_BOOK_PATH
        if not path.exists():
            logger.info("Fichier d'ouvertures non trouvé: %s", path)
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as exc:
            logger.warning("Erreur de chargement du livre d'ouvertures: %s", exc)
            return None
