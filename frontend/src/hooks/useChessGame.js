import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import * as api from '../api/chess';

export default function useChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [viewFen, setViewFen] = useState(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
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
  const [evalHistory, setEvalHistory] = useState([]);
  const [review, setReview] = useState(null);
  const [openingName, setOpeningName] = useState('');
  const [lastMoveSan, setLastMoveSan] = useState(null);
  const [checkSquare, setCheckSquare] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [clockWhite, setClockWhite] = useState(600);
  const [clockBlack, setClockBlack] = useState(600);
  const [timeControl, setTimeControl] = useState('600');
  const [clockRunning, setClockRunning] = useState(false);
  const [showClock, setShowClock] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const gameRef = useRef(game);
  const abortRef = useRef(false);
  const clockRef = useRef(null);
  const soundCallbacks = useRef({});

  const registerSound = useCallback((cb) => {
    soundCallbacks.current = cb;
  }, []);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (clockRunning && !gameResult) {
      clockRef.current = setInterval(() => {
        if (game.turn() === 'w') {
          setClockWhite(prev => Math.max(0, prev - 1));
        } else {
          setClockBlack(prev => Math.max(0, prev - 1));
        }
      }, 1000);
    }
    return () => clearInterval(clockRef.current);
  }, [clockRunning, game.turn, gameResult]);

  const updateGame = useCallback((newGame, soundAction) => {
    gameRef.current = newGame;
    setGame(newGame);
    const fenStr = newGame.fen();
    setFen(fenStr);
    const hist = newGame.history();
    setMoveHistory(hist);
    setHistoryIndex(hist.length - 1);
    setViewFen(null);
    setIsNavigating(false);
    if (hist.length > 0) setLastMoveSan(hist[hist.length - 1]);

    if (soundAction && soundCallbacks.current) {
      const s = soundCallbacks.current;
      if (soundAction === 'capture') s.playCapture();
      else if (soundAction === 'castle') s.playCastle();
      else if (soundAction === 'check') s.playCheck();
      else s.playMove();
    }

    if (newGame.isCheck()) {
      const squares = newGame.board().flat().filter(p => p && p.type === 'k');
      const king = squares.find(p => p.color !== newGame.turn());
      if (king) {
        const file = String.fromCharCode(97 + king.square.charCodeAt(0) - 97);
        const rank = 8 - king.square.charCodeAt(1) + 49;
        setCheckSquare(`${file}${rank}`);
      }
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
      if (soundCallbacks.current) soundCallbacks.current.playGameOver();
      setClockRunning(false);
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
      const move = ng.move(res.move);
      const action = move.captured ? 'capture' : ng.isCheck() ? 'check' : null;
      updateGame(ng, action);
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
      const action = move.captured ? 'capture' : move.flags.includes('k') || move.flags.includes('q') ? 'castle' : ng.isCheck() ? 'check' : null;
      updateGame(ng, action);
      if (gameMode === 'ai' && ng.turn() !== playerColor && !ng.isGameOver()) {
        setTimeout(() => makeAiMove(ng, elo), 100);
      }
      return true;
    } catch {
      return false;
    }
  }, [status, gameResult, gameMode, playerColor, elo, makeAiMove, updateGame]);

  const startNewGame = useCallback((color = 'w', mode = 'ai', time = '600') => {
    abortRef.current = true;
    setStatus('idle');
    setAnalysis(null);
    setMultiPv([]);
    setGameResult(null);
    setReview(null);
    setHintMove(null);
    setLastEval(null);
    setEvalHistory([]);
    setOpeningName('');
    setLastMoveSan(null);
    setCheckSquare(null);
    setAnnotations([]);
    setPlayerColor(color);
    setGameMode(mode);
    setViewFen(null);
    setHistoryIndex(-1);
    setIsNavigating(false);

    if (time) {
      const sec = parseInt(time);
      setClockWhite(sec);
      setClockBlack(sec);
      setTimeControl(time);
      setShowClock(true);
      setClockRunning(true);
    } else {
      setShowClock(false);
      setClockRunning(false);
    }

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
      startNewGame(playerColor, gameMode, showClock ? timeControl : null);
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
  }, [moveHistory, gameMode, playerColor, startNewGame, updateGame, showClock, timeControl]);

  const goToMove = useCallback((index) => {
    if (index < -1 || index >= moveHistory.length) return;
    setHistoryIndex(index);
    if (index === -1) {
      const ng = new Chess();
      setViewFen(ng.fen());
      setIsNavigating(true);
      return;
    }
    const ng = new Chess();
    for (let i = 0; i <= index; i++) {
      try { ng.move(moveHistory[i]); } catch { break; }
    }
    setViewFen(ng.fen());
    setIsNavigating(true);
  }, [moveHistory]);

  const goForward = useCallback(() => {
    goToMove(historyIndex + 1);
  }, [goToMove, historyIndex]);

  const goBack = useCallback(() => {
    goToMove(historyIndex - 1);
  }, [goToMove, historyIndex]);

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
    const evals = res.moves.map(m => m.eval_cp);
    setEvalHistory(evals);
    return res;
  }, []);

  const flipBoard = useCallback(() => {
    setPlayerColor(prev => prev === 'w' ? 'b' : 'w');
  }, []);

  const getPgn = useCallback(() => {
    return gameRef.current.pgn();
  }, []);

  const addAnnotation = useCallback((type, square, color) => {
    setAnnotations(prev => [...prev, { type, square, color, id: Date.now() }]);
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  return {
    game, fen, viewFen, status, moveHistory, historyIndex, isNavigating,
    playerColor, gameMode, elo, gameResult,
    analysis, multiPv, hintMove, lastEval, evalHistory, review, openingName,
    lastMoveSan, checkSquare,
    clockWhite, clockBlack, timeControl, clockRunning, showClock,
    annotations, soundEnabled,
    playerMove, startNewGame, undoMove, flipBoard,
    fetchAnalysis, fetchMultiPv, fetchHint, fetchReview,
    goToMove, goForward, goBack,
    setElo, setPlayerColor, setGameMode, getPgn,
    addAnnotation, clearAnnotations,
    setSoundEnabled, setShowClock, registerSound,
  };
}
