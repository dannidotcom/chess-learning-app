const API = '/api';

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Erreur API');
  }
  return res.json();
}

export function getAiMove(fen, elo = 1500, depth = 14) {
  return post('/move', { fen, elo, depth });
}

export function getAnalysis(fen) {
  return post('/analyse', { fen });
}

export function getMultiPv(fen) {
  return post('/multi-pv', { fen });
}

export function getHint(fen, elo = 1500) {
  return post('/hint', { fen, elo });
}

export function reviewGame(moves) {
  return post('/review', { moves });
}

export function validateMove(fen, fromSquare, toSquare, promotion) {
  return post('/validate-move', { fen, fromSquare, toSquare, promotion });
}

export function getOpening(moves) {
  return post('/openings', { moves });
}

export function llmExplainPosition(fen, moves) {
  return post('/llm/explain-position', { fen, moves });
}

export function llmExplainMove(fen, moveSan, isBest, evalCp, bestMove) {
  return post('/llm/explain-move', { fen, move_san: moveSan, is_best: isBest, eval_cp: evalCp, best_move: bestMove });
}

export function llmGameSummary(moves, reviews) {
  return post('/llm/game-summary', { moves, reviews });
}

export function llmTeach(fen, concept) {
  return post('/llm/teach', { fen, concept });
}

export function llmChat(messages) {
  return post('/llm/chat', { messages });
}
