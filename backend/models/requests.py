"""
Modèles Pydantic pour la validation des entrées API.

Respecte le principe SRP (Single Responsibility) :
- Chaque modèle encapsule la validation d'une requête spécifique
- Séparation claire entre les schémas de requête

Principe ISP (Interface Segregation) :
- Modèles petits et spécifiques à chaque endpoint
- Pas de modèle monolithique partagé
"""

from typing import Optional

import chess
from pydantic import BaseModel, Field


# ─── Modèles de requête ──────────────────────────────────────────────────────


class MoveRequest(BaseModel):
    """Requête pour obtenir un coup de l'IA."""
    fen: str = Field(default=chess.STARTING_FEN, description="Position FEN")
    elo: int = Field(default=1500, ge=0, le=3500, description="Force IA (ELO)")
    depth: int = Field(default=14, ge=1, le=30, description="Profondeur d'analyse")


class AnalyseRequest(BaseModel):
    """Requête pour analyser une position."""
    fen: str = Field(default=chess.STARTING_FEN, description="Position FEN")


class MultiPvRequest(BaseModel):
    """Requête pour analyser plusieurs variantes."""
    fen: str = Field(default=chess.STARTING_FEN, description="Position FEN")


class HintRequest(BaseModel):
    """Requête pour obtenir un indice."""
    fen: str = Field(default=chess.STARTING_FEN, description="Position FEN")
    elo: int = Field(default=1500, ge=0, le=3500, description="Force IA pour l'indice")


class ReviewRequest(BaseModel):
    """Requête pour revoir une partie complète."""
    moves: list[str] = Field(..., description="Liste des coups en notation SAN")


class ValidateMoveRequest(BaseModel):
    """Requête pour valider un coup."""
    fen: str = Field(..., description="Position FEN")
    from_square: str = Field(..., min_length=2, max_length=2, description="Case départ (ex: e2)")
    to_square: str = Field(..., min_length=2, max_length=2, description="Case arrivée (ex: e4)")
    promotion: Optional[str] = Field(default=None, description="Pièce de promotion (q, r, b, n)")


class OpeningRequest(BaseModel):
    """Requête pour identifier l'ouverture."""
    moves: list[str] = Field(default=[], description="Coups joués")


class LLMExplainPositionRequest(BaseModel):
    """Requête pour une explication IA de la position."""
    fen: str = Field(default=chess.STARTING_FEN, description="Position FEN")
    moves: Optional[list[str]] = Field(default=None, description="Coups joués")


class LLMExplainMoveRequest(BaseModel):
    """Requête pour une explication IA d'un coup spécifique."""
    fen: str = Field(..., description="Position FEN")
    move_san: str = Field(..., description="Coup en notation SAN")
    is_best: bool = Field(default=False, description="Est-ce le meilleur coup ?")
    eval_cp: Optional[int] = Field(default=None, description="Évaluation après le coup")
    best_move: Optional[str] = Field(default=None, description="Meilleur coup alternatif")


class LLMGameSummaryRequest(BaseModel):
    """Requête pour un résumé IA de la partie."""
    moves: list[str] = Field(..., description="Liste des coups")
    reviews: list[dict] = Field(default=[], description="Analyse coup par coup")


class LLMTeachRequest(BaseModel):
    """Requête pour un enseignement IA sur un concept."""
    fen: str = Field(default=chess.STARTING_FEN, description="Position FEN")
    concept: str = Field(default="développement des pièces", description="Concept à expliquer")


class LLMChatRequest(BaseModel):
    """Requête pour une conversation avec le coach IA."""
    messages: list[dict] = Field(..., description="Messages du chat (role, content)")
