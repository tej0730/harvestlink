# 🌿 HarvestLink

> Connect your garden to your neighbour's table.

**HarvestLink** is a peer-to-peer hyperlocal marketplace that connects home gardeners and small organic growers with local buyers who want fresh, seasonal, chemical-free produce.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (Neon.tech) |
| ORM | Prisma |
| Real-time | Socket.IO |
| Maps | Leaflet.js + OpenStreetMap |
| Auth | Passport.js + JWT |
| File Storage | Cloudinary |
| Deployment | Vercel (frontend) + Render (backend) |

## Getting Started

### Prerequisites

- Node.js v18+
- npm v9+
- Git
- A Neon.tech PostgreSQL database

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your actual credentials
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

## Project Structure

```
harvestlink/
  ├── backend/          ← Node.js + Express + Prisma
  │     ├── src/
  │     ├── prisma/
  │     └── package.json
  ├── frontend/         ← React + Vite + Tailwind
  │     ├── src/
  │     └── package.json
  ├── .gitignore
  └── README.md
```

## License

This project is part of a Final Year Project.
