import { useState } from 'react';

const ELO_LEVELS = [
  { label: 'Débutant', value: 800, icon: '🌱' },
  { label: 'Intermédiaire', value: 1200, icon: '♟' },
  { label: 'Avancé', value: 1600, icon: '⚔' },
  { label: 'Expert', value: 2000, icon: '👑' },
  { label: 'Maître', value: 2500, icon: '🏆' },
];

export default function GameControls({
  gameState,
  onAnalyse,
  onMultiPv,
  onHint,
  onReview,
}) {
  const {
    playerColor, gameMode, elo, status, gameResult,
    moveHistory, startNewGame, undoMove, flipBoard,
    setElo, setGameMode,
  } = gameState;

  const [showNewGame, setShowNewGame] = useState(false);

  const handleNewGame = (color, mode) => {
    startNewGame(color, mode);
    setShowNewGame(false);
  };

  return (
    <div className="game-controls">
      <div className="controls-row">
        <button className="ctrl-btn primary" onClick={() => setShowNewGame(true)}>
          <span className="ctrl-icon">+</span> Nouvelle partie
        </button>
        <button className="ctrl-btn" onClick={undoMove} disabled={moveHistory.length === 0}>
          <span className="ctrl-icon">↩</span> Annuler
        </button>
        <button className="ctrl-btn" onClick={flipBoard}>
          <span className="ctrl-icon">⟳</span> Retourner
        </button>
      </div>

      <div className="controls-row">
        <button className="ctrl-btn accent" onClick={onHint} disabled={status === 'thinking' || !!gameResult}>
          💡 Indice
        </button>
        <button className="ctrl-btn" onClick={onAnalyse} disabled={status === 'thinking'}>
          <span className="ctrl-icon">📊</span> Analyser
        </button>
        <button className="ctrl-btn" onClick={onMultiPv} disabled={status === 'thinking'}>
          <span className="ctrl-icon">📋</span> Top 3
        </button>
        <button className="ctrl-btn secondary" onClick={onReview} disabled={moveHistory.length === 0}>
          <span className="ctrl-icon">🔍</span> Revue
        </button>
      </div>

      <div className="elo-selector">
        <span className="elo-label">Niveau IA</span>
        <div className="elo-badges">
          {ELO_LEVELS.map(l => (
            <button
              key={l.value}
              className={`elo-badge ${elo === l.value ? 'active' : ''}`}
              onClick={() => setElo(l.value)}
            >
              <span className="elo-icon">{l.icon}</span>
              <span className="elo-text">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showNewGame && (
        <div className="modal-overlay" onClick={() => setShowNewGame(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nouvelle partie</h2>
            <div className="modal-section">
              <h3>Mode de jeu</h3>
              <div className="modal-options">
                <button
                  className={`modal-option ${gameMode === 'ai' ? 'active' : ''}`}
                  onClick={() => setGameMode('ai')}
                >
                  <span className="option-icon">🤖</span>
                  <span className="option-label">Contre l'IA</span>
                  <span className="option-desc">Affrontez Stockfish</span>
                </button>
                <button
                  className={`modal-option ${gameMode === 'local' ? 'active' : ''}`}
                  onClick={() => setGameMode('local')}
                >
                  <span className="option-icon">👥</span>
                  <span className="option-label">Deux joueurs</span>
                  <span className="option-desc">Jouez à deux sur cet écran</span>
                </button>
              </div>
            </div>
            <div className="modal-section">
              <h3>Vous jouez</h3>
              <div className="modal-options">
                <button className="modal-option color-option" onClick={() => handleNewGame('w', gameMode)}>
                  <span className="color-icon">♔</span>
                  <span className="option-label">Les Blancs</span>
                  <span className="option-desc">Premier coup</span>
                </button>
                <button className="modal-option color-option" onClick={() => handleNewGame('b', gameMode)}>
                  <span className="color-icon">♚</span>
                  <span className="option-label">Les Noirs</span>
                  <span className="option-desc">L'IA commence</span>
                </button>
              </div>
            </div>
            <button className="modal-close" onClick={() => setShowNewGame(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
