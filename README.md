# 🅿️ ParkSmart — Smart Parking Management System

A full-stack, production-ready parking management system with JWT auth, real-time slot availability, transaction-safe bookings with row-level locking, and a polished dark-mode UI.

---

## 🏗️ Architecture

```
Presentation  →  React 18 + Vite + Tailwind CSS + TanStack Query
Application   →  Node.js + Express.js (REST API)
Data          →  PostgreSQL (transactions + row-level locking)
```

---

## ✅ Prerequisites

| Tool          | Version  |
|---------------|----------|
| Node.js       | ≥ 18.x   |
| npm           | ≥ 9.x    |
| PostgreSQL    | ≥ 14.x   |

---

## 🚀 Quick Setup

### Step 1 — Clone / create project structure

```bash
mkdir smart-parking && cd smart-parking
# (Place the server/ and client/ folders here)
```

### Step 2 — Set up PostgreSQL

```bash
# Log in to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE smart_parking;
\q

# Load schema and seed data
psql -U postgres -d smart_parking -f server/schema.sql
```

### Step 3 — Configure the server

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PG_PASSWORD@localhost:5432/smart_parking
JWT_SECRET=your_super_secret_key_change_this_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### Step 4 — Install server dependencies

```bash
cd server
npm install
```

### Step 5 — Install client dependencies

```bash
cd ../client
npm install
```

---

## ▶️ Running the Project

### Terminal 1 — Start the API server

```bash
cd server
npm run dev       # uses nodemon for hot reload
# or: npm start   # production mode
```

Server runs at: **http://localhost:5000**

### Terminal 2 — Start the React client

```bash
cd client
npm run dev
```

Client runs at: **http://localhost:5173**

---

## 🔑 Demo Credentials

| Role  | Email                        | Password   |
|-------|------------------------------|------------|
| Admin | admin@parkingsystem.com      | admin123   |

> **Register** your own account at `/register` to test as a regular user.

---

## 📁 Project Structure

```
smart-parking/
├── server/
│   ├── config/              # (reserved for future config modules)
│   ├── controllers/
│   │   ├── authController.js        # Register, login, get me
│   │   ├── vehicleController.js     # CRUD vehicles
│   │   ├── parkingController.js     # Lots + slot availability
│   │   ├── reservationController.js # Book, cancel (transactions)
│   │   └── adminController.js       # Stats, lots, all reservations
│   ├── middleware/
│   │   └── auth.js          # JWT verify middleware
│   ├── routes/
│   │   ├── auth.js
│   │   ├── vehicles.js
│   │   ├── parking.js
│   │   ├── reservations.js
│   │   └── admin.js
│   ├── utils/               # (reserved for helpers)
│   ├── db.js                # pg Pool connection
│   ├── server.js            # Express app entry
│   ├── schema.sql           # Full schema + seed data
│   ├── .env.example
│   └── package.json
│
└── client/
    ├── src/
    │   ├── components/
    │   │   └── Layout.jsx           # Sidebar nav + mobile menu
    │   ├── context/
    │   │   └── AuthContext.jsx      # Auth state + JWT management
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx    # Stats + recent bookings
    │   │   ├── ParkingLotsPage.jsx  # Browse lots
    │   │   ├── LotDetailPage.jsx    # Slot grid + booking form
    │   │   ├── MyVehiclesPage.jsx   # Manage vehicles
    │   │   ├── MyReservationsPage.jsx
    │   │   └── AdminPage.jsx        # Admin dashboard
    │   ├── utils/
    │   │   └── api.js               # Axios instance + interceptors
    │   ├── App.jsx                  # Routes + protected routes
    │   ├── main.jsx                 # React + QueryClient bootstrap
    │   └── index.css                # Tailwind + custom utilities
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 🔒 Key Technical Implementations

### Double-Booking Prevention (server/controllers/reservationController.js)

```javascript
// 1. Lock the row — no other transaction can touch it
const slotResult = await client.query(
  `SELECT * FROM parking_slots WHERE slot_id = $1 FOR UPDATE`,
  [slot_id]
);

// 2. Check time overlap with existing Active reservations
const overlapResult = await client.query(
  `SELECT reservation_id FROM reservations
   WHERE slot_id = $1 AND status = 'Active'
   AND start_time < $3 AND end_time > $2`,
  [slot_id, start_time, end_time]
);

if (overlapResult.rows.length > 0) {
  await client.query('ROLLBACK');
  return res.status(409).json({ error: 'Slot already booked for this period.' });
}
```

### Real-Time Slot Availability

The slot grid re-queries with the user's selected time window, returning `booked_in_window: true` for any slot that overlaps. Slots refresh every 30 seconds automatically via TanStack Query's `refetchInterval`.

---

## 🌐 API Endpoints

### Auth
| Method | Path               | Auth | Description          |
|--------|--------------------|------|----------------------|
| POST   | /api/auth/register | —    | Register new user    |
| POST   | /api/auth/login    | —    | Login, returns JWT   |
| GET    | /api/auth/me       | ✓    | Current user profile |

### Vehicles
| Method | Path               | Auth | Description        |
|--------|--------------------|------|--------------------|
| GET    | /api/vehicles      | ✓    | My vehicles        |
| GET    | /api/vehicles/types| ✓    | Vehicle type list  |
| POST   | /api/vehicles      | ✓    | Add vehicle        |
| DELETE | /api/vehicles/:id  | ✓    | Remove vehicle     |

### Parking
| Method | Path                          | Auth | Description                    |
|--------|-------------------------------|------|--------------------------------|
| GET    | /api/parking/lots             | ✓    | All lots with availability     |
| GET    | /api/parking/lots/:id/slots   | ✓    | Slots (optionally time-filtered)|

### Reservations
| Method | Path                        | Auth | Description              |
|--------|-----------------------------|------|--------------------------|
| GET    | /api/reservations/my        | ✓    | My reservations          |
| POST   | /api/reservations           | ✓    | Create reservation       |
| PATCH  | /api/reservations/:id/cancel| ✓    | Cancel reservation       |

### Admin
| Method | Path                    | Auth | Description              |
|--------|-------------------------|------|--------------------------|
| GET    | /api/admin/stats        | ✓    | System stats             |
| GET    | /api/admin/lots         | ✓    | All lots + occupancy     |
| POST   | /api/admin/lots         | ✓    | Create new lot + slots   |
| GET    | /api/admin/reservations | ✓    | All reservations (filter)|

---

## 🎨 UI Features

- **Dark mode** professional interface
- **Visual slot grid** — green = free, red = booked, teal = selected
- **Time-window filtering** — slot availability updates for chosen period
- **Estimated cost** shown before booking confirmation
- **Responsive** — mobile sidebar with hamburger menu
- **Status badges** — Active / Completed / Cancelled with color coding
- **Toast notifications** for all actions

---

## 🛠️ Troubleshooting

**PostgreSQL connection refused**
```bash
# Check PostgreSQL is running
sudo service postgresql start    # Linux
brew services start postgresql   # macOS
```

**Port already in use**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill
```

**JWT errors**
- Ensure `JWT_SECRET` is set in `.env`
- Tokens expire after 7 days — log in again

**CORS errors**
- Vite proxy is configured in `vite.config.js` for `/api` → `:5000`
- Ensure you're using `http://localhost:5173` (not another port)
