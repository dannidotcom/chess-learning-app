import { useRef, useEffect } from 'react';

export default function MoveHistory({ moves, gameResult, historyIndex, onMoveClick }) {
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
      white: { san: moves[i], index: i },
      black: moves[i + 1] ? { san: moves[i + 1], index: i + 1 } : null,
    });
  }

  return (
    <>
      <div className="moves-table-wrapper" ref={listRef}>
        {pairs.length === 0 && !gameResult && (
          <div className="empty-moves">
            <span className="empty-icon">♟</span>
            <span>Les coups s'affichent ici</span>
          </div>
        )}
        <table className="moves-table">
          <tbody>
            {pairs.map(p => (
              <tr key={p.number}>
                <td className="move-num">{p.number}.</td>
                <td className={`move-cell ${p.white.index === historyIndex ? 'last' : ''}`}>
                  {p.white && (
                    <span className="move-san" onClick={() => onMoveClick(p.white.index)}>
                      {p.white.san}
                    </span>
                  )}
                </td>
                <td className={`move-cell ${p.black && p.black.index === historyIndex ? 'last' : ''}`}>
                  {p.black && (
                    <span className="move-san" onClick={() => onMoveClick(p.black.index)}>
                      {p.black.san}
                    </span>
                  )}
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
    </>
  );
}
