# Taj Banquet Hall – Booking Management System

A full-stack web application prototype and relational database management system designed for **Taj Banquet Hall**, supporting customer management, event packages, hall scheduling, add-on services, multi-installment payments, and financial analytics.

---

## 🌐 Live Prototype & Repository

- **Live Web Prototype (GitHub Pages):**  
  [https://abishek0109.github.io/Taj-Banquet-Hall-Booking-Management-System/](https://abishek0109.github.io/Taj-Banquet-Hall-Booking-Management-System/)
- **GitHub Repository:**  
  [https://github.com/abishek0109/Taj-Banquet-Hall-Booking-Management-System](https://github.com/abishek0109/Taj-Banquet-Hall-Booking-Management-System)

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, Vite 5, React Router (HashRouter) | Hospitality UI design system (Dark navy sidebar, warm ivory canvas, muted gold accents), Lucide icons, Recharts |
| **Backend** | Python 3.11, Flask 3.1.3, Flask-CORS | REST API with parameterized queries, validation filters, and transaction management |
| **Prototype Database** | SQLite 3 | Persistent relational database storing customer, booking, package, service, and payment records |
| **Oracle Specification** | Oracle SQL & PL/SQL | Complete Oracle DDL, views, triggers, functions, procedures, and cursors preserved in `docs/ORACLE_SCHEMA.sql` |
| **Cloud Deployment** | GitHub Actions & GitHub Pages | Automated CI/CD pipeline deploying static frontend with built-in client-side data mirror |

---

## 🗄️ Relational Database Schema (3NF)

The system consists of 7 normalized relational tables in Third Normal Form (3NF):

1. **`CUSTOMER`**: `customer_id` (PK), `full_name`, `phone` (UNIQUE), `email` (UNIQUE)
2. **`EVENT_TYPE`**: `event_type_id` (PK), `event_name` (UNIQUE)
3. **`HALL_PACKAGE`**: `package_id` (PK), `package_name` (UNIQUE), `base_price` (>= 0), `capacity` (> 0)
4. **`SERVICE`**: `service_id` (PK), `service_name` (UNIQUE), `unit_price` (>= 0)
5. **`BOOKING`**: `booking_id` (PK), `customer_id` (FK), `event_type_id` (FK), `package_id` (FK), `start_at`, `end_at`, `guest_count` (> 0), `status` ('PENDING', 'CONFIRMED', 'CANCELLED'), `notes`, `CHECK(end_at > start_at)`
6. **`BOOKING_SERVICE`**: `booking_id` (PK/FK), `service_id` (PK/FK), `quantity` (> 0), `unit_price` (>= 0)
7. **`PAYMENT`**: `payment_id` (PK), `booking_id` (FK), `payment_date`, `amount` (> 0), `payment_method` ('UPI', 'CASH', 'CARD', 'NEFT', 'CHEQUE'), `reference_no` (UNIQUE)

---

## 🛡️ Business Rules Enforced

- **Time Order Integrity**: `end_at` must always be strictly later than `start_at`.
- **Hall Capacity Enforcement**: Guest count cannot exceed the chosen hall package capacity.
- **Double-Booking Overlap Prevention**: Active bookings (`PENDING` or `CONFIRMED`) block any overlapping booking intervals for the banquet hall.
- **Cancelled Slot Recycling**: `CANCELLED` bookings release the time slot immediately for re-booking.
- **Referential & Constraint Integrity**: Primary keys, foreign key references, positive integer constraints, unique emails/phones/transaction reference numbers.
- **Financial Balances**: Live balance calculations subtracting sum of recorded payments from base package + selected add-on services.

---

## 📂 Project Directory Structure

```text
Taj_Banquet_Hall_Database_Project/
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions CI/CD workflow for Pages
├── backend/
│   ├── app.py                     # Flask REST API endpoints and business logic
│   ├── db.py                      # Database schema initialization and seed data
│   ├── requirements.txt           # Python dependencies (flask, flask-cors, python-dotenv)
│   └── .env.example               # Backend configuration template
├── database/
│   └── taj_banquet.db             # Persistent SQLite database (local environment)
├── docs/
│   ├── DEMO_GUIDE.md              # 5-minute faculty presentation and test sequence
│   └── ORACLE_SCHEMA.sql          # Oracle SQL DDL, PL/SQL trigger, procedure, cursor, functions
├── frontend/
│   ├── index.html                 # Web application entry point
│   ├── package.json               # Frontend dependencies and build scripts
│   ├── vite.config.js             # Vite configuration with proxy and base path
│   └── src/
│       ├── main.jsx               # Application mount
│       ├── App.jsx                # Layout, sidebar, and routing
│       ├── index.css              # Custom hospitality styling system
│       ├── api/
│       │   ├── client.js          # API client (auto-switches to local DB or cloud mirror)
│       │   └── initialData.json   # Exported seed dataset for static deployment
│       └── pages/
│           ├── Dashboard.jsx      # KPI statistics, revenue trend chart, upcoming bookings
│           ├── Customers.jsx      # Customer directory, real-time search, add/edit/delete
│           ├── Bookings.jsx       # Booking calendar, status filters, conflict prevention
│           ├── Packages.jsx       # Hall packages, capacity limits, price tiers
│           ├── AddOnServices.jsx  # Optional service items and pricing
│           ├── Payments.jsx       # Transaction history, method filters, running totals
│           └── Reports.jsx        # Revenue analytics, outstanding balances, daily schedule
├── Taj_Banquet_Hall_Database_Project.pdf  # Project design specification PDF
├── README.md                      # Comprehensive project documentation
└── .gitignore                     # Git ignore rules
```

---

## 🚀 Local Setup & Installation

### Prerequisites
- **Python 3.9+** and `pip`
- **Node.js 18+** and `npm`

### 1. Clone the Repository
```bash
git clone https://github.com/abishek0109/Taj-Banquet-Hall-Booking-Management-System.git
cd Taj-Banquet-Hall-Booking-Management-System
```

### 2. Start the Backend API
```bash
cd backend
pip install -r requirements.txt
py -3 app.py
```
*The database (`database/taj_banquet.db`) initializes automatically with all 7 tables and demonstration seed records on first launch. The API will be active at `http://localhost:5000`.*

### 3. Start the Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev -- --port 3000
```
Open **`http://localhost:3000`** in your browser.

---

## 📡 REST API Specification

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | API health status and route index |
| `/api/dashboard` | `GET` | Aggregated statistics (total customers, bookings, revenue, monthly revenue, upcoming) |
| `/api/customers` | `GET`, `POST` | List/search customers or register a new customer |
| `/api/customers/<id>` | `GET`, `PUT`, `DELETE` | Retrieve, update, or remove a customer record |
| `/api/packages` | `GET`, `POST` | List hall packages or create a package |
| `/api/packages/<id>` | `GET`, `PUT`, `DELETE` | Retrieve, update, or remove a hall package |
| `/api/services` | `GET`, `POST` | List add-on services or create a service |
| `/api/services/<id>` | `GET`, `PUT`, `DELETE` | Retrieve, update, or remove an add-on service |
| `/api/bookings` | `GET`, `POST` | List/filter bookings or create booking with validation checks |
| `/api/bookings/<id>` | `GET`, `PUT`, `DELETE` | Retrieve booking details, services, payments, and balances |
| `/api/bookings/<id>/status` | `PATCH` | Update booking status (`CONFIRMED`, `PENDING`, `CANCELLED`) |
| `/api/bookings/<id>/services` | `GET`, `POST` | View or attach add-on services to a booking |
| `/api/bookings/<id>/services/<sid>` | `DELETE` | Remove an add-on service from a booking |
| `/api/bookings/<id>/payments` | `GET`, `POST` | View or record payments against a specific booking |
| `/api/payments` | `GET` | List all historical payments with customer and event details |
| `/api/reports/revenue` | `GET` | Aggregated revenue by month, event category, package, and outstanding balances |
| `/api/reports/schedule` | `GET` | Daily schedule of bookings for any selected date (`?date=YYYY-MM-DD`) |

---

## 🧪 Demonstration & Faculty Review Script

Refer to [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md) for a step-by-step 5-minute faculty review sequence, including:
1. **Live KPI Dashboard & Metrics**
2. **Customer Registration & Search**
3. **Booking Creation & Conflict Triggers** (Time validation & Capacity rejection)
4. **Add-on Services Attachment & Payment Recording**
5. **Revenue Breakdown & Daily Venue Schedules**
