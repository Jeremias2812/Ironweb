# Ironweb

Aplicación Next.js. A continuación se incluye una guía rápida para ejecutarla de forma local con Node.js o dentro de un contenedor Docker (ideal para usar con Docker Desktop en Windows).

## Requisitos previos

- Node.js 18 o superior
- npm
- (Opcional) Docker Desktop 4.24+ para Windows, macOS o Linux

## Ejecución local con Node.js

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Ejecución con Docker

1. Asegúrate de que Docker Desktop está en ejecución.
2. Clona este repositorio y sitúate en la carpeta del proyecto.
3. Construye la imagen:

   ```bash
   docker build -t ironweb-app .
   ```

4. Inicia el contenedor en modo detached mapeando el puerto 3000:

   ```bash
   docker run -d --name ironweb -p 3000:3000 ironweb-app
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

## Comandos útiles

- `npm run build`: genera el build de producción.
- `npm run start`: sirve la aplicación en modo producción (se usa dentro del contenedor).
- `npm run lint`: ejecuta el linter.

## Solución de problemas en Windows

- Verifica que Docker Desktop tenga recursos suficientes (CPU/RAM) asignados.
- Si el puerto 3000 ya está en uso, cámbialo con `-p 8080:3000` (host:contenedor).
- Ejecuta PowerShell o la terminal como administrador si tienes problemas de permisos.

¡Listo! Ahora tu aplicación está lista para ejecutarse de forma dockerizada en Docker Desktop para Windows.
