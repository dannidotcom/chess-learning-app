import { useState, useCallback } from 'react';
import * as api from '../api/chess';
import EvalChart from './EvalChart';

function formatEval(cp) {
  if (cp === null || cp === undefined) return '';
  if (cp > 9000) return '#+';
  if (cp < -9000) return '#-';
  const v = cp / 100;
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

export default function AnalysisPanel({ analysis, multiPv, hintMove, fen, moveHistory, gameState, evalHistory }) {
  const [llmTab, setLlmTab] = useState('position');
  const [llmResult, setLlmResult] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const { fetchReview } = gameState;

  const fetchLlmPosition = useCallback(async () => {
    setLlmLoading(true);
    try {
      const res = await api.llmExplainPosition(fen, moveHistory);
      setLlmResult({ type: 'position', text: res.explanation });
    } catch (e) {
      setLlmResult({ type: 'error', text: 'Erreur de connexion à Ollama' });
    }
    setLlmLoading(false);
  }, [fen, moveHistory]);

  const fetchLlmReview = useCallback(async () => {
    setLlmLoading(true);
    try {
      const reviews = analysis ? [analysis] : [];
      const res = await api.llmGameSummary(moveHistory, reviews);
      setLlmResult({ type: 'review', text: res.summary });
    } catch {
      setLlmResult({ type: 'error', text: 'Erreur de connexion à Ollama' });
    }
    setLlmLoading(false);
  }, [analysis, moveHistory]);

  const sendChat = useCallback(async () => {
    if (!chatMsg.trim()) return;
    const newHistory = [...chatHistory, { role: 'user', content: chatMsg }];
    setChatHistory(newHistory);
    setChatMsg('');
    try {
      const res = await api.llmChat(newHistory);
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion' }]);
    }
  }, [chatMsg, chatHistory]);

  const handleSuggestion = (s) => {
    setChatMsg(s);
  };

  const evalValue = analysis?.eval_cp;
  const evalPct = evalValue !== null && evalValue !== undefined
    ? Math.min(100, Math.max(0, 50 + evalValue / 200))
    : 50;

  return (
    <div className="analysis-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-tabs">
        <button className={`panel-tab ${llmTab === 'position' ? 'active' : ''}`} onClick={() => setLlmTab('position')}>
          Analyse
        </button>
        <button className={`panel-tab ${llmTab === 'graph' ? 'active' : ''}`} onClick={() => setLlmTab('graph')}>
          Graphique
        </button>
        <button className={`panel-tab ${llmTab === 'coach' ? 'active' : ''}`} onClick={() => setLlmTab('coach')}>
          Coach
        </button>
        <button className={`panel-tab ${llmTab === 'chat' ? 'active' : ''}`} onClick={() => setLlmTab('chat')}>
          Chat
        </button>
      </div>

      {llmTab === 'position' && (
        <div className="panel-content">
          <div className="eval-section">
            <div className="eval-header">
              <span className="eval-title">Évaluation</span>
              <span className={`eval-score ${evalValue > 0 ? 'positive' : evalValue < 0 ? 'negative' : 'equal'}`}>
                {formatEval(evalValue)}
              </span>
            </div>
            <div className="eval-progress">
              <div className="eval-track">
                <div className="eval-fill" style={{ width: `${evalPct}%` }} />
              </div>
              <div className="eval-labels">
                <span>-∞</span>
                <span>0</span>
                <span>+∞</span>
              </div>
            </div>
          </div>

          {analysis?.best_line && analysis.best_line.length > 0 && (
            <div className="best-line-section">
              <div className="section-title">Meilleure continuation</div>
              <div className="line-moves">
                {analysis.best_line.map((m, i) => (
                  <span key={i} className="line-move">
                    {i % 2 === 0 && <span className="line-num">{Math.floor(i / 2) + 1}.</span>}
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hintMove && (
            <div className="hint-section">
              <span className="hint-icon">💡</span>
              <span>Essayez <strong>{hintMove}</strong></span>
            </div>
          )}

          {multiPv.length > 0 && (
            <div className="multipv-section">
              <div className="section-title">Top coups</div>
              {multiPv.map((pv, i) => (
                <div key={i} className={`pv-line ${i === 0 ? 'best' : ''}`}>
                  <span className="pv-rank">
                    {i === 0 ? '★' : `${i + 1}.`}
                  </span>
                  <span className="pv-move">{pv.san || pv.uci}</span>
                  <span className="pv-eval">{formatEval(pv.eval_cp)}</span>
                </div>
              ))}
            </div>
          )}

          {moveHistory.length >= 4 && (
            <button className="llm-btn" onClick={fetchLlmReview} disabled={llmLoading}>
              {llmLoading ? 'Analyse...' : 'Analyser la partie (IA)'}
            </button>
          )}
        </div>
      )}

      {llmTab === 'graph' && (
        <div className="panel-content">
          <div className="section-title" style={{ marginBottom: 8 }}>Évolution de l'évaluation</div>
          <EvalChart evalHistory={evalHistory} />
          {moveHistory.length >= 4 && evalHistory.length < 2 && (
            <button className="llm-btn" onClick={fetchReview} style={{ marginTop: 12 }}>
              Analyser la partie
            </button>
          )}
        </div>
      )}

      {llmTab === 'coach' && (
        <div className="panel-content">
          <p className="coach-intro">
            Demandez des conseils sur la position actuelle.
          </p>
          <button className="llm-btn" onClick={fetchLlmPosition} disabled={llmLoading}>
            {llmLoading ? (
              <><span className="spinner-sm" /> Analyse en cours...</>
            ) : (
              'Expliquer la position'
            )}
          </button>
          {llmResult && (
            <div className={`llm-result ${llmResult.type === 'error' ? 'error' : ''}`}>
              {llmResult.text}
            </div>
          )}
        </div>
      )}

      {llmTab === 'chat' && (
        <div className="panel-content chat-tab" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="chat-messages" style={{ flex: 1 }}>
            {chatHistory.length === 0 && (
              <div className="chat-empty">
                <span className="chat-empty-icon">🤖</span>
                <p>Posez des questions sur la position, des concepts, ou des conseils.</p>
                <div className="chat-suggestions">
                  {['Quel est le meilleur plan ici ?', 'Explique le clouage', 'Que dois-je éviter dans cette position ?'].map(s => (
                    <button key={s} className="suggestion-chip" onClick={() => handleSuggestion(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                <div className="msg-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
                <div className="msg-content">{msg.content}</div>
              </div>
            ))}
            {llmLoading && (
              <div className="chat-message assistant">
                <div className="msg-avatar">🤖</div>
                <div className="msg-content typing">Réfléchit...</div>
              </div>
            )}
          </div>
          <div className="chat-input" style={{ flexShrink: 0 }}>
            <input
              type="text"
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Posez une question..."
              disabled={llmLoading}
            />
            <button className="chat-send" onClick={sendChat} disabled={!chatMsg.trim() || llmLoading}>
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
