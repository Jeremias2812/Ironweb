# Ironweb

Aplicación Next.js. A continuación se incluye una guía rápida para ejecutarla de forma local con Node.js o dentro de un contenedor Docker (ideal para usar con Docker Desktop en Windows).

## Requisitos previos

- Node.js 18 o superior
- npm
- (Opcional) Docker Desktop 4.24+ para Windows, macOS o Linux

## Ejecución local con Node.js

1. Duplica el archivo de ejemplo y añade tus claves:

   ```bash
   cp .env.example .env
   ```

   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son obligatorios para que el cliente de Supabase funcione.
   - `SUPABASE_SERVICE_ROLE_KEY` es opcional pero necesario si vas a generar PDFs o modificar datos desde las rutas de la API.
   - Las claves de OpenAI sólo se requieren para las funcionalidades que dependan de ese servicio.

2. Instala las dependencias y arranca el entorno de desarrollo:

   ```bash
   npm install
   npm run dev
   ```

3. Abre `http://localhost:3000` en tu navegador. El servidor se recargará automáticamente cuando hagas cambios.

## Ejecución con Docker

1. Asegúrate de que Docker Desktop está en ejecución.
2. Clona este repositorio y sitúate en la carpeta del proyecto.
3. Construye la imagen, pasando tus claves de Supabase como argumentos si deseas
   usarlas durante el build. Si omites los argumentos se aplicarán valores de
   ejemplo seguros (necesarios únicamente para que `next build` no falle):

   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_SUPABASE_URL="https://TU-PROYECTO.supabase.co" \
     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key" \
     -t ironweb-app .
   ```

4. Inicia el contenedor en modo detached mapeando el puerto 3000. No olvides
   propagar las mismas variables (más cualquier otra sensible como
   `SUPABASE_SERVICE_ROLE_KEY`) en tiempo de ejecución mediante `-e` o un
   archivo `.env`:

   ```bash
   docker run -d --name ironweb \
     -e NEXT_PUBLIC_SUPABASE_URL="https://TU-PROYECTO.supabase.co" \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key" \
     -e SUPABASE_SERVICE_ROLE_KEY="tu-service-role" \
     -p 3000:3000 ironweb-app
   ```

5. Abre `http://localhost:3000` en tu navegador.

Para detener el contenedor:

```bash
docker stop ironweb
```

Y para eliminarlo:

```bash
docker rm ironweb
```

## Variables de entorno

Si tu aplicación necesita variables de entorno, crea un archivo `.env` en la raíz del proyecto y define allí tus claves. Para Docker, puedes pasarlas con la opción `--env-file`:

```bash
docker run -d --name ironweb --env-file .env -p 3000:3000 ironweb-app
```

Los valores definidos durante el `docker build` se copian al contenedor final
como comodines. Aun así, debes reemplazarlos por tus credenciales reales al
arrancar el contenedor (o en tu `docker-compose.yml`) para que la aplicación
pueda conectarse a Supabase y a los servicios opcionales.

## Comandos útiles

- `npm run build`: genera el build de producción.
- `npm run start`: sirve la aplicación en modo producción (se usa dentro del contenedor).
- `npm run lint`: ejecuta el linter.

## Solución de problemas en Windows

- Verifica que Docker Desktop tenga recursos suficientes (CPU/RAM) asignados.
- Si el puerto 3000 ya está en uso, cámbialo con `-p 8080:3000` (host:contenedor).
- Ejecuta PowerShell o la terminal como administrador si tienes problemas de permisos.

¡Listo! Ahora tu aplicación está lista para ejecutarse de forma dockerizada en Docker Desktop para Windows.
