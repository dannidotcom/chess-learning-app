"""
Configuration centralisée de l'application.

Respecte le principe DIP (Dependency Inversion Principle) :
- Les classes concrètes dépendent de cette abstraction de configuration
- Pas de valeurs en dur dans le code métier
- Les variables d'environnement sont lues ici uniquement
"""

import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Config:
    """
    Configuration immutable de l'application.
    
    Toutes les valeurs proviennent de variables d'environnement
    avec des valeurs par défaut raisonnables.
    
    Attributes:
        STOCKFISH_PATH: Chemin vers l'exécutable Stockfish
        OLLAMA_URL: URL du service Ollama
        OLLAMA_MODEL: Nom du modèle Ollama à utiliser
        OLLAMA_TIMEOUT: Timeout en secondes pour les requêtes Ollama
        ENGINE_DEPTH: Profondeur d'analyse par défaut
        ENGINE_MULTIPV: Nombre de variantes à analyser
        MAX_MOVES_REVIEW: Nombre max de coups pour la revue
        CORS_ORIGINS: Origines autorisées pour CORS
        OPENING_BOOK_PATH: Chemin vers le fichier d'ouvertures
    """
    STOCKFISH_PATH: str = os.environ.get("STOCKFISH_PATH", "stockfish")
    OLLAMA_URL: str = os.environ.get("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
    OLLAMA_TIMEOUT: int = int(os.environ.get("OLLAMA_TIMEOUT", "60"))
    ENGINE_DEPTH: int = int(os.environ.get("ENGINE_DEPTH", "18"))
    ENGINE_MULTIPV: int = int(os.environ.get("ENGINE_MULTIPV", "3"))
    MAX_MOVES_REVIEW: int = int(os.environ.get("MAX_MOVES_REVIEW", "200"))
    CORS_ORIGINS: list[str] = field(default_factory=lambda: ["*"])
    OPENING_BOOK_PATH: Path = Path(__file__).parent.parent / "openings.json"


# Instance singleton de la configuration
config = Config()
