"""
Flask REST API – Taj Banquet Hall Booking Management System
Database: SQLite (prototype; Oracle SQL/PL/SQL docs preserved in docs/)
"""
import os, re
from datetime import datetime, date
from flask import Flask, jsonify, request, abort
from flask_cors import CORS
from dotenv import load_dotenv
from db import get_connection, init_db

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.get("/")
def index():
    return jsonify({
        "name": "Taj Banquet Hall Booking Management System API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "dashboard": "/api/dashboard",
            "customers": "/api/customers",
            "bookings": "/api/bookings",
            "packages": "/api/packages",
            "services": "/api/services",
            "payments": "/api/payments",
            "reports_revenue": "/api/reports/revenue",
            "reports_schedule": "/api/reports/schedule"
        }
    })

# ── helpers ──────────────────────────────────────────────────────────────────

def row_to_dict(row):
    return dict(row) if row else None

def rows_to_list(rows):
    return [dict(r) for r in rows]

def parse_dt(s):
    """Accept 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DDTHH:MM' strings."""
    s = s.strip().replace("T", " ")
    if len(s) == 16:
        s += ":00"
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")

def validate_booking_times(start_at, end_at):
    try:
        s = parse_dt(start_at)
        e = parse_dt(end_at)
    except ValueError as exc:
        return str(exc)
    if e <= s:
        return "end_at must be later than start_at"
    return None

def check_overlap(cur, start_at, end_at, exclude_booking_id=None):
    """Return True if any PENDING/CONFIRMED booking overlaps the given interval."""
    q = """
        SELECT 1 FROM BOOKING
        WHERE status IN ('PENDING','CONFIRMED')
          AND end_at   > ?
          AND start_at < ?
    """
    params = [start_at, end_at]
    if exclude_booking_id:
        q += " AND booking_id != ?"
        params.append(exclude_booking_id)
    return cur.execute(q, params).fetchone() is not None

def err(msg, code=400):
    return jsonify({"error": msg}), code

# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def dashboard():
    conn = get_connection()
    cur  = conn.cursor()

    stats = {}
    stats["total_customers"]  = cur.execute("SELECT COUNT(*) FROM CUSTOMER").fetchone()[0]
    stats["total_bookings"]   = cur.execute("SELECT COUNT(*) FROM BOOKING").fetchone()[0]
    stats["confirmed"]        = cur.execute("SELECT COUNT(*) FROM BOOKING WHERE status='CONFIRMED'").fetchone()[0]
    stats["pending"]          = cur.execute("SELECT COUNT(*) FROM BOOKING WHERE status='PENDING'").fetchone()[0]
    stats["cancelled"]        = cur.execute("SELECT COUNT(*) FROM BOOKING WHERE status='CANCELLED'").fetchone()[0]
    stats["total_revenue"]    = cur.execute("SELECT COALESCE(SUM(amount),0) FROM PAYMENT").fetchone()[0]
    stats["total_packages"]   = cur.execute("SELECT COUNT(*) FROM HALL_PACKAGE").fetchone()[0]
    stats["total_services"]   = cur.execute("SELECT COUNT(*) FROM SERVICE").fetchone()[0]

    # Revenue last 6 months
    monthly = cur.execute("""
        SELECT strftime('%Y-%m', payment_date) AS month,
               SUM(amount) AS revenue
        FROM PAYMENT
        GROUP BY month ORDER BY month DESC LIMIT 6
    """).fetchall()
    stats["monthly_revenue"] = rows_to_list(monthly)[::-1]

    # Upcoming bookings (next 30 days)
    upcoming = cur.execute("""
        SELECT b.booking_id, c.full_name, e.event_name, p.package_name,
               b.start_at, b.end_at, b.guest_count, b.status
        FROM BOOKING b
        JOIN CUSTOMER c     ON b.customer_id   = c.customer_id
        JOIN EVENT_TYPE e   ON b.event_type_id = e.event_type_id
        JOIN HALL_PACKAGE p ON b.package_id    = p.package_id
        WHERE b.status IN ('PENDING','CONFIRMED')
          AND date(b.start_at) >= date('now')
          AND date(b.start_at) <= date('now','+30 days')
        ORDER BY b.start_at LIMIT 5
    """).fetchall()
    stats["upcoming_bookings"] = rows_to_list(upcoming)

    conn.close()
    return jsonify(stats)

