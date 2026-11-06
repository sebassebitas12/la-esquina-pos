import { useEffect, useMemo, useRef, useState } from 'react';
import { createApiClient } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Icon } from './Icon.jsx';

const quickQuestions = ['¿Qué debo reponer hoy?', '¿Cómo van las ventas de hoy?'];

export default function AssistantChat() {
  const { token, logout } = useAuth();
  const api = useMemo(() => createApiClient(token, logout), [token, logout]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: 'Puedo revisar productos, existencias bajas y ventas de hoy.' }]);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) {
      const frame = window.requestAnimationFrame(() => textareaRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy, open]);

  async function sendQuestion(value = draft) {
    const pregunta = value.trim();
    if (!pregunta || busy) return;

    setDraft('');
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: pregunta }]);
    setBusy(true);
    try {
      const result = await api.ai.consulta(pregunta);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: result.respuesta }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: 'assistant', content: error.message }]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    sendQuestion();
  }

  function handleKeys(event) {
    if (event.key === 'Escape') setOpen(false);
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendQuestion();
    }
  }

  return <>
    <button className="assistant-launcher" type="button" aria-expanded={open} aria-controls="assistant-window" onClick={() => setOpen((current) => !current)}>
      <Icon name={open ? 'close' : 'sparkles'} size={18} /><span>{open ? 'Cerrar asistente' : 'Asistente DeepSeek'}</span>
    </button>
    {open && <section id="assistant-window" className="assistant-window" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
      <header className="assistant-header">
        <div><span className="assistant-status">Asistente comercial</span><h2 id="assistant-title">Asistente DeepSeek</h2></div>
        <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Cerrar asistente"><Icon name="close" size={18} /></button>
      </header>
      <div className="assistant-messages" aria-live="polite" aria-busy={busy}>
        {messages.map((message) => <div className={`assistant-message assistant-message--${message.role}`} key={message.id}><p>{message.content}</p></div>)}
        {busy && <p className="assistant-typing">Consultando los datos de la tienda…</p>}
        <div ref={messagesEndRef} />
      </div>
      <div className="assistant-shortcuts" aria-label="Preguntas rápidas">
        {quickQuestions.map((question) => <button key={question} type="button" disabled={busy} onClick={() => sendQuestion(question)}>{question}</button>)}
      </div>
      <form className="assistant-composer" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="assistant-question">Escribí una consulta para el asistente</label>
        <textarea id="assistant-question" ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeys} maxLength={1000} placeholder="Consultá sobre ventas o inventario…" />
        <button type="submit" disabled={busy || !draft.trim()}>Enviar<Icon name="arrow" size={15} /></button>
      </form>
    </section>}
  </>;
}
