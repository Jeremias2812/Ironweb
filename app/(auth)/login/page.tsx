'use client';
import { createClient } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard');
      else setChecking(false);
    });
  }, [supabase, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined }
    });
    if (error) setMessage(error.message);
    else setMessage('Revisa tu email para continuar.');
  };

  if (checking) return <div className="card">Comprobando sesión…</div>;

  return (
    <div className="max-w-md mx-auto card space-y-4">
      <h2 className="text-xl font-semibold">Acceso</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="input"
          placeholder="tu@email.com"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          type="email"
          required
        />
        <button className="btn" type="submit">Enviar Magic Link</button>
      </form>
      {message && <p className="text-sm text-white/70">{message}</p>}
      <p className="text-xs text-white/50">Si ya tienes sesión iniciada, te redirigiremos automáticamente al Dashboard.</p>
    </div>
  );
}