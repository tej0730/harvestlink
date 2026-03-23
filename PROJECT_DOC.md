# HarvestLink Project Documentation

**HarvestLink** is a direct-to-consumer platform connecting local farmers (growers) directly with buyers to minimize food waste, ensure fair prices, and supply fresh local produce. 

## 🛠️ Tech Stack
*   **Frontend**: React (Vite), Tailwind CSS, React Router, Zustand (State Management), React Query (Data Fetching), Leaflet (Maps)
*   **Backend**: Node.js, Express.js, Prisma (ORM), PostgreSQL (Database)
*   **Authentication**: JWT, Google OAuth (Passport.js)
*   **Uploads & Media**: Multer, Cloudinary
*   **Task Scheduling**: Node-cron

---

## 📅 Development Progress Log

### Phase 1 (Week 1): Authentication & Foundation ✅
*   **Database Schema setup** with Prisma (Users, Farms, Listings, Buyer Requests, Orders).
*   **User Registration & Login**: Registration handles separate roles (Growers vs Buyers). Growers get an associated Farm profile created simultaneously.
*   **Google OAuth**: Configured Passport.js with Google Auth.
*   **Role-Based Access Control**: Route protection with JWT (Access & Refresh tokens). Middleware to require 'grower' or 'buyer' roles.

### Phase 2 (Week 2): Produce Listings & Cloudinary Integration ✅
*   **Cloudinary Integration**: Multer backend middleware for uploading multiple listing photos (up to 5 per listing).
*   **Listings CRUD (Growers)**: Growers can create, update, and deactivate listings. Audit logs capture creations and updates.
*   **Freshness Score Algorithm**: Backend implements Haversine calculations to determine the distance between a buyer and the farm, scaling a freshness score based on harvest date and distance.
*   **Explore & Create Interface (Frontend)**: Explore UI with filters, sorting, and freshness badges. Form for creating listings with image upload previews.
*   **Reservation System Cron**: A 5-minute cron job to auto-release expired reserved stock back to active inventory.

### Phase 3 (Week 3): Geospatial Search, Maps & Request Board ✅
*   **Leaflet Map View**: Frontend map displaying active listings using `react-leaflet`, custom green markers, popups with image/freshness data.
*   **Geospatial Radius Queries (Haversine)**: Added raw SQL query in Prisma to fetch listings within an X kilometer radius from the buyer's lat/lng, sorted by closest distance.
*   **Interactive ExplorePage Refactor**: Map/Grid toggle view, categories filter, radius filter, and organic toggles all feeding into the nearby API.
*   **Buyer Request Board**: Buyers can post requests for specific crops (e.g., "looking for fresh spinach").
*   **Area Notifications**: When a request is created, it triggers notifications to growers whose farm falls within the buyer's search radius.
*   **Demand Data Aggregation**: Weekly background cron job runs every Sunday to aggregate what crops are highly requested in specific areas for future heatmap displays.

---
_Last Updated: March 2026_
