export default function ReviewModal({ review, onClose }) {
  if (!review) return null;

  const { moves, result, total_moves } = review;
  const blunders = moves.filter(m => m.blunder).length;
  const mistakes = moves.filter(m => m.mistake && !m.blunder).length;
  const inaccuracies = moves.filter(m => m.inaccuracy && !m.mistake && !m.blunder).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog review-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Revue de partie</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="review-stats">
          <div className="stat-card">
            <span className="stat-value">{total_moves}</span>
            <span className="stat-label">Coups</span>
          </div>
          <div className="stat-card error">
            <span className="stat-value">{blunders}</span>
            <span className="stat-label">Erreurs</span>
          </div>
          <div className="stat-card mistake">
            <span className="stat-value">{mistakes}</span>
            <span className="stat-label">Fautes</span>
          </div>
          <div className="stat-card inaccuracy">
            <span className="stat-value">{inaccuracies}</span>
            <span className="stat-label">Imprécisions</span>
          </div>
        </div>

        <div className="review-list">
          {moves.map((m, i) => (
            <div key={i} className={`review-entry ${
              m.blunder ? 'blunder' : m.mistake ? 'mistake' : m.inaccuracy ? 'inaccuracy' : ''
            }`}>
              <span className="rev-num">{m.move_number}.</span>
              <span className="rev-move">{m.move}</span>
              <span className="rev-eval">{m.eval_cp !== null ? `${(m.eval_cp / 100).toFixed(2)}` : ''}</span>
              {m.best_move && m.move !== m.best_move && (
                <span className="rev-best">→ {m.best_move}</span>
              )}
              {m.blunder && <span className="rev-tag blunder-tag">Erreur</span>}
              {m.mistake && !m.blunder && <span className="rev-tag mistake-tag">Faute</span>}
              {m.inaccuracy && !m.mistake && <span className="rev-tag inaccuracy-tag">Imprécision</span>}
            </div>
          ))}
        </div>

        <div className="review-result">
          <strong>Résultat :</strong> {result === '1-0' ? 'Les Blancs gagnent' : result === '0-1' ? 'Les Noirs gagnent' : result === '1/2-1/2' ? 'Partie nulle' : result}
        </div>
      </div>
    </div>
  );
}
