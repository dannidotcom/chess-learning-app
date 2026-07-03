function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Clock({ white, black, turn }) {
  return (
    <div className="clock-container">
      <div className={`clock-display ${turn === 'b' ? 'clock-active' : ''}`}>
        <span className="clock-player">♚</span>
        <span className="clock-time">{formatTime(black)}</span>
      </div>
      <div className={`clock-display ${turn === 'w' ? 'clock-active' : ''}`}>
        <span className="clock-player">♔</span>
        <span className="clock-time">{formatTime(white)}</span>
      </div>
    </div>
  );
}
