# Usa imagen con navegadores y deps del sistema ya listos
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

WORKDIR /app

# Instala TODAS las deps para poder construir (incluye dev)
COPY package*.json ./
RUN npm ci

# Copia el código y construye
COPY . .
RUN npm run build

# Quita devDependencies para la imagen final
RUN npm prune --omit=dev

EXPOSE 3000
ENV PORT=3000 NODE_ENV=production
CMD ["npm", "start"]
