'use client';
import { useState } from 'react';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setError(null);
    const q = input.trim();
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Sin respuesta');

      setMessages((m) => [...m, { role: 'assistant', content: data.text || '(vacío)' }]);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Chat IA</h1>

      <div className="border rounded-lg p-4 space-y-3 bg-[#121417] border-[#2a2f36]">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400">Escribe una pregunta para empezar.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm whitespace-pre-wrap ${
              m.role === 'user' ? 'text-gray-200' : 'text-gray-100'
            }`}
          >
            <span className="opacity-60 mr-2">{m.role === 'user' ? 'Tú:' : 'IA:'}</span>
            {m.content}
          </div>
        ))}
        {error && <div className="text-red-400 text-sm">{error}</div>}
      </div>

      <form onSubmit={ask} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregúntame algo sobre tus órdenes, piezas o informes…"
          className="flex-1 rounded-md px-3 py-2 bg-[#0e1114] border border-[#2a2f36] text-gray-100 outline-none"
        />
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-blue-600 disabled:opacity-60">
          {loading ? 'Enviando…' : 'Enviar'}
        </button>
      </form>

      <div className="text-xs text-gray-500">
        Consejo: prueba con «¿Qué órdenes de trabajo tengo en curso?» o «Ayúdame a redactar un informe de UT».
      </div>
    </div>
  );
}