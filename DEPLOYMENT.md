# V-Face Dashboard & Playground Integration Guide

This guide explains how to properly configure and deploy the V-Face Dashboard and Playground to work with the Server and Matching Service.

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  Browser (Dashboard/Playground)         │
│  - Face capture via webcam             │
│  - SDK: fingerprinting + embedding     │
└──────────────┬──────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────┐
│  Node.js Server (Port 3000)             │
│  - Registry API endpoints               │
│  - Authentication (JWT)                 │
│  - Hash chain (tamper-evident log)      │
│  - Consent management                   │
│  - Calls matching service               │
└──────────────┬──────────────────────────┘
               │ HTTPS (internal)
               ▼
┌─────────────────────────────────────────┐
│  Python Matching Service (Port 8001)    │
│  - Qdrant vector database               │
│  - Encrypted embedding handling         │
│  - Similarity search                    │
│  - Sybil detection                      │
└─────────────────────────────────────────┘
```

## Environment Configuration

### Dashboard Configuration

Create a `.env.local` file in the dashboard directory:

```bash
cd dashboard
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Production
VITE_REGISTRY_URL=https://api.your-domain.com

# Development
VITE_REGISTRY_URL=http://localhost:3000

# Model path (served by your server or CDN)
VITE_MODEL_PATH=/model/mobilefacenet.onnx

# Optional: Error tracking
VITE_SENTRY_DSN=https://your-sentry-key@sentry.io/your-project
```

### Playground Configuration

Create a `.env.local` file in the playground directory:

```bash
cd playground
cp .env.example .env.local
```

Edit `.env.local` (same as dashboard):

```env
VITE_REGISTRY_URL=http://localhost:3000
VITE_MODEL_PATH=/model/mobilefacenet.onnx
```

### Server Configuration

Set environment variables on the server:

```bash
# Required
PORT=3000
DATABASE_URL=sqlite:///registry.db

# For CORS with deployed frontends
DASHBOARD_URL=https://dashboard.your-domain.com
PLAYGROUND_URL=https://playground.your-domain.com

# Matching service connection
MATCHING_SERVICE_URL=http://matching-service:8001
MATCHING_SECRET=your-shared-secret-change-me

# JWT signing (auto-generated if not provided)
# SSH_PRIVATE_KEY=...
# SSH_PUBLIC_KEY=...
```

### Matching Service Configuration

Set environment variables:

```bash
# Qdrant database URL
QDRANT_URL=https://0d2d3a35-8794-4ecd-87ca-0b512ca13692.us-east-1-1.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=your-qdrant-api-key

# Server coordination
MATCHING_SECRET=your-shared-secret-change-me
SIMILARITY_THRESHOLD=0.85

# Worker management (for cloud platforms)
WEB_CONCURRENCY=1  # Render, Heroku, Cloud Run set this automatically
```

## Local Development Setup

### 1. Start the Matching Service

```bash
cd matching

# Install dependencies
pip install -r requirements.txt

# Run locally
QDRANT_URL=http://localhost:6334 \
MATCHING_SECRET=dev-secret-change-me \
python main.py
```

Or use Docker:

```bash
docker run -d \
  -p 6333:6333 \
  -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant:latest

docker build -t vface-matching .
docker run -d \
  -p 8001:8001 \
  -e QDRANT_URL=http://host.docker.internal:6333 \
  -e MATCHING_SECRET=dev-secret-change-me \
  vface-matching
```

### 2. Start the Server

```bash
cd server

# Install dependencies
npm install

# Start in development
PORT=3000 \
MATCHING_SERVICE_URL=http://localhost:8001 \
MATCHING_SECRET=dev-secret-change-me \
npm run dev
```

### 3. Start the Dashboard

```bash
cd dashboard

# Install dependencies
npm install

# Create .env.local
echo "VITE_REGISTRY_URL=http://localhost:3000" > .env.local

# Start dev server (typically on port 5173)
npm run dev
```

### 4. Start the Playground

```bash
cd playground

# Install dependencies
npm install

# Create .env.local
echo "VITE_REGISTRY_URL=http://localhost:3000" > .env.local

# Start dev server (typically on port 5174)
npm run dev
```

Visit:
- Dashboard: http://localhost:5173
- Playground: http://localhost:5174
- Server health: http://localhost:3000
- Matching health: http://localhost:8001/health

## Production Deployment

### Using Render.com (Recommended)

#### 1. Deploy Qdrant (Cloud)

Use Qdrant Cloud: https://cloud.qdrant.io

Get your `QDRANT_URL` and `QDRANT_API_KEY`.

#### 2. Deploy Matching Service

Create `render.yaml` in the matching directory:

```yaml
services:
  - type: web
    name: vface-matching
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: QDRANT_URL
        value: https://your-qdrant-cloud-url:6333
      - key: QDRANT_API_KEY
        scope: secret
      - key: MATCHING_SECRET
        scope: secret
