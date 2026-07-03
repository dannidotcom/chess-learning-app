"""
Service d'intelligence artificielle pour le coaching d'échecs.

Respecte le principe SRP (Single Responsibility) :
- Ce service ne gère QUE les interactions avec Ollama
- La construction des prompts est encapsulée dans des méthodes dédiées
- La logique d'échecs est déléguée à ChessService

Utilise le modèle de langage via Ollama (llama3.2 ou autre)
pour fournir des explications pédagogiques en français.
"""

import logging
from typing import Optional

import httpx

from core.config import config

logger = logging.getLogger(__name__)

# Prompt système : définit la personnalité et le rôle du coach IA
SYSTEM_PROMPT = """Tu es un professeur d'échecs expert (2400 ELO). 
Tu analyses des positions d'échecs et donnes des explications pédagogiques claires.
Sois concis, précis, et utilise le vocabulaire des échecs (en français).
Adapte ton langage au niveau du joueur.
Réponds toujours en français."""


class LlmService:
    """
    Service de coaching par IA (Ollama).
    
    Fournit des explications en langage naturel sur :
    - Les positions d'échecs
    - Les coups joués
    - Les résumés de partie
    - Les concepts théoriques
    - Le chat libre (questions/réponses)
    
    Attributes:
        _base_url: URL du service Ollama
        _model: Nom du modèle à utiliser
        _timeout: Timeout HTTP en secondes
    """

    def __init__(
        self,
        base_url: str = config.OLLAMA_URL,
        model: str = config.OLLAMA_MODEL,
        timeout: int = config.OLLAMA_TIMEOUT,
    ):
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout

    # ── API publique ─────────────────────────────────────────────────────

    async def explain_position(
        self,
        fen: str,
        eval_cp: Optional[int],
        best_line: Optional[list[str]],
        moves: Optional[list[str]] = None,
    ) -> str:
        """
        Explique une position d'échecs en langage naturel.
        
        L'IA analyse la situation et donne des conseils pédagogiques.
        
        Args:
            fen: Position FEN
            eval_cp: Évaluation en centipions
            best_line: Meilleure continuation
            moves: Coups joués (contexte de la partie)
            
        Returns:
            Texte explicatif en français
        """
        eval_str = f"{eval_cp / 100:.2f}" if eval_cp is not None else "inconnue"
        best_str = ", ".join(best_line[:5]) if best_line else "inconnue"

        prompt = (
            f"Analyse cette position d'échecs.\n\n"
            f"Position FEN: {fen}\n"
            f"Coups joués: {' '.join(moves[-20:]) if moves else 'début de partie'}\n"
            f"Évaluation: {eval_str}\n"
            f"Meilleure continuation: {best_str}\n\n"
            f"Explique en 3-4 phrases :\n"
            f"1. Qui a l'avantage et pourquoi\n"
            f"2. Le plan du camp avantagé\n"
            f"3. Les menaces ou faiblesses clés\n"
            f"4. Ce à quoi le joueur doit faire attention"
        )
        return await self._ask(prompt, temperature=0.3)

    async def explain_move(
        self,
        fen: str,
        move_san: str,
        is_best: bool,
        eval_cp: Optional[int] = None,
        best_move: Optional[str] = None,
    ) -> str:
        """
        Explique pourquoi un coup est bon ou mauvais.
        
        Args:
            fen: Position FEN avant le coup
            move_san: Coup joué en notation SAN
            is_best: True si c'était le meilleur coup
            eval_cp: Évaluation après le coup
            best_move: Meilleur coup alternatif
            
        Returns:
            Explication pédagogique en français
        """
        eval_str = f"{eval_cp / 100:.2f}" if eval_cp is not None else "inconnue"

        if is_best:
            prompt = (
                f"Explique pourquoi ce coup est excellent.\n\n"
                f"Position: {fen}\n"
                f"Coup joué: {move_san}\n"
                f"Évaluation: {eval_str}\n\n"
                f"Explique en 2-3 phrases :\n"
                f"- Quelle est l'idée stratégique derrière ce coup\n"
                f"- Pourquoi c'est le meilleur coup dans cette position"
            )
        else:
            prompt = (
                f"Explique cette erreur aux échecs.\n\n"
                f"Position: {fen}\n"
                f"Coup joué: {move_san}\n"
                f"Évaluation: {eval_str}\n"
                f"Meilleur coup: {best_move}\n\n"
                f"Explique en 2-3 phrases :\n"
                f"- Quelle était l'intention probable du joueur\n"
                f"- Pourquoi ce coup est une erreur\n"
                f"- Pourquoi {best_move} était meilleur"
            )
        return await self._ask(prompt, temperature=0.3)

    async def game_summary(self, moves: list[str], reviews: list[dict]) -> str:
        """
        Génère un résumé pédagogique de la partie.
        
        Args:
            moves: Tous les coups joués
            reviews: Analyse coup par coup (avec classifications)
            
        Returns:
            Résumé en 4-5 phrases avec conseils
        """
        blunders = [r for r in reviews if r.get("blunder")]
        mistakes = [r for r in reviews if r.get("mistake")]
        inaccuracies = [r for r in reviews if r.get("inaccuracy")]
        total = len(reviews)

        prompt = (
            f"Analyse cette partie d'échecs terminée.\n\n"
            f"Nombre de coups: {total}\n"
            f"Erreurs: {len(blunders)}\n"
            f"Fautes: {len(mistakes)}\n"
            f"Imprécisions: {len(inaccuracies)}\n\n"
            f"Donne un résumé pédagogique de 4-5 phrases :\n"
            f"1. Le niveau général de la partie\n"
            f"2. Les moments clés (tournants)\n"
            f"3. Les erreurs typiques commises\n"
            f"4. Conseils pour progresser"
        )
        return await self._ask(prompt, temperature=0.4)

    async def teach_concept(self, fen: str, concept: str) -> str:
        """
        Enseigne un concept théorique des échecs.
        
        Args:
            fen: Position illustrant le concept
            concept: Concept à expliquer (ex: "clouage", "fourchette")
            
        Returns:
            Leçon pédagogique en 4-5 phrases
        """
        prompt = (
            f"Enseigne le concept suivant aux échecs.\n\n"
            f"Position FEN: {fen}\n"
            f"Concept: {concept}\n\n"
            f"Explique en 4-5 phrases :\n"
            f"- Ce qu'est ce concept\n"
            f"- Pourquoi il est important\n"
            f"- Comment l'illustrer dans cette position\n"
            f"- Un conseil pratique pour le joueur"
        )
        return await self._ask(prompt, temperature=0.5)

    async def chat(self, messages: list[dict]) -> str:
        """
        Répond à une question dans le cadre du chat pédagogique.
        
        Maintient le contexte via l'historique des messages.
        
        Args:
            messages: Liste des messages {role, content}
                     role: 'user' ou 'assistant'
                     
        Returns:
            Réponse du coach IA
        """
        system = SYSTEM_PROMPT + (
            "\nSois un entraîneur d'échecs patient et encourageant. "
            "Utilise des métaphores et des exemples concrets."
        )

        prompt = "Messages récents du chat:\n"
        for msg in messages[-8:]:
            role = "Élève" if msg.get("role") == "user" else "Professeur"
            prompt += f"{role}: {msg.get('content', '')}\n"
        prompt += "\nProfesseur (réponds de manière pédagogique):"

        return await self._ask(prompt, system=system, temperature=0.5)

    # ── Méthodes privées ─────────────────────────────────────────────────

    async def _ask(
        self,
        prompt: str,
        system: str = SYSTEM_PROMPT,
        temperature: float = 0.3,
    ) -> str:
        """
        Envoie une requête à Ollama et retourne la réponse.
        
        Args:
            prompt: Le prompt à envoyer
            system: Le prompt système (personnalité du modèle)
            temperature: Créativité de la réponse (0.0 = déterministe, 1.0 = créatif)
            
        Returns:
            Texte de la réponse ou message d'erreur
        """
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    f"{self._base_url}/api/generate",
                    json={
                        "model": self._model,
                        "prompt": prompt,
                        "system": system,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": 512,
                        },
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("response", "").strip()

        except httpx.TimeoutException:
            logger.warning("Timeout Ollama (%ss) pour le modèle %s", self._timeout, self._model)
            return "⚠️ Le service IA ne répond pas (timeout). Réessaie avec une question plus simple."
        except httpx.HTTPStatusError as exc:
            logger.warning("Erreur HTTP Ollama: %s", exc)
            return "⚠️ Le service IA est temporairement indisponible."
        except Exception as exc:
            logger.error("Erreur inattendue Ollama: %s", exc)
            return "⚠️ Analyse non disponible (Ollama hors ligne). Vérifie que le service est lancé."
