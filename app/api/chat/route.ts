import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json().catch(() => ({ prompt: '' }));
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Falta el prompt' }, { status: 400 });
    }

    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.OPENAI_PROJECT_API_KEY ||
      process.env.OPENAI_API_KEY_BROWSERLESS;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Falta OPENAI_API_KEY en .env.local' },
        { status: 500 }
      );
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente conciso para Kynetic IT. Responde en español por defecto.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      const detail = data?.error?.message || JSON.stringify(data);
      return NextResponse.json({ error: `OpenAI: ${detail}` }, { status: resp.status });
    }

    const text: string = data?.choices?.[0]?.message?.content?.trim() || '';
    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Fallo desconocido' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health-check
  return NextResponse.json({ ok: true });
}