```

#### 3. Deploy Server

```bash
cd server
# Push to Render
render deploy
```

Environment on Render:
```
MATCHING_SERVICE_URL=https://vface-matching.onrender.com
MATCHING_SECRET=[SECRET]
DASHBOARD_URL=https://vface-dashboard.onrender.com
PLAYGROUND_URL=https://vface-playground.onrender.com
```

#### 4. Deploy Dashboard

Environment on Render:
```
VITE_REGISTRY_URL=https://vface-server.onrender.com
VITE_MODEL_PATH=/model/mobilefacenet.onnx
```

#### 5. Deploy Playground

Same as Dashboard:
```
VITE_REGISTRY_URL=https://vface-server.onrender.com
VITE_MODEL_PATH=/model/mobilefacenet.onnx
```

### Common Deployment Platforms

#### Vercel (Frontend Only)

```bash
# Dashboard
cd dashboard
vercel env add VITE_REGISTRY_URL https://your-server.com
vercel deploy

# Playground
cd playground
vercel env add VITE_REGISTRY_URL https://your-server.com
vercel deploy
```

#### AWS ECS

Create task definitions with environment variables pointing to your server and matching service.

#### Docker Compose (Local/Self-hosted)

```yaml
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_storage:/qdrant/storage

  matching:
    build: ./matching
    ports:
      - "8001:8001"
    environment:
      QDRANT_URL: http://qdrant:6333
      MATCHING_SECRET: dev-secret-change-me
    depends_on:
      - qdrant

  server:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      MATCHING_SERVICE_URL: http://matching:8001
      MATCHING_SECRET: dev-secret-change-me
      DASHBOARD_URL: http://localhost:5173
      PLAYGROUND_URL: http://localhost:5174

volumes:
  qdrant_storage:
```

Run with:
```bash
docker-compose up
```

## Troubleshooting

### CORS Errors

Check server's CORS configuration in `server/index.js`:

```javascript
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.DASHBOARD_URL,
    process.env.PLAYGROUND_URL,
].filter(Boolean);
```

Make sure `DASHBOARD_URL` and `PLAYGROUND_URL` match your actual URLs.

### Matching Service Connection Refused

Check:
1. Matching service is running: `curl http://localhost:8001/health`
2. `MATCHING_SERVICE_URL` on server matches the matching service URL
3. `MATCHING_SECRET` is the same on both server and matching service

### MetaMask Connection Issues

- Ensure you're using a compatible network (Polygon, Mumbai, Localhost)
- Check browser console for detailed errors
- For localhost development, configure MetaMask to use `http://127.0.0.1:8545` (Hardhat)

### Embedding Model Not Found

- Ensure the model is served at `{VITE_REGISTRY_URL}{VITE_MODEL_PATH}`
- Model file should be at: `server/public/model/mobilefacenet.onnx`
- Serve the public directory in production: `express.static('public')`

### Qdrant Collection Issues

The matching service auto-creates the `vface_embeddings` collection on startup.

If you need to reset:
```bash
curl -X DELETE \
  -H "api-key: your-qdrant-api-key" \
  https://your-qdrant-url:6333/collections/vface_embeddings
```

## Performance Tuning

### Matching Service Workers

For cloud platforms like Render:
- Docker will auto-detect available CPUs
- WEB_CONCURRENCY is set automatically
- No manual configuration needed

For multi-core servers:
```bash
WEB_CONCURRENCY=4 uvicorn main:app --host 0.0.0.0 --port 8001
```

### Qdrant Optimization

```python
# In matching/qdrant_store.py
ensure_collection(
    qdrant,
    vector_size=128,
    distance="Cosine",
    # Use hnsw for better performance at scale
    index=HnswConfig(m=16, ef_construct=200)
)
```

## Security Checklist

- [ ] MATCHING_SECRET is unique and strong (min 32 chars)
- [ ] QDRANT_API_KEY is stored as a secret, not in code
- [ ] CORS origins are restricted to your domains
- [ ] HTTPS enabled in production
- [ ] Rate limiting enabled on server
- [ ] Database credentials in environment variables
- [ ] JWT signing keys rotated regularly
- [ ] Model file CORS headers configured

## API Health Checks

Test your deployment:

```bash
# Server health
curl https://your-server.com/

# Matching service health
curl -H "X-Matching-Secret: your-secret" \
  https://your-matching-service.com/health

# Try registration
curl -X POST https://your-server.com/register \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprint": "deadbeef...",
    "public_key": "0x123...",
    "metadata": {"source": "test"}
  }'
```

## Next Steps

1. Review the [SDK Documentation](../sdk/README.md)
2. Read the [Server API Reference](../server/README.md)
3. Check the [Matching Service Spec](../matching/README.md)
4. Set up error monitoring with Sentry or similar
5. Configure CDN for model file delivery
