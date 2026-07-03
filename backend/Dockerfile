FROM python:3.12-slim

# Installation des dépendances système : Stockfish + outils
RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY . .

EXPOSE 8000

# Lancement avec uvicorn (sans reload en production)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
