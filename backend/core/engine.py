"""
Moteur d'échecs : abstraction et implémentations.

Respecte les principes SOLID suivants :

- **S** (Single Responsibility) : Chaque classe a une responsabilité unique
  - IChessEngine : interface qui définit le contrat
  - StockfishEngine : communique avec le processus UCI Stockfish
  - FallbackEngine : solution de repli sans dépendance externe
  - EngineFactory : crée et gère le cycle de vie du moteur

- **O** (Open/Closed) : 
  - Ajouter un nouveau moteur = implémenter IChessEngine
  - Aucune modification des classes existantes nécessaire

- **L** (Liskov Substitution) :
  - Toute implémentation de IChessEngine peut être utilisée interchangeablement

- **I** (Interface Segregation) :
  - L'interface IChessEngine expose uniquement les méthodes nécessaires

- **D** (Dependency Inversion) :
  - Le code métier dépend de IChessEngine (abstraction), pas de StockfishEngine (concret)
  - La factory permet l'injection de dépendance
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional

import chess
import chess.engine

from core.config import config

logger = logging.getLogger(__name__)


# ─── Interface moteur d'échecs ──────────────────────────────────────────────


class IChessEngine(ABC):
    """
    Interface abstraite pour un moteur d'échecs.
    
    Définit le contrat que toute implémentation doit respecter.
    Le code métier dépend de cette interface, pas des implémentations concrètes.
    """

    @abstractmethod
    def get_best_move(self, board: chess.Board, elo: int = 1500, depth: int = 14) -> Optional[chess.Move]:
        """Retourne le meilleur coup pour la position donnée."""
        ...

    @abstractmethod
    def analyse(self, board: chess.Board, depth: int = 18) -> dict:
        """Analyse une position et retourne évaluation + meilleure ligne."""
        ...

    @abstractmethod
    def analyse_multi_pv(self, board: chess.Board, pv_count: int = 3, depth: int = 14) -> list[dict]:
        """Analyse plusieurs variantes (MultiPV)."""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Vérifie si le moteur est opérationnel."""
        ...


# ─── Implémentation Stockfish (UCI) ─────────────────────────────────────────


class StockfishEngine(IChessEngine):
    """
    Moteur d'échecs basé sur Stockfish via le protocole UCI.
    
    Gère le cycle de vie du processus Stockfish et
    la communication via python-chess.
    
    Attributes:
        _engine: Instance du moteur UCI python-chess
        _path: Chemin vers l'exécutable Stockfish
    """

    def __init__(self, path: str = config.STOCKFISH_PATH):
        self._path = path
        self._engine: Optional[chess.engine.SimpleEngine] = None

    # ── Gestion du cycle de vie ──────────────────────────────────────────

    def start(self) -> None:
        """Démarre le processus Stockfish."""
        if self._engine is not None:
            return
        try:
            self._engine = chess.engine.SimpleEngine.popen_uci(self._path)
            logger.info("Stockfish démarré depuis %s", self._path)
        except Exception as exc:
            logger.warning("Impossible de démarrer Stockfish (%s): %s", self._path, exc)
            self._engine = None

    def stop(self) -> None:
        """Arrête proprement le processus Stockfish."""
        if self._engine is not None:
            try:
                self._engine.quit()
            except Exception as exc:
                logger.warning("Erreur à l'arrêt de Stockfish: %s", exc)
            finally:
                self._engine = None
                logger.info("Stockfish arrêté")

    # ── Implémentation IChessEngine ──────────────────────────────────────

    def is_available(self) -> bool:
        return self._engine is not None

    def get_best_move(self, board: chess.Board, elo: int = 1500, depth: int = 14) -> Optional[chess.Move]:
        """
        Calcule le meilleur coup avec un niveau de force ajusté (ELO).
        
        Args:
            board: Position actuelle
            elo: Force de jeu (800-2500). 0 = force maximale
            depth: Profondeur d'analyse en demi-coups
            
        Returns:
            Meilleur coup ou None si aucun coup légal
        """
        if self._engine is None:
            raise RuntimeError("Moteur non initialisé")

        limits = chess.engine.Limit(depth=depth)
        
        # Ajustement du niveau de force (UCI LimitStrength)
        # Stockfish UCI_Elo range: 1320-3190
        if 0 < elo < 3500:
            clamped_elo = max(1320, min(elo, 3190))
            self._engine.configure({"UCI_LimitStrength": True, "UCI_Elo": clamped_elo})
        else:
            self._engine.configure({"UCI_LimitStrength": False})

        result = self._engine.play(board, limits)
        return result.move

    def analyse(self, board: chess.Board, depth: int = 18) -> dict:
        """
        Analyse complète d'une position.
        
        Args:
            board: Position à analyser
            depth: Profondeur d'analyse
            
        Returns:
            Dictionnaire avec :
            - eval_cp: Évaluation en centipions (positif = avantage blancs)
            - best_line: Meilleure continuation (liste de SAN)
            - best_move_san: Meilleur coup en notation SAN
            - best_move_uci: Meilleur coup en notation UCI
        """
        if self._engine is None:
            raise RuntimeError("Moteur non initialisé")

        info = self._engine.analyse(board, chess.engine.Limit(depth=depth))
        score = info.get("score")
        pv = info.get("pv", [])
        
        # Conversion du score en centipions
        eval_cp = score.pov(chess.WHITE).score(mate_score=10000) if score else 0

        return {
            "eval_cp": eval_cp,
            "best_line": [board.san(m) for m in pv[:8]],
            "best_move_san": board.san(pv[0]) if pv else None,
            "best_move_uci": pv[0].uci() if pv else None,
        }

    def analyse_multi_pv(self, board: chess.Board, pv_count: int = 3, depth: int = 14) -> list[dict]:
        """
        Analyse MultiPV : retourne les N meilleurs coups avec leurs évaluations.
        
        Args:
            board: Position à analyser
            pv_count: Nombre de variantes à calculer
            depth: Profondeur d'analyse
            
        Returns:
            Liste de dictionnaires triés par rang (meilleur en premier),
            chacun contenant rank, eval_cp, san, uci, line
        """
        if self._engine is None:
            raise RuntimeError("Moteur non initialisé")

        self._engine.configure({"MultiPV": pv_count})
        infos = self._engine.analyse(board, chess.engine.Limit(depth=depth), multipv=pv_count)

        results = []
        for line_info in infos:
            score = line_info.get("score")
            pv = line_info.get("pv", [])
            cp = score.pov(chess.WHITE).score(mate_score=10000) if score else 0
            results.append({
                "rank": line_info.get("multipv", 1),
                "eval_cp": cp,
                "san": board.san(pv[0]) if pv else None,
                "uci": pv[0].uci() if pv else None,
                "line": [board.san(m) for m in pv[:6]],
            })

        # Réinitialiser MultiPV à 1 pour les appels suivants
        self._engine.configure({"MultiPV": 1})
        return sorted(results, key=lambda r: r["rank"])


