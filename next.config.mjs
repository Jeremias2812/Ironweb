// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No uses: output: 'export'
  // Si usas imágenes remotas y no quieres optimización en server:
  // images: { unoptimized: true },
};

export default nextConfig;