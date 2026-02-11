'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const DEMO_EMAIL = 'demo@ironweb.local';
const DEMO_PASSWORD = 'Demo123456!';

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginWithEmailPassword = async (userEmail: string, userPassword: string) => {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword,
    });

    if (!loginError) {
      router.replace('/dashboard');
      return;
    }

    throw loginError;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginWithEmailPassword(email, password);
    } catch (loginError: any) {
      setError(loginError?.message ?? 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const createAndLoginDemoUser = async () => {
    setError(null);
    setLoading(true);

    try {
      await loginWithEmailPassword(DEMO_EMAIL, DEMO_PASSWORD);
      return;
    } catch {
      // si no existe, intentamos crearlo
    }

    const signUp = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
      },
    });

    if (signUp.error) {
      setError(`No se pudo crear usuario demo: ${signUp.error.message}`);
      setLoading(false);
      return;
    }

    const signIn = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (signIn.error) {
      setError(
        `Usuario demo creado. Si tu proyecto exige confirmación de email, confirma el correo y luego ingresa con ${DEMO_EMAIL}`,
      );
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto card space-y-4">
      <h1 className="text-2xl font-bold">Ingreso</h1>
      <p className="text-sm text-white/70">Usa tu email y contraseña de Supabase Auth.</p>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@empresa.com"
          type="email"
          required
        />
        <input
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña"
          type="password"
          required
        />
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Procesando...' : 'Entrar'}</button>
      </form>

      <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="text-sm text-white/70">¿No tienes usuario? Crea e ingresa con un usuario demo:</p>
        <button className="btn" type="button" disabled={loading} onClick={createAndLoginDemoUser}>
          {loading ? 'Procesando...' : 'Crear / usar usuario demo'}
        </button>
        <p className="text-xs text-white/60">Demo: <strong>{DEMO_EMAIL}</strong> / <strong>{DEMO_PASSWORD}</strong></p>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
