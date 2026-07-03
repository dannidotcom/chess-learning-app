# Chess Academy

Application web professionnelle pour apprendre les échecs avec IA.
Interface premium, analyse Stockfish + LLM (Ollama), jeu contre IA ou local 2 joueurs.

## Architecture

```
chess-learning-app/
├── backend/              # FastAPI + Stockfish + Ollama
│   ├── main.py           # API (10+ endpoints)
│   ├── engine.py         # Analyse Stockfish (MultiPV, hint, review)
│   ├── llm.py            # IA Ollama (analyse, enseignement, chat)
│   └── Dockerfile
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api/chess.js          # Client API
│   │   ├── hooks/useChessGame.js # Logique de jeu
│   │   ├── components/
│   │   │   ├── GameView.jsx      # Plateau + coups
│   │   │   ├── GameControls.jsx  # Commandes + sélecteur niveau
│   │   │   ├── MoveHistory.jsx   # Historique des coups
│   │   │   ├── AnalysisPanel.jsx # Analyse + Coach IA + Chat
│   │   │   └── ReviewModal.jsx   # Revue de partie (modal)
│   │   └── styles/App.css        # Thème dark premium
│   └── Dockerfile
├── docker-compose.yml    # Ollama + Backend + Frontend
└── README.md
```

## Fonctionnalités

| Fonctionnalité | Détail |
|---------------|--------|
| **Modes de jeu** | Contre IA (Stockfish) ou 2 joueurs local |
| **Niveaux IA** | 5 niveaux (800-2500 ELO) |
| **Analyse** | Évaluation en temps réel, barre de score, meilleure continuation |
| **MultiPV** | Top 3 coups avec évaluation |
| **Hint** | Indice du meilleur coup |
| **Revue de partie** | Détection des erreurs, fautes, imprécisions |
| **Coach IA (Ollama)** | Explication de la position, résumé de partie |
| **Chat IA** | Posez des questions sur la partie (Ollama) |
| **Promotion** | Dialog de promotion |
| **Ouvertures** | Détection des noms d'ouvertures |
| **Interface** | Dark theme premium, responsive mobile |

## Lancement

### Docker (recommandé)

```bash
docker compose up --build
```

Attendre que Ollama démarre, puis ouvrir http://localhost:5173

### Manuel

**Backend :**
```bash
cd backend
pip install -r requirements.txt
# Installer Stockfish et Ollama
uvicorn main:app --reload --port 8000
```

**Frontend :**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/move` | Coup IA (Stockfish) |
| `POST /api/analyse` | Analyse profonde |
| `POST /api/multi-pv` | Top 3 coups |
| `POST /api/hint` | Indice |
| `POST /api/review` | Revue de partie |
| `POST /api/validate-move` | Validation coup |
| `GET /api/openings` | Noms d'ouvertures |
| `POST /api/llm/explain-position` | Explication IA (Ollama) |
| `POST /api/llm/game-summary` | Résumé de partie (Ollama) |
| `POST /api/llm/chat` | Chat pédagogique (Ollama) |
