'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      return;
    }

    router.replace('/dashboard');
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
        <button className="btn" type="submit">Entrar</button>
      </form>

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
