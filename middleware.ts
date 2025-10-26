// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Parche temporal: no usamos @supabase/auth-helpers-nextjs en build
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

// Si ya tenías matcher, mantenlo.
export const config = {
  matcher: [
    // añade aquí las rutas que quieras interceptar en el futuro
    // '/dashboard/:path*',
    // '/work-orders/:path*',
  ],
};
