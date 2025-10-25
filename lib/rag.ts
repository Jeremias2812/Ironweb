
import OpenAI from "openai";

// Placeholder: in producción, añade búsqueda vectorial con pgvector sobre tu BD
export async function queryRAG(question: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "Configura OPENAI_API_KEY para activar el chat.";
  const client = new OpenAI({ apiKey });
  const prompt = `Eres un asistente que responde con datos de un sistema de piezas.
// TODO: antes de llamar al modelo, recuperar contexto desde BD (pgvector).
// Por ahora, responde brevemente y pide el código de pieza si no está presente.
Pregunta: ${question}`;
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  });
  return resp.choices[0]?.message?.content ?? "Sin respuesta.";
}
