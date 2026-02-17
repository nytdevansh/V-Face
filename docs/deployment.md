# V-Face Deployment Guide

## Architecture Recap

```
Internet → Node.js API (:3000) → Python Matching (:8001) → Qdrant (:6333)
               public                 internal only          internal only
```

---

## Option 1: Render + Railway (Recommended for MVP)

The simplest path — each service on a managed platform, no DevOps needed.

### 1. Qdrant Cloud (Vector DB)

Go to [cloud.qdrant.io](https://cloud.qdrant.io):
- Create a free-tier cluster (1GB, enough for ~200K vectors)
- Note your **URL** (e.g. `https://abc123.us-east4-0.gcp.cloud.qdrant.io:6333`)
- Note your **API key**

### 2. Matching Service → Railway

[Railway](https://railway.app) supports Dockerfiles natively.

```bash
# Install Railway CLI
npm i -g @railway/cli
railway login

# Deploy matching service
cd matching
railway init
railway up
```

Set environment variables in Railway dashboard:
```
QDRANT_URL=https://your-qdrant-cloud-url:6333
QDRANT_API_KEY=your-qdrant-api-key
VFACE_ENCRYPTION_KEY=<your 64-char hex key>
MATCHING_SECRET=<generate a strong secret>
COLLECTION_NAME=vface_embeddings
VECTOR_DIM=128
```

Note the Railway URL (e.g. `https://matching-production-abc123.up.railway.app`).

### 3. API Service → Render

[Render](https://render.com) supports Dockerfiles.

1. Push to GitHub
2. Connect repo in Render → "New Web Service"
3. Set root directory to `server/`
4. Set environment variables:
```
PORT=3000
VFACE_ENCRYPTION_KEY=<same key as matching service>
MATCHING_SERVICE_URL=https://matching-production-abc123.up.railway.app
MATCHING_SECRET=<same secret as matching service>
DATABASE_PATH=/app/data/registry.db
```
5. Add a persistent disk mounted at `/app/data` (for SQLite + hash chain)

---

## Option 2: Single VPS with Docker Compose

Best for cost and simplicity if you're comfortable with Linux.

### 1. Provision a VPS

- **DigitalOcean**: $12/mo (2GB RAM, 1 vCPU) — enough for 1M vectors
- **Hetzner**: €4.5/mo (4GB RAM) — best value
- **AWS Lightsail**: $10/mo (2GB RAM)

For 10M vectors (~20GB with HNSW index), you'll need **32GB RAM**.

### 2. Setup

```bash
# SSH into your VPS
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone and deploy
git clone https://github.com/your-user/V-face.git
cd V-face

# Generate production .env
cat > .env << 'EOF'
VFACE_ENCRYPTION_KEY=$(openssl rand -hex 32)
MATCHING_SECRET=$(openssl rand -hex 32)
EOF

# Start
docker compose up -d

# Verify
curl http://localhost:3000/
```

### 3. Add HTTPS with Caddy

```bash
# Install Caddy
apt install -y caddy

# Configure reverse proxy
cat > /etc/caddy/Caddyfile << 'EOF'
api.vface.io {
    reverse_proxy localhost:3000
}
EOF

systemctl restart caddy
```

### 4. Firewall

```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP (Caddy redirect)
ufw allow 443   # HTTPS
ufw enable
# Do NOT expose 6333 or 8001 — internal only
```

---

## Option 3: Kubernetes (10M+ Production)

For serious scale. Use managed K8s (GKE, EKS, AKS).

### Services

| Service | Replicas | Resources |
|---------|----------|-----------|
| API (Node.js) | 3-5 | 512MB / 0.5 CPU |
| Matching (Python) | 2-3 | 1GB / 1 CPU |
| Qdrant | 1 (or sharded) | 32GB / 4 CPU |

### Key Considerations

- **Qdrant**: Use [Qdrant Cloud](https://cloud.qdrant.io) managed, or self-host with persistent volume claims
- **API**: Stateless except SQLite — switch to PostgreSQL for multi-replica
- **Matching**: Stateless, horizontally scalable
- **Secrets**: Use K8s secrets or external secret manager (Vault, AWS Secrets Manager)

---

## Environment Variables Reference

| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `VFACE_ENCRYPTION_KEY` | API + Matching | ✅ | 64-char hex AES-256 key |
| `MATCHING_SECRET` | API + Matching | ✅ | Shared auth secret |
| `MATCHING_SERVICE_URL` | API | ✅ | URL to matching service |
| `QDRANT_URL` | Matching | ✅ | URL to Qdrant |
| `PORT` | API | ❌ | Default: 3000 |
| `COLLECTION_NAME` | Matching | ❌ | Default: vface_embeddings |
| `VECTOR_DIM` | Matching | ❌ | Default: 128 |

---

## Security Checklist

- [ ] Generate unique `VFACE_ENCRYPTION_KEY` (never reuse dev key)
- [ ] Generate unique `MATCHING_SECRET`
- [ ] Persist server signing key (currently regenerated on restart)
- [ ] Matching service and Qdrant are NOT publicly accessible
- [ ] HTTPS enabled (TLS termination via Caddy/nginx/cloud LB)
- [ ] Rate limiting configured appropriately
- [ ] Backup strategy for SQLite DB and Qdrant snapshots
- [ ] Monitor disk usage (Qdrant HNSW index grows with data)

---

## Cost Estimates

| Scale | Qdrant RAM | VPS Cost | Managed Cost |
|-------|-----------|----------|--------------|
| 100K users | ~500MB | $6/mo | Free tier |
| 1M users | ~2GB | $12/mo | ~$25/mo |
| 10M users | ~20GB | $80/mo | ~$200/mo |
| 100M users | ~200GB | Sharded | Custom pricing |
