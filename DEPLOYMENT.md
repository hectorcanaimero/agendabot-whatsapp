# Guía de Deployment con Docker

Este documento explica cómo desplegar AgendaBot usando Docker y el sistema de CI/CD automatizado.

## 🚀 CI/CD Automatizado

### Publicación Automática de Imágenes

El proyecto está configurado con GitHub Actions para construir y publicar automáticamente imágenes Docker al GitHub Container Registry (ghcr.io) cada vez que se crea un nuevo tag de versión.

#### Cómo crear un nuevo release:

```bash
# 1. Asegúrate de estar en la rama main
git checkout main
git pull origin main

# 2. Crea un nuevo tag con versión semántica
git tag -a v1.0.0 -m "Release v1.0.0: Initial production release"

# 3. Push el tag a GitHub
git push origin v1.0.0
```

Esto automáticamente:
- ✅ Construye la imagen Docker multi-arquitectura (amd64 + arm64)
- ✅ La publica en `ghcr.io/[tu-usuario]/agendabot-whatsapp`
- ✅ Crea múltiples tags: `v1.0.0`, `1.0`, `1`, `latest`
- ✅ Genera attestation de provenance para seguridad

### Convención de Tags

Usa [Semantic Versioning](https://semver.org/):

- `v1.0.0` - Release mayor (breaking changes)
- `v1.1.0` - Nueva funcionalidad (backwards compatible)
- `v1.1.1` - Bug fix (backwards compatible)

## 🐳 Deployment Local con Docker

### Opción 1: Docker Compose (Recomendado)

```bash
# 1. Copia el archivo de ejemplo de variables
cp .env.example .env.local

# 2. Edita .env.local con tus credenciales
nano .env.local

# 3. Inicia la aplicación
docker-compose up -d

# 4. Ver logs
docker-compose logs -f

# 5. Detener
docker-compose down
```

### Opción 2: Docker Run Manual

```bash
# Construir la imagen
docker build -t agendabot-whatsapp .

# Ejecutar el contenedor
docker run -d \
  --name agendabot \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  agendabot-whatsapp
```

## ☁️ Deployment en Producción

### Usar Imagen Publicada (Recomendado)

```bash
# Pull la imagen del registry
docker pull ghcr.io/[tu-usuario]/agendabot-whatsapp:latest

# Ejecutar
docker run -d \
  --name agendabot \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_key \
  -e DEEPSEEK_API_KEY=your_deepseek_key \
  -e GOOGLE_CLIENT_ID=your_google_id \
  -e GOOGLE_CLIENT_SECRET=your_google_secret \
  -e GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback \
  -e NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  --restart unless-stopped \
  ghcr.io/[tu-usuario]/agendabot-whatsapp:latest
```

### Con Docker Compose en Producción

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: ghcr.io/[tu-usuario]/agendabot-whatsapp:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Opcional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    restart: always
```

## 🔍 Health Checks

El contenedor expone un endpoint de health check:

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-01-17T...",
  "service": "agendabot-whatsapp"
}
```

## 📊 Monitoreo

### Ver logs del contenedor

```bash
# Docker
docker logs -f agendabot

# Docker Compose
docker-compose logs -f app
```

### Verificar estado

```bash
# Docker
docker ps
docker stats agendabot

# Docker Compose
docker-compose ps
```

## 🔄 Actualizar a Nueva Versión

```bash
# 1. Pull nueva imagen
docker pull ghcr.io/[tu-usuario]/agendabot-whatsapp:latest

# 2. Detener contenedor actual
docker stop agendabot
docker rm agendabot

# 3. Iniciar con nueva imagen
docker run -d \
  --name agendabot \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  ghcr.io/[tu-usuario]/agendabot-whatsapp:latest

# O con docker-compose
docker-compose pull
docker-compose up -d
```

## 🛠️ Troubleshooting

### El contenedor no inicia

```bash
# Ver logs detallados
docker logs agendabot

# Verificar variables de entorno
docker exec agendabot env
```

### Problemas de conexión a Supabase

```bash
# Verificar network
docker network inspect bridge

# Test de conexión
docker exec agendabot wget -O- https://[tu-proyecto].supabase.co
```

### Rebuild forzado

```bash
# Eliminar caché y rebuilder
docker build --no-cache -t agendabot-whatsapp .
```

## 📦 Tamaño de la Imagen

La imagen usa multi-stage build para optimización:

- **Base**: Node 20 Alpine (~200MB)
- **Final**: ~400-500MB (con todas las dependencias)

### Ver tamaño

```bash
docker images ghcr.io/[tu-usuario]/agendabot-whatsapp
```

## 🔐 Seguridad

### Mejores Prácticas Implementadas

- ✅ Usuario no-root en el contenedor
- ✅ Multi-stage build (reduce superficie de ataque)
- ✅ Health checks configurados
- ✅ Variables de entorno para secretos
- ✅ Attestation de provenance en builds

### Recomendaciones Adicionales

1. **Usa secrets management**: Considera usar Docker Secrets o variables de entorno encriptadas
2. **Network isolation**: Ejecuta en una red Docker privada
3. **Regular updates**: Mantén la imagen base actualizada
4. **Scan de vulnerabilidades**: Usa `docker scan` regularmente

```bash
docker scan ghcr.io/[tu-usuario]/agendabot-whatsapp:latest
```

## 🌐 Deployment en Cloud

### AWS ECS

```bash
# Crear task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Crear servicio
aws ecs create-service --cli-input-json file://service-definition.json
```

### Google Cloud Run

```bash
gcloud run deploy agendabot \
  --image ghcr.io/[tu-usuario]/agendabot-whatsapp:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Azure Container Instances

```bash
az container create \
  --resource-group myResourceGroup \
  --name agendabot \
  --image ghcr.io/[tu-usuario]/agendabot-whatsapp:latest \
  --dns-name-label agendabot-unique \
  --ports 3000
```

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs: `docker logs agendabot`
2. Verifica el health check: `curl http://localhost:3000/api/health`
3. Confirma variables de entorno: Revisa `.env.local`
4. Consulta GitHub Issues del proyecto

## 📝 Variables de Entorno Requeridas

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# DeepSeek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_API_URL=https://api.deepseek.com

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
