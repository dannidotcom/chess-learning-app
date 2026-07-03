import { useCallback, useRef } from 'react';

export default function useSound() {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const playTone = useCallback((freq, duration, type = 'sine', volume = 0.15) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, []);

  const playMove = useCallback(() => {
    playTone(600, 0.08, 'sine', 0.12);
  }, [playTone]);

  const playCapture = useCallback(() => {
    playTone(400, 0.1, 'triangle', 0.15);
    setTimeout(() => playTone(500, 0.08, 'sine', 0.1), 60);
  }, [playTone]);

  const playCastle = useCallback(() => {
    playTone(300, 0.06, 'sine', 0.1);
    setTimeout(() => playTone(500, 0.06, 'sine', 0.1), 50);
    setTimeout(() => playTone(700, 0.1, 'sine', 0.12), 100);
  }, [playTone]);

  const playCheck = useCallback(() => {
    playTone(800, 0.15, 'square', 0.08);
    setTimeout(() => playTone(1000, 0.2, 'square', 0.06), 100);
  }, [playTone]);

  const playGameOver = useCallback(() => {
    playTone(500, 0.2, 'sine', 0.12);
    setTimeout(() => playTone(400, 0.2, 'sine', 0.1), 200);
    setTimeout(() => playTone(300, 0.4, 'sine', 0.08), 400);
  }, [playTone]);

  return { playMove, playCapture, playCastle, playCheck, playGameOver };
}