# ─── Implémentation de repli (sans Stockfish) ────────────────────────────────


class FallbackEngine(IChessEngine):
    """
    Moteur de repli utilisé quand Stockfish n'est pas disponible.
    
    Joue des coups légaux aléatoires (hash-based pour être déterministe).
    Utile pour le développement ou les tests sans dépendance externe.
    """

    def is_available(self) -> bool:
        return True

    def get_best_move(self, board: chess.Board, elo: int = 1500, depth: int = 14) -> Optional[chess.Move]:
        legal = list(board.legal_moves)
        if not legal:
            return None
        return legal[hash(board.fen()) % len(legal)]

    def analyse(self, board: chess.Board, depth: int = 18) -> dict:
        return {
            "eval_cp": 0,
            "best_line": [],
            "best_move_san": None,
            "best_move_uci": None,
        }

    def analyse_multi_pv(self, board: chess.Board, pv_count: int = 3, depth: int = 14) -> list[dict]:
        return []


# ─── Factory : crée et fournit le moteur adapté ─────────────────────────────


class EngineFactory:
    """
    Fabrique de moteurs d'échecs.
    
    Implémente le pattern Factory Method pour découpler
    la création du moteur de son utilisation.
    
    - Tente de créer StockfishEngine en priorité
    - Fallback vers FallbackEngine si indisponible
    """
    
    _instance: Optional[IChessEngine] = None

    @classmethod
    def get_engine(cls) -> IChessEngine:
        """
        Retourne l'instance unique du moteur (singleton).
        
        Returns:
            IChessEngine: Moteur d'échecs prêt à l'emploi
        """
        if cls._instance is not None:
            return cls._instance

        # Tentative de démarrage de Stockfish
        stockfish = StockfishEngine()
        stockfish.start()

        if stockfish.is_available():
            cls._instance = stockfish
            logger.info("Moteur: Stockfish")
        else:
            cls._instance = FallbackEngine()
            logger.warning("Moteur: Fallback (Stockfish indisponible)")

        return cls._instance

    @classmethod
    def shutdown(cls) -> None:
        """Arrête le moteur et libère les ressources."""
        if isinstance(cls._instance, StockfishEngine):
            cls._instance.stop()
        cls._instance = None
