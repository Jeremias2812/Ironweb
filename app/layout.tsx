import "./globals.css";
import SupabaseSession from "@/components/SupabaseSession";
import TopBar from "@/components/TopBar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kynetic IT",
  description: "MVP web para gestión de piezas, servicios y despachos",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
        )}
        <div className="container py-6">
          <SupabaseSession />
          <TopBar />
          {children}
        </div>
      </body>
    </html>
  );
}