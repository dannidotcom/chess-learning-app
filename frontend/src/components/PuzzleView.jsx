import { useState, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import * as api from '../api/chess';

export default function PuzzleView({ gameState }) {
  const [puzzle, setPuzzle] = useState(null);
  const [puzzleFen, setPuzzleFen] = useState(null);
  const [puzzleResult, setPuzzleResult] = useState(null);

  const loadPuzzle = useCallback(async () => {
    try {
      const p = await api.getRandomPuzzle();
      setPuzzle(p);
      setPuzzleFen(p.fen);
      setPuzzleResult(null);
    } catch {
      setPuzzleResult({ type: 'error', text: 'Impossible de charger un puzzle' });
    }
  }, []);

  useEffect(() => { loadPuzzle(); }, [loadPuzzle]);

  const handleDrop = useCallback(async (source, target, piece) => {
    if (!puzzle || puzzleResult) return false;
    const promotion = piece[1].toLowerCase() === 'p' && (target[1] === '8' || target[1] === '1') ? 'q' : undefined;
    const uci = `${source}${target}${promotion || ''}`;

    try {
      const res = await api.checkPuzzle(puzzle.id, uci);
      if (res.correct) {
        setPuzzleResult({ type: 'success', text: 'Bravo ! Coup correct' });
        return true;
      } else {
        setPuzzleResult({ type: 'fail', text: res.message || 'Incorrect, essayez encore' });
        return false;
      }
    } catch {
      return false;
    }
  }, [puzzle, puzzleResult]);

  return (
    <div className="puzzle-container">
      {!puzzle && !puzzleResult ? (
        <div className="llm-loading">Chargement du puzzle...</div>
      ) : (
        <>
          <div className="puzzle-header">
            <span className="puzzle-title">
              🧩 Puzzle {puzzle?.rating ? `ELO ${puzzle.rating}` : ''}
            </span>
            <span className="puzzle-theme">{puzzle?.theme}</span>
          </div>

          <div className="puzzle-board">
            <Chessboard
              id="puzzle-board"
              position={puzzleFen}
              onPieceDrop={handleDrop}
              boardOrientation="white"
              customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              }}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
              animationDuration={200}
              arePiecesDraggable={!puzzleResult}
              showBoardNotation={true}
            />
          </div>

          <p className="puzzle-description">
            {puzzle?.description || 'Trouvez le meilleur coup'}
          </p>

          {puzzleResult && (
            <div className={`puzzle-result ${puzzleResult.type}`}>
              <span>{puzzleResult.text}</span>
              <button className="ctrl-btn primary" onClick={loadPuzzle}>
                Puzzle suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
