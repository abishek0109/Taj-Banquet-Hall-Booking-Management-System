# Demo Guide – Taj Banquet Hall BMS
## 5-Minute Faculty Demonstration Sequence

---

### PRE-DEMO SETUP (before faculty arrives)

1. Start backend: `cd backend && python app.py`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser → **http://localhost:3000**
4. Keep this guide open in a second tab or printed

---

## STEP 1 – Dashboard Overview (60 sec)

> *"This is the Dashboard showing live statistics from the SQLite database."*

- Point out: **8 stat cards** – customers, bookings by status, total revenue
- Scroll to **Monthly Revenue chart** – shows payment data from the database
- Scroll to **Upcoming Bookings** table – live data, not mock

---

## STEP 2 – Customers Module (45 sec)

Click **Customers** in the sidebar.

1. Show the list of 10 pre-seeded customers
2. **Search test**: Type "Priya" → see filtered result
3. Click **Add Customer**:
   - Name: `Test Student`
   - Phone: `9111111111`
   - Email: `test@demo.com`
   - Click **Add Customer** → new row appears instantly

---

## STEP 3 – Create a Booking (90 sec)

Click **Bookings** in the sidebar.

1. Click **New Booking**
2. Fill in:
   - Customer: any from dropdown
   - Event Type: Wedding
   - Package: Gold Hall (cap 250)
   - Guests: **150**
   - Start: `2026-12-10 10:00`
   - End: `2026-12-10 18:00`
   - Status: PENDING
3. Click **Create Booking** → success

**Business Rule Test – Invalid Time:**
- Click **New Booking** again
- Set Start: `2026-12-15 18:00`, End: `2026-12-15 10:00`
- Click **Create Booking** → error: *"end_at must be later than start_at"*

**Business Rule Test – Capacity:**
- Set Guests = **300** with **Basic Hall** (cap 80)
- Error: *"guest_count 300 exceeds package capacity 80"*

---

## STEP 4 – Booking Detail, Services & Payments (60 sec)

Click the **eye icon** on any CONFIRMED booking (e.g. #1 – Arun Kumar).

1. **Info tab**: shows event date, total amount, outstanding balance
2. **Services tab**: lists photography, DJ, decoration; add another service
3. **Payments tab**:
   - Shows existing payments and outstanding balance
   - Click **Record Payment**: Amount=`10000`, Method=`UPI`, Ref=`UPI-DEMO-999`
   - Balance updates immediately

**Status Change:**
- Go back to Info tab → click **✓ Confirm** or **✕ Cancel**

---

## STEP 5 – Packages & Add-on Services (30 sec)

Click **Packages**:
- Shows 5 packages as cards + table
- Click **Add Package** → create `Diamond Hall`, price `200000`, capacity `800`

Click **Add-on Services**:
- Lists all 10 services with prices
- Click **Add Service** → `Ice Cream Bar`, `₹3500`

---

## STEP 6 – Payments Page (20 sec)

Click **Payments** in the sidebar:
- Shows all payment records with customer names and booking IDs
- Filter by method (UPI / CASH / CARD / NEFT / CHEQUE)
- Running total displayed top-right

---

## STEP 7 – Reports (45 sec)

Click **Reports**:
1. **Monthly Revenue bar chart** – aggregated payment data
2. **Revenue by Event Type** table – Weddings top revenue
3. **Revenue by Package** – Gold Hall vs Platinum Hall
4. **Outstanding Balances** – bookings with unpaid amounts
5. **Daily Schedule** – change date to `2026-11-05` → shows Arun Kumar's wedding

---

## KEY POINTS TO EMPHASISE

| Concept | Where demonstrated |
|---------|-------------------|
| 7 normalized tables (3NF) | Schema visible in ORACLE_SCHEMA.sql |
| Primary + Foreign keys | Enforced – delete customer with booking fails |
| CHECK constraints | Capacity, positive amounts, valid status |
| UNIQUE constraints | Phone, email, reference_no |
| Overlap prevention | Creating booking on same date/time → error |
| Parameterized queries | No SQL injection possible |
| Transactions | All writes use conn.commit() / rollback |
| PL/SQL equivalent | Stored procedure, trigger, cursor in ORACLE_SCHEMA.sql |
| Aggregate queries | Dashboard stats, revenue totals |
| JOIN queries | Booking list joins 4 tables |
| Views | Replicated as API endpoints |

---

*End of demonstration – total time: ~5 minutes*

