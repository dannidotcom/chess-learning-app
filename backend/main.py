"""
Application FastAPI pour Chess Academy.

Point d'entrée de l'application. Assemble les différents
composants (routeurs, middleware) en suivant le principe
de séparation des responsabilités.

Respecte le principe SRP (Single Responsibility) :
- Ce module ne fait que monter l'application et configurer les middlewares
- Le routage est délégué aux routeurs (routers/)
- La logique métier est déléguée aux services (services/)
- La validation est déléguée aux modèles (models/)
- La configuration est déléguée au module core.config
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import config
from core.engine import EngineFactory
from routers import chess_router, llm_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-20s | %(levelname)-5s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gère le cycle de vie de l'application.
    
    - Au démarrage : initialise le moteur d'échecs (EngineFactory)
    - À l'arrêt : libère les ressources (arrêt de Stockfish)
    
    Permet d'injecter les dépendances une fois pour toute
    la durée de vie de l'application.
    """
    logger.info("Démarrage de Chess Academy API")
    EngineFactory.get_engine()
    yield
    logger.info("Arrêt de Chess Academy API")
    EngineFactory.shutdown()


app = FastAPI(
    title="Chess Academy API",
    description="""
    API REST pour l'application d'apprentissage des échecs.
    
    ## Moteur d'échecs
    - Analyse de position avec Stockfish
    - Coup IA avec niveau ELO ajustable
    - Revue de partie avec détection d'erreurs
    - MultiPV (top N coups)
    
    ## Coach IA (Ollama)
    - Explication pédagogique des positions
    - Analyse des coups joués
    - Résumé de partie
    - Chat interactif
    
    ## Modes de jeu
    - Contre l'IA
    - Deux joueurs local
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Middleware CORS ─────────────────────────────────────────────────────────
# Autorise les requêtes depuis le frontend (React en développement ou production)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routage ────────────────────────────────────────────────────────────────
# Chaque routeur gère un domaine spécifique de l'API

app.include_router(chess_router.router)
app.include_router(llm_router.router)


@app.get("/api/health")
async def health():
    """
    Endpoint de santé pour vérifier que l'API fonctionne.
    
    Returns:
        dict avec status "ok"
    """
    return {"status": "ok", "version": "2.0.0"}
