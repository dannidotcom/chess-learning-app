import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import * as api from '../api/chess';

export default function useChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState('idle');
  const [moveHistory, setMoveHistory] = useState([]);
  const [playerColor, setPlayerColor] = useState('w');
  const [gameMode, setGameMode] = useState('ai');
  const [elo, setElo] = useState(1200);
  const [gameResult, setGameResult] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [multiPv, setMultiPv] = useState([]);
  const [hintMove, setHintMove] = useState(null);
  const [lastEval, setLastEval] = useState(null);
  const [review, setReview] = useState(null);
  const [openingName, setOpeningName] = useState('');
  const [lastMoveSan, setLastMoveSan] = useState(null);
  const [checkSquare, setCheckSquare] = useState(null);

  const gameRef = useRef(game);
  const abortRef = useRef(false);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const updateGame = useCallback((newGame) => {
    gameRef.current = newGame;
    setGame(newGame);
    setFen(newGame.fen());
    const hist = newGame.history();
    setMoveHistory(hist);
    if (hist.length > 0) setLastMoveSan(hist[hist.length - 1]);

    if (newGame.isCheck()) {
      const king = newGame.board().flat().find(
        p => p && p.type === 'k' && p.color !== newGame.turn()
      );
      setCheckSquare(king ? `${String.fromCharCode(97 + king.square.charCodeAt(0) - 97)}${8 - king.square.charCodeAt(1) + 49}` : null);
    } else {
      setCheckSquare(null);
    }

    if (newGame.isGameOver()) {
      let result;
      if (newGame.isCheckmate()) {
        result = newGame.turn() === 'w' ? 'Les Noirs gagnent par échec et mat' : 'Les Blancs gagnent par échec et mat';
      } else if (newGame.isDraw()) {
        if (newGame.isStalemate()) result = 'Pat ! Partie nulle';
        else if (newGame.isInsufficientMaterial()) result = 'Matériel insuffisant — Partie nulle';
        else if (newGame.isThreefoldRepetition()) result = 'Répétition — Partie nulle';
        else result = 'Partie nulle';
      } else {
        result = 'Fin de partie';
      }
      setGameResult(result);
    } else {
      setGameResult(null);
    }
    setHintMove(null);
  }, []);

  const makeAiMove = useCallback(async (currentGame, currentElo) => {
    setStatus('thinking');
    abortRef.current = false;
    try {
      const res = await api.getAiMove(currentGame.fen(), currentElo);
      if (abortRef.current) return;
      const ng = new Chess(currentGame.fen());
      ng.move(res.move);
      updateGame(ng);
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('idle');
    }
  }, [updateGame]);

  const playerMove = useCallback(async (from, to, promotion) => {
    if (status === 'thinking' || gameResult) return false;
    const currentGame = gameRef.current;
    const ng = new Chess(currentGame.fen());
    try {
      const move = ng.move({ from, to, promotion: promotion || undefined });
      if (!move) return false;
      updateGame(ng);

      if (gameMode === 'ai' && ng.turn() !== playerColor && !ng.isGameOver()) {
        setTimeout(() => makeAiMove(ng, elo), 100);
      }
      return true;
    } catch {
      return false;
    }
  }, [status, gameResult, gameMode, playerColor, elo, makeAiMove, updateGame]);

  const startNewGame = useCallback((color = 'w', mode = 'ai') => {
    abortRef.current = true;
    setStatus('idle');
    setAnalysis(null);
    setMultiPv([]);
    setGameResult(null);
    setReview(null);
    setHintMove(null);
    setLastEval(null);
    setOpeningName('');
    setLastMoveSan(null);
    setCheckSquare(null);
    setPlayerColor(color);
    setGameMode(mode);
    const ng = new Chess();
    updateGame(ng);
    if (mode === 'ai' && color === 'b') {
      setTimeout(() => makeAiMove(ng, elo), 500);
    }
    return ng;
  }, [elo, makeAiMove, updateGame]);

  const undoMove = useCallback(() => {
    if (moveHistory.length < 1) return;
    const targetLen = gameMode === 'ai' ? Math.max(0, moveHistory.length - 2) : Math.max(0, moveHistory.length - 1);
    if (targetLen <= 0) {
      startNewGame(playerColor, gameMode);
      return;
    }
    const ng = new Chess();
    for (let i = 0; i < targetLen; i++) {
      try { ng.move(moveHistory[i]); } catch { break; }
    }
    abortRef.current = true;
    setStatus('idle');
    updateGame(ng);
    setAnalysis(null);
    setMultiPv([]);
  }, [moveHistory, gameMode, playerColor, startNewGame, updateGame]);

  const fetchAnalysis = useCallback(async () => {
    const currentFen = gameRef.current.fen();
    const res = await api.getAnalysis(currentFen);
    setAnalysis(res);
    setLastEval(res.eval_cp);
    return res;
  }, []);

  const fetchMultiPv = useCallback(async () => {
    const currentFen = gameRef.current.fen();
    const res = await api.getMultiPv(currentFen);
    setMultiPv(res.lines || []);
    return res;
  }, []);

  const fetchHint = useCallback(async () => {
    const currentFen = gameRef.current.fen();
    try {
      const res = await api.getHint(currentFen, elo);
      setHintMove(res.san);
      return res;
    } catch { return null; }
  }, [elo]);

  const fetchReview = useCallback(async () => {
    const hist = gameRef.current.history();
    if (hist.length === 0) return null;
    const res = await api.reviewGame(hist);
    setReview(res);
    return res;
  }, []);

  const flipBoard = useCallback(() => {
    setPlayerColor(prev => prev === 'w' ? 'b' : 'w');
  }, []);

  const getPgn = useCallback(() => {
    return gameRef.current.pgn();
  }, []);

  return {
    game, fen, status, moveHistory,
    playerColor, gameMode, elo, gameResult,
    analysis, multiPv, hintMove, lastEval, review, openingName,
    lastMoveSan, checkSquare,
    playerMove, startNewGame, undoMove, flipBoard,
    fetchAnalysis, fetchMultiPv, fetchHint, fetchReview,
    setElo, setPlayerColor, setGameMode, getPgn,
  };
}