# ─────────────────────────────────────────────────────────────────────────────
# CUSTOMERS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/customers")
def list_customers():
    q = request.args.get("q", "").strip()
    conn = get_connection()
    cur  = conn.cursor()
    if q:
        rows = cur.execute(
            "SELECT * FROM CUSTOMER WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY full_name",
            (f"%{q}%", f"%{q}%", f"%{q}%")
        ).fetchall()
    else:
        rows = cur.execute("SELECT * FROM CUSTOMER ORDER BY full_name").fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.get("/api/customers/<int:cid>")
def get_customer(cid):
    conn = get_connection()
    row  = conn.execute("SELECT * FROM CUSTOMER WHERE customer_id=?", (cid,)).fetchone()
    conn.close()
    if not row:
        return err("Customer not found", 404)
    return jsonify(row_to_dict(row))

@app.post("/api/customers")
def create_customer():
    d = request.get_json(force=True) or {}
    name  = (d.get("full_name") or "").strip()
    phone = (d.get("phone")     or "").strip()
    email = (d.get("email")     or "").strip().lower()
    if not name:  return err("full_name is required")
    if not phone: return err("phone is required")
    if not email: return err("email is required")
    if not re.match(r"^\d{10}$", phone): return err("phone must be 10 digits")
    if not re.match(r"^[\w.+\-]+@[\w\-]+\.\w+$", email): return err("invalid email")
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO CUSTOMER(full_name,phone,email) VALUES(?,?,?)",
            (name, phone, email)
        )
        conn.commit()
        new_id = cur.lastrowid
    except Exception as exc:
        conn.rollback(); conn.close()
        msg = str(exc)
        if "UNIQUE" in msg.upper():
            return err("Phone or email already registered")
        return err(msg)
    row = conn.execute("SELECT * FROM CUSTOMER WHERE customer_id=?", (new_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 201

@app.put("/api/customers/<int:cid>")
def update_customer(cid):
    d = request.get_json(force=True) or {}
    conn = get_connection()
    existing = conn.execute("SELECT * FROM CUSTOMER WHERE customer_id=?", (cid,)).fetchone()
    if not existing:
        conn.close(); return err("Customer not found", 404)
    name  = (d.get("full_name") or existing["full_name"]).strip()
    phone = (d.get("phone")     or existing["phone"]).strip()
    email = (d.get("email")     or existing["email"]).strip().lower()
    try:
        conn.execute(
            "UPDATE CUSTOMER SET full_name=?,phone=?,email=? WHERE customer_id=?",
            (name, phone, email, cid)
        )
        conn.commit()
    except Exception as exc:
        conn.rollback(); conn.close()
        return err(str(exc))
    row = conn.execute("SELECT * FROM CUSTOMER WHERE customer_id=?", (cid,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))

@app.delete("/api/customers/<int:cid>")
def delete_customer(cid):
    conn = get_connection()
    has_bookings = conn.execute(
        "SELECT 1 FROM BOOKING WHERE customer_id=? LIMIT 1", (cid,)
    ).fetchone()
    if has_bookings:
        conn.close()
        return err("Cannot delete customer with existing bookings")
    conn.execute("DELETE FROM CUSTOMER WHERE customer_id=?", (cid,))
    conn.commit(); conn.close()
    return jsonify({"message": "Customer deleted"})

# ─────────────────────────────────────────────────────────────────────────────
# EVENT TYPES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/event-types")
def list_event_types():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM EVENT_TYPE ORDER BY event_name").fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.post("/api/event-types")
def create_event_type():
    d    = request.get_json(force=True) or {}
    name = (d.get("event_name") or "").strip()
    if not name: return err("event_name is required")
    conn = get_connection()
    try:
        cur = conn.execute("INSERT INTO EVENT_TYPE(event_name) VALUES(?)", (name,))
        conn.commit()
        row = conn.execute("SELECT * FROM EVENT_TYPE WHERE event_type_id=?", (cur.lastrowid,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201
    except Exception as exc:
        conn.rollback(); conn.close()
        return err("Event type name already exists" if "UNIQUE" in str(exc).upper() else str(exc))

@app.delete("/api/event-types/<int:eid>")
def delete_event_type(eid):
    conn = get_connection()
    if conn.execute("SELECT 1 FROM BOOKING WHERE event_type_id=? LIMIT 1", (eid,)).fetchone():
        conn.close(); return err("Cannot delete event type used in bookings")
    conn.execute("DELETE FROM EVENT_TYPE WHERE event_type_id=?", (eid,))
    conn.commit(); conn.close()
    return jsonify({"message": "Deleted"})

# ─────────────────────────────────────────────────────────────────────────────
# HALL PACKAGES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/packages")
def list_packages():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM HALL_PACKAGE ORDER BY base_price").fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.get("/api/packages/<int:pid>")
def get_package(pid):
    conn = get_connection()
    row  = conn.execute("SELECT * FROM HALL_PACKAGE WHERE package_id=?", (pid,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)) if row else err("Package not found", 404)

@app.post("/api/packages")
def create_package():
    d    = request.get_json(force=True) or {}
    name = (d.get("package_name") or "").strip()
    try:
        price    = float(d["base_price"])
        capacity = int(d["capacity"])
    except (KeyError, ValueError, TypeError):
        return err("base_price and capacity are required numbers")
    if not name:     return err("package_name is required")
    if price < 0:    return err("base_price must be >= 0")
    if capacity < 1: return err("capacity must be > 0")
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO HALL_PACKAGE(package_name,base_price,capacity) VALUES(?,?,?)",
            (name, price, capacity)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM HALL_PACKAGE WHERE package_id=?", (cur.lastrowid,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201
    except Exception as exc:
        conn.rollback(); conn.close()
        return err("Package name already exists" if "UNIQUE" in str(exc).upper() else str(exc))

@app.put("/api/packages/<int:pid>")
def update_package(pid):
    d    = request.get_json(force=True) or {}
    conn = get_connection()
    existing = conn.execute("SELECT * FROM HALL_PACKAGE WHERE package_id=?", (pid,)).fetchone()
    if not existing: conn.close(); return err("Package not found", 404)
    name     = (d.get("package_name") or existing["package_name"]).strip()
    price    = float(d.get("base_price",  existing["base_price"]))
    capacity = int(d.get("capacity", existing["capacity"]))
    try:
        conn.execute(
            "UPDATE HALL_PACKAGE SET package_name=?,base_price=?,capacity=? WHERE package_id=?",
            (name, price, capacity, pid)
        )
        conn.commit()
    except Exception as exc:
        conn.rollback(); conn.close(); return err(str(exc))
    row = conn.execute("SELECT * FROM HALL_PACKAGE WHERE package_id=?", (pid,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))

@app.delete("/api/packages/<int:pid>")
def delete_package(pid):
    conn = get_connection()
    if conn.execute("SELECT 1 FROM BOOKING WHERE package_id=? LIMIT 1", (pid,)).fetchone():
        conn.close(); return err("Cannot delete package used in bookings")
    conn.execute("DELETE FROM HALL_PACKAGE WHERE package_id=?", (pid,))
    conn.commit(); conn.close()
    return jsonify({"message": "Deleted"})

# ─────────────────────────────────────────────────────────────────────────────
# SERVICES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/services")
def list_services():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM SERVICE ORDER BY service_name").fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.post("/api/services")
def create_service():
    d    = request.get_json(force=True) or {}
    name = (d.get("service_name") or "").strip()
    try:
        price = float(d["unit_price"])
    except (KeyError, ValueError, TypeError):
        return err("unit_price is required")
    if not name:  return err("service_name is required")
    if price < 0: return err("unit_price must be >= 0")
    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO SERVICE(service_name,unit_price) VALUES(?,?)",
            (name, price)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM SERVICE WHERE service_id=?", (cur.lastrowid,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201
    except Exception as exc:
        conn.rollback(); conn.close()
        return err("Service name already exists" if "UNIQUE" in str(exc).upper() else str(exc))

@app.put("/api/services/<int:sid>")
def update_service(sid):
    d    = request.get_json(force=True) or {}
    conn = get_connection()
    existing = conn.execute("SELECT * FROM SERVICE WHERE service_id=?", (sid,)).fetchone()
    if not existing: conn.close(); return err("Service not found", 404)
    name  = (d.get("service_name") or existing["service_name"]).strip()
    price = float(d.get("unit_price", existing["unit_price"]))
    try:
        conn.execute("UPDATE SERVICE SET service_name=?,unit_price=? WHERE service_id=?", (name, price, sid))
        conn.commit()
    except Exception as exc:
        conn.rollback(); conn.close(); return err(str(exc))
    row = conn.execute("SELECT * FROM SERVICE WHERE service_id=?", (sid,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))

@app.delete("/api/services/<int:sid>")
def delete_service(sid):
    conn = get_connection()
    if conn.execute("SELECT 1 FROM BOOKING_SERVICE WHERE service_id=? LIMIT 1", (sid,)).fetchone():
        conn.close(); return err("Cannot delete service attached to bookings")
    conn.execute("DELETE FROM SERVICE WHERE service_id=?", (sid,))
    conn.commit(); conn.close()
    return jsonify({"message": "Deleted"})

# ─────────────────────────────────────────────────────────────────────────────
# BOOKINGS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/bookings")
def list_bookings():
    status = request.args.get("status", "").strip().upper()
    date_f = request.args.get("date", "").strip()
    cid    = request.args.get("customer_id", "").strip()
    q = """
        SELECT b.booking_id, c.full_name AS customer_name, e.event_name,
               p.package_name, p.capacity, p.base_price,
               b.start_at, b.end_at, b.guest_count, b.status, b.notes,
               b.customer_id, b.event_type_id, b.package_id
        FROM BOOKING b
        JOIN CUSTOMER c     ON b.customer_id   = c.customer_id
        JOIN EVENT_TYPE e   ON b.event_type_id = e.event_type_id
        JOIN HALL_PACKAGE p ON b.package_id    = p.package_id
        WHERE 1=1
    """
    params = []
    if status:
        q += " AND b.status=?"; params.append(status)
    if date_f:
        q += " AND date(b.start_at)=?"; params.append(date_f)
    if cid:
        q += " AND b.customer_id=?"; params.append(int(cid))
    q += " ORDER BY b.start_at DESC"
    conn = get_connection()
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.get("/api/bookings/<int:bid>")
def get_booking(bid):
    conn = get_connection()
    row = conn.execute("""
        SELECT b.*, c.full_name AS customer_name, e.event_name,
               p.package_name, p.capacity, p.base_price
        FROM BOOKING b
        JOIN CUSTOMER c     ON b.customer_id   = c.customer_id
        JOIN EVENT_TYPE e   ON b.event_type_id = e.event_type_id
        JOIN HALL_PACKAGE p ON b.package_id    = p.package_id
        WHERE b.booking_id=?
    """, (bid,)).fetchone()
    if not row: conn.close(); return err("Booking not found", 404)

    services = conn.execute("""
        SELECT s.service_id, s.service_name, bs.quantity, bs.unit_price,
               (bs.quantity * bs.unit_price) AS line_total
        FROM BOOKING_SERVICE bs JOIN SERVICE s ON bs.service_id=s.service_id
        WHERE bs.booking_id=?
    """, (bid,)).fetchall()

    payments = conn.execute("""
        SELECT * FROM PAYMENT WHERE booking_id=? ORDER BY payment_date
    """, (bid,)).fetchall()

    data = row_to_dict(row)
    data["services"] = rows_to_list(services)
    data["payments"] = rows_to_list(payments)
    svc_total = sum(s["line_total"] for s in data["services"])
    paid      = sum(p["amount"]     for p in data["payments"])
    data["services_total"]    = svc_total
    data["total_amount"]      = data["base_price"] + svc_total
    data["total_paid"]        = paid
    data["outstanding_balance"] = data["total_amount"] - paid
    conn.close()
    return jsonify(data)

@app.post("/api/bookings")
def create_booking():
    d = request.get_json(force=True) or {}
    required = ["customer_id","event_type_id","package_id","start_at","end_at","guest_count"]
    for f in required:
        if f not in d: return err(f"{f} is required")

    try:
        cid    = int(d["customer_id"])
        etid   = int(d["event_type_id"])
        pkid   = int(d["package_id"])
        guests = int(d["guest_count"])
    except (ValueError, TypeError):
        return err("IDs and guest_count must be integers")

    start_at = (d.get("start_at") or "").strip()
    end_at   = (d.get("end_at")   or "").strip()
    status   = (d.get("status")   or "PENDING").strip().upper()
    notes    = (d.get("notes")    or "").strip() or None

    time_err = validate_booking_times(start_at, end_at)
    if time_err: return err(time_err)

    if guests < 1: return err("guest_count must be positive")
    if status not in ("PENDING","CONFIRMED","CANCELLED"):
        return err("status must be PENDING, CONFIRMED or CANCELLED")

    conn = get_connection()
    cur  = conn.cursor()

    # Validate FKs
    if not cur.execute("SELECT 1 FROM CUSTOMER WHERE customer_id=?", (cid,)).fetchone():
        conn.close(); return err("Customer not found", 404)
    if not cur.execute("SELECT 1 FROM EVENT_TYPE WHERE event_type_id=?", (etid,)).fetchone():
        conn.close(); return err("Event type not found", 404)
    pkg = cur.execute("SELECT * FROM HALL_PACKAGE WHERE package_id=?", (pkid,)).fetchone()
    if not pkg: conn.close(); return err("Package not found", 404)

    # Capacity check
    if guests > pkg["capacity"]:
        conn.close()
        return err(f"guest_count {guests} exceeds package capacity {pkg['capacity']}")

    # Overlap check (only for PENDING/CONFIRMED)
    if status in ("PENDING","CONFIRMED"):
        if check_overlap(cur, start_at, end_at):
            conn.close()
            return err("Time slot overlaps an existing PENDING or CONFIRMED booking")

    try:
        cur.execute("""
            INSERT INTO BOOKING(customer_id,event_type_id,package_id,start_at,end_at,
                                guest_count,status,notes)
            VALUES(?,?,?,?,?,?,?,?)
        """, (cid, etid, pkid, start_at, end_at, guests, status, notes))
        conn.commit()
        new_id = cur.lastrowid
    except Exception as exc:
        conn.rollback(); conn.close(); return err(str(exc))

    conn.close()
    return get_booking(new_id)

@app.put("/api/bookings/<int:bid>")
def update_booking(bid):
    d    = request.get_json(force=True) or {}
    conn = get_connection()
    cur  = conn.cursor()
    existing = cur.execute("SELECT * FROM BOOKING WHERE booking_id=?", (bid,)).fetchone()
    if not existing: conn.close(); return err("Booking not found", 404)

    cid      = int(d.get("customer_id",    existing["customer_id"]))
    etid     = int(d.get("event_type_id",  existing["event_type_id"]))
    pkid     = int(d.get("package_id",     existing["package_id"]))
    guests   = int(d.get("guest_count",    existing["guest_count"]))
    start_at =    (d.get("start_at",       existing["start_at"])).strip()
    end_at   =    (d.get("end_at",         existing["end_at"])).strip()
    status   =    (d.get("status",         existing["status"])).strip().upper()
    notes    =    (d.get("notes",          existing["notes"]))

    time_err = validate_booking_times(start_at, end_at)
    if time_err: conn.close(); return err(time_err)
    if guests < 1: conn.close(); return err("guest_count must be positive")

    pkg = cur.execute("SELECT * FROM HALL_PACKAGE WHERE package_id=?", (pkid,)).fetchone()
    if not pkg: conn.close(); return err("Package not found", 404)
    if guests > pkg["capacity"]:
        conn.close(); return err(f"guest_count {guests} exceeds package capacity {pkg['capacity']}")

    if status in ("PENDING","CONFIRMED"):
        if check_overlap(cur, start_at, end_at, exclude_booking_id=bid):
            conn.close(); return err("Time slot overlaps an existing PENDING or CONFIRMED booking")

    try:
        cur.execute("""
            UPDATE BOOKING SET customer_id=?,event_type_id=?,package_id=?,
            start_at=?,end_at=?,guest_count=?,status=?,notes=?
            WHERE booking_id=?
        """, (cid, etid, pkid, start_at, end_at, guests, status, notes, bid))
        conn.commit()
    except Exception as exc:
        conn.rollback(); conn.close(); return err(str(exc))
    conn.close()
    return get_booking(bid)

@app.patch("/api/bookings/<int:bid>/status")
def update_status(bid):
    d      = request.get_json(force=True) or {}
    status = (d.get("status") or "").strip().upper()
    if status not in ("PENDING","CONFIRMED","CANCELLED"):
        return err("status must be PENDING, CONFIRMED or CANCELLED")
    conn = get_connection()
    cur  = conn.cursor()
    existing = cur.execute("SELECT * FROM BOOKING WHERE booking_id=?", (bid,)).fetchone()
    if not existing: conn.close(); return err("Booking not found", 404)

    if status in ("PENDING","CONFIRMED") and existing["status"] == "CANCELLED":
        # Re-activating: re-check overlap
        if check_overlap(cur, existing["start_at"], existing["end_at"], exclude_booking_id=bid):
            conn.close(); return err("Cannot re-activate: time slot is now taken")

    cur.execute("UPDATE BOOKING SET status=? WHERE booking_id=?", (status, bid))
    conn.commit(); conn.close()
    return get_booking(bid)

@app.delete("/api/bookings/<int:bid>")
def delete_booking(bid):
    conn = get_connection()
    if not conn.execute("SELECT 1 FROM BOOKING WHERE booking_id=?", (bid,)).fetchone():
        conn.close(); return err("Booking not found", 404)
    conn.execute("DELETE FROM BOOKING_SERVICE WHERE booking_id=?", (bid,))
    conn.execute("DELETE FROM PAYMENT WHERE booking_id=?", (bid,))
    conn.execute("DELETE FROM BOOKING WHERE booking_id=?", (bid,))
    conn.commit(); conn.close()
    return jsonify({"message": "Booking deleted"})

# ─────────────────────────────────────────────────────────────────────────────
# BOOKING SERVICES
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/bookings/<int:bid>/services")
def booking_services(bid):
    conn = get_connection()
    rows = conn.execute("""
        SELECT s.service_id, s.service_name, bs.quantity, bs.unit_price,
               (bs.quantity*bs.unit_price) AS line_total
        FROM BOOKING_SERVICE bs JOIN SERVICE s ON bs.service_id=s.service_id
        WHERE bs.booking_id=?
    """, (bid,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.post("/api/bookings/<int:bid>/services")
def add_booking_service(bid):
    d = request.get_json(force=True) or {}
    conn = get_connection()
    if not conn.execute("SELECT 1 FROM BOOKING WHERE booking_id=?", (bid,)).fetchone():
        conn.close(); return err("Booking not found", 404)
    try:
        svc_id = int(d["service_id"])
        qty    = int(d["quantity"])
    except (KeyError, ValueError, TypeError):
        conn.close(); return err("service_id and quantity are required integers")
    svc = conn.execute("SELECT * FROM SERVICE WHERE service_id=?", (svc_id,)).fetchone()
    if not svc: conn.close(); return err("Service not found", 404)
    if qty < 1: conn.close(); return err("quantity must be positive")
    price = float(d.get("unit_price", svc["unit_price"]))
    try:
        conn.execute("""
            INSERT INTO BOOKING_SERVICE(booking_id,service_id,quantity,unit_price)
            VALUES(?,?,?,?) ON CONFLICT(booking_id,service_id) DO UPDATE
            SET quantity=excluded.quantity, unit_price=excluded.unit_price
        """, (bid, svc_id, qty, price))
        conn.commit()
    except Exception as exc:
        conn.rollback(); conn.close(); return err(str(exc))
    conn.close()
    return jsonify({"message": "Service added/updated"}), 201

@app.delete("/api/bookings/<int:bid>/services/<int:sid>")
def remove_booking_service(bid, sid):
    conn = get_connection()
    conn.execute("DELETE FROM BOOKING_SERVICE WHERE booking_id=? AND service_id=?", (bid, sid))
    conn.commit(); conn.close()
    return jsonify({"message": "Removed"})

# ─────────────────────────────────────────────────────────────────────────────
# PAYMENTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/bookings/<int:bid>/payments")
def booking_payments(bid):
    conn = get_connection()
    rows = conn.execute("SELECT * FROM PAYMENT WHERE booking_id=? ORDER BY payment_date", (bid,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

@app.post("/api/bookings/<int:bid>/payments")
def add_payment(bid):
    d = request.get_json(force=True) or {}
    conn = get_connection()
    if not conn.execute("SELECT 1 FROM BOOKING WHERE booking_id=?", (bid,)).fetchone():
        conn.close(); return err("Booking not found", 404)
    try:
        amount = float(d["amount"])
    except (KeyError, ValueError, TypeError):
        conn.close(); return err("amount is required")
    method   = (d.get("payment_method") or "").strip().upper()
    ref_no   = (d.get("reference_no") or "").strip() or None
    pay_date = (d.get("payment_date") or date.today().isoformat()).strip()
    if amount <= 0: conn.close(); return err("amount must be positive")
    if method not in ("UPI","CASH","CARD","NEFT","CHEQUE"):
        conn.close(); return err("payment_method must be UPI, CASH, CARD, NEFT or CHEQUE")
    try:
        cur = conn.execute("""
            INSERT INTO PAYMENT(booking_id,payment_date,amount,payment_method,reference_no)
            VALUES(?,?,?,?,?)
        """, (bid, pay_date, amount, method, ref_no))
        conn.commit()
        row = conn.execute("SELECT * FROM PAYMENT WHERE payment_id=?", (cur.lastrowid,)).fetchone()
        conn.close()
        return jsonify(row_to_dict(row)), 201
    except Exception as exc:
        conn.rollback(); conn.close()
        return err("Reference number already exists" if "UNIQUE" in str(exc).upper() else str(exc))

@app.get("/api/payments")
def list_all_payments():
    conn = get_connection()
    rows = conn.execute("""
        SELECT p.*, c.full_name AS customer_name, b.start_at AS event_date
        FROM PAYMENT p
        JOIN BOOKING b  ON p.booking_id = b.booking_id
        JOIN CUSTOMER c ON b.customer_id = c.customer_id
        ORDER BY p.payment_date DESC
    """).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

# ─────────────────────────────────────────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/reports/revenue")
def revenue_report():
    conn = get_connection()

    by_month = conn.execute("""
        SELECT strftime('%Y-%m', payment_date) AS month,
               COUNT(*) AS payment_count, SUM(amount) AS total
        FROM PAYMENT GROUP BY month ORDER BY month
    """).fetchall()

    by_event = conn.execute("""
        SELECT e.event_name, COUNT(b.booking_id) AS bookings,
               COALESCE(SUM(p.amount),0) AS revenue
        FROM BOOKING b
        JOIN EVENT_TYPE e ON b.event_type_id=e.event_type_id
        LEFT JOIN PAYMENT p ON b.booking_id=p.booking_id
        GROUP BY e.event_name ORDER BY revenue DESC
    """).fetchall()

    by_package = conn.execute("""
        SELECT hp.package_name, COUNT(b.booking_id) AS bookings,
               COALESCE(SUM(p.amount),0) AS revenue
        FROM BOOKING b
        JOIN HALL_PACKAGE hp ON b.package_id=hp.package_id
        LEFT JOIN PAYMENT p  ON b.booking_id=p.booking_id
        GROUP BY hp.package_name ORDER BY revenue DESC
    """).fetchall()

    outstanding = conn.execute("""
        SELECT * FROM (
            SELECT b.booking_id, c.full_name AS customer_name,
                   p2.package_name, b.status,
                   (p2.base_price + COALESCE(svc.svc_total,0)) AS total_amount,
                   COALESCE(pay.paid,0) AS total_paid,
                   (p2.base_price + COALESCE(svc.svc_total,0) - COALESCE(pay.paid,0)) AS outstanding
            FROM BOOKING b
            JOIN CUSTOMER c ON b.customer_id=c.customer_id
            JOIN HALL_PACKAGE p2 ON b.package_id=p2.package_id
            LEFT JOIN (SELECT booking_id, SUM(quantity*unit_price) AS svc_total
                       FROM BOOKING_SERVICE GROUP BY booking_id) svc ON svc.booking_id=b.booking_id
            LEFT JOIN (SELECT booking_id, SUM(amount) AS paid
                       FROM PAYMENT GROUP BY booking_id) pay ON pay.booking_id=b.booking_id
            WHERE b.status IN ('PENDING','CONFIRMED')
        )
        WHERE outstanding > 0
        ORDER BY outstanding DESC
    """).fetchall()

    conn.close()
    return jsonify({
        "by_month":      rows_to_list(by_month),
        "by_event":      rows_to_list(by_event),
        "by_package":    rows_to_list(by_package),
        "outstanding":   rows_to_list(outstanding),
    })

@app.get("/api/reports/schedule")
def daily_schedule():
    day = request.args.get("date", date.today().isoformat())
    conn = get_connection()
    rows = conn.execute("""
        SELECT b.booking_id, c.full_name AS customer_name, e.event_name,
               p.package_name, b.start_at, b.end_at, b.guest_count, b.status
        FROM BOOKING b
        JOIN CUSTOMER c     ON b.customer_id=c.customer_id
        JOIN EVENT_TYPE e   ON b.event_type_id=e.event_type_id
        JOIN HALL_PACKAGE p ON b.package_id=p.package_id
        WHERE date(b.start_at)=? ORDER BY b.start_at
    """, (day,)).fetchall()
    conn.close()
    return jsonify(rows_to_list(rows))

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    print(f"[server] Taj Banquet Hall API running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)

