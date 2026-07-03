"""
Routeur pour les endpoints du coach IA (Ollama).

Respecte le principe SRP (Single Responsibility) :
- Ce module ne gère que le routage HTTP
- La construction des prompts et la communication avec Ollama
  sont déléguées à LlmService
"""

import logging

from fastapi import APIRouter, HTTPException

from services.chess_service import ChessService
from services.llm_service import LlmService
from models.requests import (
    LLMExplainPositionRequest,
    LLMExplainMoveRequest,
    LLMGameSummaryRequest,
    LLMTeachRequest,
    LLMChatRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["Coach IA (Ollama)"])
chess_service = ChessService()
llm_service = LlmService()


@router.post("/explain-position")
async def llm_explain_position(req: LLMExplainPositionRequest):
    """
    Explique une position d'échecs en langage naturel.
    
    Combine l'analyse Stockfish avec une explication pédagogique
    générée par Ollama.
    
    Returns:
        - explanation: texte explicatif en français
        - analysis: données d'analyse de la position
    """
    try:
        analysis = chess_service.analyse_position(req.fen)
        text = await llm_service.explain_position(
            fen=req.fen,
            eval_cp=analysis.get("eval_cp"),
            best_line=analysis.get("best_line"),
            moves=req.moves,
        )
        return {"explanation": text, "analysis": analysis}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"FEN invalide: {exc}")


@router.post("/explain-move")
async def llm_explain_move(req: LLMExplainMoveRequest):
    """
    Explique pourquoi un coup est bon ou mauvais.
    
    Analyse pédagogique d'un coup spécifique dans une position donnée.
    Utile après avoir joué un coup pour comprendre s'il était bon.
    
    Returns:
        - explanation: texte explicatif en français
    """
    if not req.move_san:
        raise HTTPException(status_code=400, detail="move_san est requis")
    text = await llm_service.explain_move(
        fen=req.fen,
        move_san=req.move_san,
        is_best=req.is_best,
        eval_cp=req.eval_cp,
        best_move=req.best_move,
    )
    return {"explanation": text}


@router.post("/game-summary")
async def llm_game_summary(req: LLMGameSummaryRequest):
    """
    Génère un résumé pédagogique de la partie terminée.
    
    L'IA analyse les coups et les erreurs pour donner
    un feedback constructif.
    
    Returns:
        - summary: résumé en français avec conseils
    """
    text = await llm_service.game_summary(
        moves=req.moves, reviews=req.reviews
    )
    return {"summary": text}


@router.post("/teach")
async def llm_teach(req: LLMTeachRequest):
    """
    Enseigne un concept théorique des échecs.
    
    Exemples de concepts : "clouage", "fourchette", "sacrifice",
    "développement", "roque", "structure de pions", "finale de tours".
    
    Returns:
        - lesson: leçon pédagogique en français
    """
    text = await llm_service.teach_concept(fen=req.fen, concept=req.concept)
    return {"lesson": text}


@router.post("/chat")
async def llm_chat(req: LLMChatRequest):
    """
    Chat libre avec le coach IA.
    
    Posez des questions sur la partie, les stratégies,
    les concepts, ou demandez des conseils personnalisés.
    
    L'historique des messages est conservé pour le contexte.
    
    Returns:
        - reply: réponse du coach IA
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages est requis")
    text = await llm_service.chat(req.messages)
    return {"reply": text}
