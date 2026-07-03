"""
Routeur pour les endpoints du moteur d'échecs.

Respecte le principe SRP (Single Responsibility) :
- Ce module ne gère que le routage HTTP et la validation
- La logique métier est déléguée à ChessService
- La validation des entrées est déléguée aux modèles Pydantic
"""

import logging

from fastapi import APIRouter, HTTPException

from models.requests import (
    MoveRequest,
    AnalyseRequest,
    MultiPvRequest,
    HintRequest,
    ReviewRequest,
    ValidateMoveRequest,
    OpeningRequest,
)
from services.chess_service import ChessService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Moteur d'échecs"])
chess_service = ChessService()


@router.post("/move")
async def ai_move(req: MoveRequest):
    """
    Calcule le meilleur coup pour une position donnée.
    
    Utilise Stockfish avec un niveau ELO ajustable.
    Retourne le coup en notation UCI et SAN.
    
    Returns:
        - 'move' (UCI) et 'san' (SAN) si la partie continue
        - 'game_over': True et 'result' si la partie est terminée
    """
    try:
        return chess_service.get_best_move(req.fen, elo=req.elo, depth=req.depth)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"FEN invalide: {exc}")


@router.post("/analyse")
async def analyse_position(req: AnalyseRequest):
    """
    Analyse complète d'une position.
    
    Retourne l'évaluation en centipions, la meilleure continuation,
    et le meilleur coup.
    
    Returns:
        - eval_cp: évaluation (positif = avantage blancs)
        - best_line: liste des coups de la meilleure continuation
        - best_move_san: meilleur coup en notation SAN
        - best_move_uci: meilleur coup en notation UCI
    """
    try:
        return chess_service.analyse_position(req.fen)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"FEN invalide: {exc}")


@router.post("/multi-pv")
async def multi_pv(req: MultiPvRequest):
    """
    Analyse MultiPV : retourne les 3 meilleurs coups avec évaluations.
    
    Utile pour comparer les options tactiques et stratégiques.
    
    Returns:
        Liste des N meilleurs coups avec leur évaluation et continuation
    """
    try:
        return chess_service.analyse_multi_pv(req.fen)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"FEN invalide: {exc}")


@router.post("/hint")
async def hint(req: HintRequest):
    """
    Donne un indice : le meilleur coup à jouer.
    
    Utilise une profondeur réduite pour une réponse rapide.
    
    Returns:
        - 'move' (UCI) et 'san' (SAN) du coup suggéré
        - 'game_over': True si la partie est terminée
    """
    try:
        return chess_service.get_hint(req.fen, elo=req.elo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"FEN invalide: {exc}")


@router.post("/review")
async def review_game(req: ReviewRequest):
    """
    Analyse complète d'une partie jouée.
    
    Pour chaque coup, calcule l'évaluation et détecte :
    - Les **erreurs** (blunder) : perte > 300 centipions
    - Les **fautes** (mistake) : perte > 150 centipions
    - Les **imprécisions** (inaccuracy) : perte > 75 centipions
    
    Retourne aussi le résultat de la partie.
    """
    return chess_service.review_game(req.moves)


@router.post("/validate-move")
async def validate_move(req: ValidateMoveRequest):
    """
    Valide un coup et retourne la nouvelle position.
    
    Vérifie qu'un coup est légal et applique la modification.
    Gère la promotion automatique.
    
    Returns:
        - valid: booléen
        - fen: nouvelle position
        - san: coup en notation algébrique
        - game_over: booléen
        - result: résultat si partie terminée
    """
    return chess_service.validate_move(
        req.fen, req.from_square, req.to_square, req.promotion
    )


@router.post("/openings")
async def get_opening(req: OpeningRequest):
    """
    Identifie le nom de l'ouverture à partir des coups joués.
    
    Parcourt le livre d'ouvertures intégré pour trouver
    la correspondance.
    
    Returns:
        - name: nom de l'ouverture (ex: "Début du Pion du Roi")
        - moves: coups possibles dans cette ouverture
    """
    return chess_service.identify_opening(req.moves)
