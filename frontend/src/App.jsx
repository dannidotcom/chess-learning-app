import { useState, useEffect } from 'react';
import useChessGame from './hooks/useChessGame';
import GameView from './components/GameView';
import ReviewModal from './components/ReviewModal';
import './styles/App.css';

export default function App() {
  const gameState = useChessGame();
  const [showReview, setShowReview] = useState(false);

  const handleReview = async () => {
    const res = await gameState.fetchReview();
    if (res) setShowReview(true);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch (e.key) {
        case 'n':
        case 'N':
          document.querySelector('.ctrl-btn.primary')?.click();
          break;
        case 'z':
        case 'Z':
          if (!e.ctrlKey) gameState.undoMove();
          break;
        case 'f':
        case 'F':
          gameState.flipBoard();
          break;
        case 'h':
        case 'H':
          document.querySelector('.ctrl-btn.accent')?.click();
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">♚</span>
            <div className="logo-text">
              <h1>Chess Academy</h1>
              <span className="logo-sub">Apprendre et progresser</span>
            </div>
          </div>
          <div className="header-info">
            <span className="version">v2.0</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <GameView gameState={gameState} />
      </main>

      {showReview && (
        <ReviewModal
          review={gameState.review}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
}
