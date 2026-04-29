# BrandOS — Content & Ads Operating System

> AI-powered Content Strategy and Ads Optimization platform for JLC Group brands.

**Domain:** `brandos.jlcgroup.co`  
**Port:** `40200` (Marketing & Ads domain: 4xxxx)  
**Stack:** React 19 + TypeScript + tRPC + Express + PostgreSQL  
**PM2 Name:** `brandos`

---

## Brands Supported

| Brand | Vertical |
|---|---|
| JULA'S HERB | Skincare / Personal Care |
| J-DENT | Oral Care |
| JARVIT | Supplement |
| JNIS | Skincare |
| BEAUTERRY | Color Cosmetics |

---

## Features

1. **Dashboard** — KPI overview: content planned, published, ROAS, spend, revenue
2. **Brand Brain** — Brand rules, tone of voice, content ratio per brand
3. **SKU Content Map** — Product list with content matrix per SKU
4. **Content Calendar** — Weekly/monthly planning + AI auto-generate
5. **Anti-Annoy Detection** — Content ratio check, duplicate hook detection
6. **Performance Analysis** — TikTok Ads data + AI insights
7. **AI Content Generator** — Hook, caption, cover concept generation
8. **Content History** — Track past content, prevent duplication
9. **Performance Import** — CSV upload or manual input from TikTok Ads
10. **Ads Recommendation** — AI recommends Scale / Stop / Test variation

---

## Setup on D:\Server

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (running on 192.168.0.41)
- pnpm (`npm install -g pnpm`)

### 1. Clone & Install

```powershell
cd D:\Server\apps
git clone https://github.com/jlc-group/brandos
cd brandos
pnpm install
```

### 2. Database Setup

```sql
-- Run on PostgreSQL (192.168.0.41)
CREATE DATABASE brandos_db;
CREATE USER brandos_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE brandos_db TO brandos_user;
```

### 3. Environment Setup

```powershell
# Copy env template
Copy-Item .env.example D:\Server\run\brandos\.env

# Edit D:\Server\run\brandos\.env with your values:
# DATABASE_URL=postgresql://brandos_user:your_password@192.168.0.41:5432/brandos_db
# JWT_SECRET=your-secret-key
# OPENAI_API_KEY=sk-...
```

### 4. Run Database Migration

```powershell
cd D:\Server\apps\brandos
# Link env file
Copy-Item D:\Server\run\brandos\.env .env
pnpm db:push
```

### 5. Build & Deploy

```powershell
cd D:\Server
.\scripts\deploy.ps1 -App brandos
```

### 6. Nginx Config

The nginx config is at:
```
D:\Server\nginx\conf\sites-enabled\brandos.jlcgroup.co.conf
```

Add DNS entry: `brandos.jlcgroup.co` → `192.168.0.41`

---

## Development

```powershell
cd D:\Server\apps\brandos
Copy-Item D:\Server\run\brandos\.env .env
pnpm dev
# Opens at http://localhost:40200
```

---

## Port Registry

| Service | Port | Domain |
|---|---|---|
| BrandOS (unified) | 40200 | brandos.jlcgroup.co |

> Port 40200 follows the Marketing & Ads domain (4xxxx) in D:\Server port scheme.

---

## Architecture

```
D:\Server\
├── apps\brandos\          ← Source code (this repo)
├── deploy\brandos\        ← Production build (auto-generated)
├── run\brandos\.env       ← Environment variables
└── logs\brandos\          ← PM2 logs
```

---

*BrandOS v1.0 | JLC Group | Port Scheme: 4xxxx Marketing & Ads*
