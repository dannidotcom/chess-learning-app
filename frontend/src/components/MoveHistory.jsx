import { useRef, useEffect } from 'react';

export default function MoveHistory({ moves, gameResult, orientation }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moves.length]);

  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i] || '',
      black: moves[i + 1] || '',
    });
  }

  return (
    <div className="move-history-panel">
      <div className="panel-header">
        <h3>Coups</h3>
        <div className="panel-badges">
          <span className="badge move-count">{moves.length} coup{moves.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="moves-table-wrapper" ref={listRef}>
        {pairs.length === 0 && !gameResult && (
          <div className="empty-moves">
            <span className="empty-icon">♟</span>
            <span>Les coups s'afficheront ici</span>
          </div>
        )}
        <table className="moves-table">
          <tbody>
            {pairs.map(p => (
              <tr key={p.number}>
                <td className="move-num">{p.number}.</td>
                <td className={`move-cell ${p.white === moves[moves.length - 1] && moves.length % 2 === 1 ? 'last' : ''}`}>
                  {p.white && <span className="move-san">{p.white}</span>}
                </td>
                <td className={`move-cell ${p.black === moves[moves.length - 1] && moves.length % 2 === 0 ? 'last' : ''}`}>
                  {p.black && <span className="move-san">{p.black}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gameResult && (
        <div className={`game-result-banner ${gameResult.includes('Blancs') ? 'white-wins' : gameResult.includes('Noirs') ? 'black-wins' : 'draw'}`}>
          {gameResult}
        </div>
      )}
    </div>
  );
}
