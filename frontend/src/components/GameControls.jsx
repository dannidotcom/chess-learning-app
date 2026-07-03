import { useState } from 'react';

const ELO_LEVELS = [
  { label: '800', value: 800 },
  { label: '1200', value: 1200 },
  { label: '1600', value: 1600 },
  { label: '2000', value: 2000 },
  { label: '2500', value: 2500 },
];

const TIME_OPTIONS = [
  { label: '1 min', value: '60' },
  { label: '3 min', value: '180' },
  { label: '5 min', value: '300' },
  { label: '10 min', value: '600' },
  { label: '30 min', value: '1800' },
];

export default function GameControls({
  gameState,
  onAnalyse,
  onMultiPv,
  onHint,
  onReview,
  onPuzzle,
}) {
  const {
    playerColor, gameMode, elo, status, gameResult,
    moveHistory, startNewGame, undoMove, flipBoard,
    setElo, setGameMode, goBack, goForward, historyIndex, isNavigating,
    soundEnabled, setSoundEnabled, showClock,
  } = gameState;

  const [showNewGame, setShowNewGame] = useState(false);
  const [pendingTime, setPendingTime] = useState('600');

  const handleNewGame = (color, mode) => {
    startNewGame(color, mode, mode === 'ai' || mode === 'local' ? pendingTime : null);
    setShowNewGame(false);
  };

  return (
    <>
      <div className="game-controls">
        <button className="ctrl-btn primary" onClick={() => setShowNewGame(true)}>
          <span className="ctrl-icon">+</span> Nouvelle
        </button>
        <button className="ctrl-btn" onClick={undoMove} disabled={moveHistory.length === 0 || isNavigating}>
          <span className="ctrl-icon">↩</span> Annuler
        </button>
        <button className="ctrl-btn" onClick={flipBoard}>
          <span className="ctrl-icon">⟳</span> Retourner
        </button>

        {(moveHistory.length > 0) && (
          <>
            <span className="ctrl-separator" />
            <button className="ctrl-btn" onClick={goBack} disabled={historyIndex < 0}>
              ◀
            </button>
            <button className="ctrl-btn" onClick={goForward} disabled={historyIndex >= moveHistory.length - 1}>
              ▶
            </button>
          </>
        )}

        <span className="ctrl-separator" />

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
        <button className="ctrl-btn secondary" onClick={onPuzzle}>
          <span className="ctrl-icon">🧩</span> Puzzle
        </button>

        <span className="ctrl-separator" />

        <button
          className="ctrl-btn"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title="Son"
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        <span className="ctrl-separator" />

        <div className="elo-control">
          <span className="elo-label">ELO</span>
          {ELO_LEVELS.map(l => (
            <button
              key={l.value}
              className={`elo-option ${elo === l.value ? 'active' : ''}`}
              onClick={() => setElo(l.value)}
            >
              {l.label}
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
                  <span className="option-desc">Jouez à deux</span>
                </button>
                <button
                  className={`modal-option ${gameMode === 'analysis' ? 'active' : ''}`}
                  onClick={() => setGameMode('analysis')}
                >
                  <span className="option-icon">🔬</span>
                  <span className="option-label">Analyse libre</span>
                  <span className="option-desc">Bougez librement les pièces</span>
                </button>
              </div>
            </div>
            <div className="modal-section">
              <h3>Temps</h3>
              <div className="modal-options" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                {TIME_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    className={`modal-option ${pendingTime === t.value ? 'active' : ''}`}
                    onClick={() => setPendingTime(t.value)}
                    style={{ padding: '12px 8px' }}
                  >
                    <span className="option-label" style={{ fontSize: '0.75rem' }}>{t.label}</span>
                  </button>
                ))}
                <button
                  className={`modal-option ${!pendingTime ? 'active' : ''}`}
                  onClick={() => setPendingTime(null)}
                  style={{ padding: '12px 8px' }}
                >
                  <span className="option-label" style={{ fontSize: '0.75rem' }}>∞</span>
                </button>
              </div>
            </div>
            <div className="modal-section">
              <h3>Vous jouez</h3>
              <div className="modal-options">
                <button className="modal-option" onClick={() => handleNewGame('w', gameMode)}>
                  <span className="option-icon">♔</span>
                  <span className="option-label">Les Blancs</span>
                  <span className="option-desc">Premier coup</span>
                </button>
                <button className="modal-option" onClick={() => handleNewGame('b', gameMode)}>
                  <span className="option-icon">♚</span>
                  <span className="option-label">Les Noirs</span>
                  <span className="option-desc">L'IA commence</span>
                </button>
              </div>
            </div>
            <button className="modal-close" onClick={() => setShowNewGame(false)}>Annuler</button>
          </div>
        </div>
      )}
    </>
  );
}
