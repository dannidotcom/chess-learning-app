import { useState, useMemo, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import MoveHistory from './MoveHistory';
import AnalysisPanel from './AnalysisPanel';
import GameControls from './GameControls';
import Clock from './Clock';
import useSound from '../hooks/useSound';
import EvalChart from './EvalChart';
import PuzzleView from './PuzzleView';

function formatEval(cp) {
  if (cp === null || cp === undefined) return '';
  if (cp > 9000) return 'M+';
  if (cp < -9000) return 'M-';
  const v = cp / 100;
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

export default function GameView({ gameState }) {
  const {
    game, fen, viewFen, status, moveHistory, historyIndex, isNavigating,
    playerColor, gameMode, elo, gameResult,
    analysis, multiPv, hintMove, openingName, checkSquare,
    clockWhite, clockBlack, showClock, evalHistory,
    annotations, soundEnabled,
    playerMove, undoMove, flipBoard, startNewGame,
    fetchAnalysis, fetchMultiPv, fetchHint, fetchReview,
    goToMove, goForward, goBack, setElo, setGameMode,
    addAnnotation, clearAnnotations, setSoundEnabled, setShowClock, registerSound,
  } = gameState;

  const [promotionDialog, setPromotionDialog] = useState(null);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const sounds = useSound();

  useEffect(() => {
    registerSound(sounds);
  }, [sounds, registerSound]);

  const handleDrop = (source, target, piece) => {
    if (status === 'thinking' || gameResult) return false;
    if (isNavigating) return false;
    if (piece[1].toLowerCase() === 'p' && (target[1] === '8' || target[1] === '1')) {
      setPromotionDialog({ from: source, to: target });
      return false;
    }
    return playerMove(source, target);
  };

  const handlePromotion = (piece) => {
    if (!promotionDialog) return;
    playerMove(promotionDialog.from, promotionDialog.to, piece);
    setPromotionDialog(null);
  };

  const displayFen = isNavigating ? viewFen : fen;

  const customSquareStyles = useMemo(() => {
    const styles = {};
    if (checkSquare && !isNavigating) {
      styles[checkSquare] = {
        background: 'radial-gradient(ellipse at center, rgba(255,0,0,0.6) 0%, transparent 70%)',
      };
    }
    return styles;
  }, [checkSquare, isNavigating]);

  const evalValue = analysis?.eval_cp;
  const evalPct = evalValue !== null && evalValue !== undefined
    ? Math.min(100, Math.max(0, 50 + evalValue / 200))
    : 50;

  const handleSquareClick = useCallback((square) => {
    if (soundEnabled && !isNavigating) {
    }
  }, [soundEnabled, isNavigating]);

  return (
    <div className="game-view">
      <div className="board-column">
        <div className="board-area">
          <div className="board-container">
            <div className="board-header">
              <span className="opening-name">{openingName || 'Position de départ'}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isNavigating && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>
                    {historyIndex + 1}/{moveHistory.length}
                  </span>
                )}
                <span className={`turn-indicator ${game.turn() === 'w' ? 'white-turn' : 'black-turn'}`}>
                  {game.turn() === 'w' ? 'Blancs' : 'Noirs'}
                </span>
              </div>
            </div>
            <div className="board-wrapper">
              <Chessboard
                id="pro-chessboard"
                position={displayFen}
                onPieceDrop={handleDrop}
                boardOrientation={playerColor === 'w' ? 'white' : 'black'}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                }}
                customDarkSquareStyle={{ backgroundColor: '#b58863' }}
                customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
                customSquareStyles={customSquareStyles}
                animationDuration={200}
                arePiecesDraggable={status !== 'thinking' && !gameResult && !isNavigating}
                showBoardNotation={true}
                onSquareClick={handleSquareClick}
              />
              {status === 'thinking' && (
                <div className="thinking-badge">
                  <div className="spinner" />
                  L'IA réfléchit...
                </div>
              )}
            </div>
            {showClock && (
              <Clock
                white={clockWhite}
                black={clockBlack}
                turn={game.turn()}
              />
            )}
          </div>

          <div className="eval-bar">
            <div
              className="eval-bar white-fill"
              style={{ flex: `${evalPct}%` }}
            >
              {formatEval(evalValue)}
            </div>
            <div
              className="eval-bar black-fill"
              style={{ flex: `${100 - evalPct}%` }}
            />
          </div>
        </div>

        <GameControls
          gameState={gameState}
          onAnalyse={fetchAnalysis}
          onMultiPv={fetchMultiPv}
          onHint={fetchHint}
          onReview={fetchReview}
          onPuzzle={() => setShowPuzzle(true)}
        />
      </div>

      <div className="sidebar">
        <div className="sidebar-card">
          <div className="card-header">
            <h3>Coups</h3>
            <div className="card-badges">
              {isNavigating && (
                <span className="card-badge blue" style={{ cursor: 'pointer' }} onClick={() => goToMove(moveHistory.length - 1)}>
                  ↪ Fin
                </span>
              )}
              <span className="card-badge gold">{moveHistory.length} coup{moveHistory.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <MoveHistory
            moves={moveHistory}
            gameResult={gameResult}
            historyIndex={historyIndex}
            onMoveClick={goToMove}
          />
        </div>

        <div className="sidebar-card" style={{ flex: 1, minHeight: 0 }}>
          <AnalysisPanel
            analysis={analysis}
            multiPv={multiPv}
            hintMove={hintMove}
            fen={fen}
            moveHistory={moveHistory}
            gameState={gameState}
            evalHistory={evalHistory}
          />
        </div>
      </div>

      {showPuzzle && (
        <div className="modal-overlay" onClick={() => setShowPuzzle(false)}>
          <div className="modal-dialog puzzle-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPuzzle(false)}>Fermer</button>
            <PuzzleView gameState={gameState} />
          </div>
        </div>
      )}

      {promotionDialog && (
        <div className="promotion-overlay" onClick={() => setPromotionDialog(null)}>
          <div className="promotion-dialog" onClick={e => e.stopPropagation()}>
            <h3>Promotion</h3>
            <div className="promotion-pieces">
              {['q', 'r', 'b', 'n'].map(p => (
                <button key={p} className="promo-btn" onClick={() => handlePromotion(p)}>
                  <span className="piece-char">
                    {playerColor === 'w'
                      ? { q: '♛', r: '♜', b: '♝', n: '♞' }[p]
                      : { q: '♕', r: '♖', b: '♗', n: '♘' }[p]
                    }
                  </span>
                  <span className="promo-label">{{ q: 'Dame', r: 'Tour', b: 'Fou', n: 'Cavalier' }[p]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
