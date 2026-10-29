"""
Database connection and initialization for Taj Banquet Hall.
Uses SQLite (python built-in) as the working prototype database.
Oracle SQL/PL/SQL concepts are preserved in docs/ORACLE_SCHEMA.sql
"""
import sqlite3
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "database" / "taj_banquet.db"


def get_connection():
    """Return a SQLite connection with Row factory and FK enforcement."""
    conn = sqlite3.connect(str(DB_PATH), detect_types=sqlite3.PARSE_DECLTYPES)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db():
    """Create tables and seed sample data if not already present."""
    os.makedirs(str(DB_PATH.parent), exist_ok=True)
    conn = get_connection()
    cur = conn.cursor()

    # ── DDL ─────────────────────────────────────────────────────────────────
    cur.executescript("""
    CREATE TABLE IF NOT EXISTS CUSTOMER (
        customer_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name     TEXT    NOT NULL,
        phone         TEXT    NOT NULL UNIQUE,
        email         TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS EVENT_TYPE (
        event_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_name    TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS HALL_PACKAGE (
        package_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        package_name  TEXT    NOT NULL UNIQUE,
        base_price    REAL    NOT NULL CHECK(base_price >= 0),
        capacity      INTEGER NOT NULL CHECK(capacity > 0)
    );

    CREATE TABLE IF NOT EXISTS SERVICE (
        service_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name  TEXT    NOT NULL UNIQUE,
        unit_price    REAL    NOT NULL CHECK(unit_price >= 0)
    );

    CREATE TABLE IF NOT EXISTS BOOKING (
        booking_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id   INTEGER NOT NULL REFERENCES CUSTOMER(customer_id),
        event_type_id INTEGER NOT NULL REFERENCES EVENT_TYPE(event_type_id),
        package_id    INTEGER NOT NULL REFERENCES HALL_PACKAGE(package_id),
        start_at      TEXT    NOT NULL,
        end_at        TEXT    NOT NULL,
        guest_count   INTEGER NOT NULL CHECK(guest_count > 0),
        status        TEXT    NOT NULL DEFAULT 'PENDING'
                              CHECK(status IN ('PENDING','CONFIRMED','CANCELLED')),
        notes         TEXT,
        CHECK(end_at > start_at)
    );

    CREATE TABLE IF NOT EXISTS BOOKING_SERVICE (
        booking_id    INTEGER NOT NULL REFERENCES BOOKING(booking_id),
        service_id    INTEGER NOT NULL REFERENCES SERVICE(service_id),
        quantity      INTEGER NOT NULL CHECK(quantity > 0),
        unit_price    REAL    NOT NULL CHECK(unit_price >= 0),
        PRIMARY KEY (booking_id, service_id)
    );

    CREATE TABLE IF NOT EXISTS PAYMENT (
        payment_id     INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id     INTEGER NOT NULL REFERENCES BOOKING(booking_id),
        payment_date   TEXT    NOT NULL,
        amount         REAL    NOT NULL CHECK(amount > 0),
        payment_method TEXT    NOT NULL
                               CHECK(payment_method IN ('UPI','CASH','CARD','NEFT','CHEQUE')),
        reference_no   TEXT    UNIQUE
    );

    CREATE TABLE IF NOT EXISTS _seed_done (id INTEGER PRIMARY KEY);
    """)

    # Only seed once
    row = cur.execute("SELECT id FROM _seed_done WHERE id=1").fetchone()
    if row:
        conn.commit()
        conn.close()
        return

    # ── SAMPLE DATA ─────────────────────────────────────────────────────────
    cur.executescript("""
    -- EVENT_TYPE
    INSERT INTO EVENT_TYPE(event_name) VALUES
        ('Wedding'),('Birthday'),('Corporate Meeting'),
        ('Anniversary'),('Baby Shower'),('Engagement');

    -- HALL_PACKAGE
    INSERT INTO HALL_PACKAGE(package_name,base_price,capacity) VALUES
        ('Basic Hall',   15000,  80),
        ('Silver Hall',  35000, 150),
        ('Gold Hall',    60000, 250),
        ('Platinum Hall',90000, 400),
        ('Royal Suite', 150000, 600);

    -- CUSTOMER
    INSERT INTO CUSTOMER(full_name,phone,email) VALUES
        ('Arun Kumar',      '9000000001','arun.kumar@email.com'),
        ('Priya Sharma',    '9000000002','priya.sharma@email.com'),
        ('Ravi Patel',      '9000000003','ravi.patel@email.com'),
        ('Meena Nair',      '9000000004','meena.nair@email.com'),
        ('Suresh Reddy',    '9000000005','suresh.reddy@email.com'),
        ('Kavitha Iyer',    '9000000006','kavitha.iyer@email.com'),
        ('Deepak Singh',    '9000000007','deepak.singh@email.com'),
        ('Anitha Rao',      '9000000008','anitha.rao@email.com'),
        ('Vikram Mehta',    '9000000009','vikram.mehta@email.com'),
        ('Lalitha Devi',    '9000000010','lalitha.devi@email.com');

    -- SERVICE
    INSERT INTO SERVICE(service_name,unit_price) VALUES
        ('Projector',          2000),
        ('Catering (per head)', 500),
        ('Flower Decoration',  8000),
        ('DJ & Sound System', 12000),
        ('Photography',       15000),
        ('Videography',       18000),
        ('LED Stage Backdrop', 9000),
        ('Live Band',         25000),
        ('Valet Parking',      3000),
        ('Smoke Machine',      5000);

    -- BOOKING  (dates in ISO format YYYY-MM-DD HH:MM)
    INSERT INTO BOOKING(customer_id,event_type_id,package_id,start_at,end_at,guest_count,status,notes) VALUES
        (1,1,3,'2026-11-05 10:00','2026-11-05 18:00',200,'CONFIRMED','Bride side: vegetarian only'),
        (2,2,2,'2026-11-08 14:00','2026-11-08 20:00',120,'CONFIRMED','Birthday cake by 3 PM'),
        (3,3,1,'2026-11-10 09:00','2026-11-10 13:00', 60,'PENDING',  'Board-room setup'),
        (4,4,2,'2026-11-12 17:00','2026-11-12 22:00',100,'CONFIRMED','Anniversary surprise'),
        (5,1,4,'2026-11-15 09:00','2026-11-15 21:00',350,'CONFIRMED','Full day wedding'),
        (6,5,1,'2026-11-18 10:00','2026-11-18 14:00', 50,'PENDING',  NULL),
        (7,6,2,'2026-11-20 11:00','2026-11-20 15:00',130,'CONFIRMED','Engagement lunch'),
        (8,2,3,'2026-11-22 16:00','2026-11-22 22:00',180,'CANCELLED','Rescheduled to Dec'),
        (9,3,1,'2026-11-25 09:00','2026-11-25 12:00', 40,'PENDING',  'Workshop layout'),
        (1,4,4,'2026-12-01 10:00','2026-12-01 22:00',300,'CONFIRMED','First anniversary');

    -- BOOKING_SERVICE
    INSERT INTO BOOKING_SERVICE(booking_id,service_id,quantity,unit_price) VALUES
        (1,1,1,2000),(1,3,1,8000),(1,4,1,12000),(1,5,1,15000),
        (2,1,1,2000),(2,4,1,12000),
        (3,1,1,2000),
        (4,3,1,8000),(4,5,1,15000),
        (5,3,1,8000),(5,4,1,12000),(5,5,1,15000),(5,6,1,18000),(5,8,1,25000),
        (6,3,1,8000),
        (7,3,1,8000),(7,5,1,15000),
        (9,1,1,2000),
        (10,3,1,8000),(10,4,1,12000),(10,5,1,15000),(10,6,1,18000);

    -- PAYMENT
    INSERT INTO PAYMENT(booking_id,payment_date,amount,payment_method,reference_no) VALUES
        (1,'2026-10-15',30000,'UPI',  'UPI-TXN-0001'),
        (1,'2026-10-25',30000,'NEFT', 'NEFT-TXN-0001'),
        (2,'2026-10-20',20000,'UPI',  'UPI-TXN-0002'),
        (2,'2026-10-28',15000,'CASH', 'CASH-0001'),
        (4,'2026-10-18',35000,'CARD', 'CARD-TXN-0001'),
        (5,'2026-10-10',50000,'NEFT', 'NEFT-TXN-0002'),
        (5,'2026-10-20',50000,'UPI',  'UPI-TXN-0003'),
        (7,'2026-10-22',35000,'UPI',  'UPI-TXN-0004'),
        (7,'2026-10-29',15000,'CASH', 'CASH-0002'),
        (10,'2026-10-05',45000,'NEFT','NEFT-TXN-0003'),
        (10,'2026-10-15',45000,'UPI', 'UPI-TXN-0005');

    INSERT INTO _seed_done(id) VALUES(1);
    """)

    conn.commit()
    conn.close()
    print("[db] Database initialised with sample data.")

