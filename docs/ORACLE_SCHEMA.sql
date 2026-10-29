-- ============================================================
-- TAJ BANQUET HALL – ORACLE SQL / PL/SQL REFERENCE
-- (Prototype uses SQLite; this file documents the Oracle design)
-- ============================================================

-- ── DDL ────────────────────────────────────────────────────────────────────

CREATE TABLE CUSTOMER (
    customer_id  NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name    VARCHAR2(100) NOT NULL,
    phone        VARCHAR2(15)  NOT NULL UNIQUE,
    email        VARCHAR2(100) NOT NULL UNIQUE
);

CREATE TABLE EVENT_TYPE (
    event_type_id NUMBER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_name    VARCHAR2(80) NOT NULL UNIQUE
);

CREATE TABLE HALL_PACKAGE (
    package_id   NUMBER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    package_name VARCHAR2(80)   NOT NULL UNIQUE,
    base_price   NUMBER(10,2)   NOT NULL CHECK(base_price >= 0),
    capacity     NUMBER(5)      NOT NULL CHECK(capacity > 0)
);

CREATE TABLE SERVICE (
    service_id   NUMBER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_name VARCHAR2(80)   NOT NULL UNIQUE,
    unit_price   NUMBER(10,2)   NOT NULL CHECK(unit_price >= 0)
);

CREATE TABLE BOOKING (
    booking_id    NUMBER        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id   NUMBER        NOT NULL REFERENCES CUSTOMER(customer_id),
    event_type_id NUMBER        NOT NULL REFERENCES EVENT_TYPE(event_type_id),
    package_id    NUMBER        NOT NULL REFERENCES HALL_PACKAGE(package_id),
    start_at      DATE          NOT NULL,
    end_at        DATE          NOT NULL,
    guest_count   NUMBER(5)     NOT NULL CHECK(guest_count > 0),
    status        VARCHAR2(10)  NOT NULL DEFAULT 'PENDING'
                                CHECK(status IN ('PENDING','CONFIRMED','CANCELLED')),
    notes         VARCHAR2(500),
    CONSTRAINT chk_booking_times CHECK(end_at > start_at)
);

CREATE TABLE BOOKING_SERVICE (
    booking_id  NUMBER       NOT NULL REFERENCES BOOKING(booking_id),
    service_id  NUMBER       NOT NULL REFERENCES SERVICE(service_id),
    quantity    NUMBER(4)    NOT NULL CHECK(quantity > 0),
    unit_price  NUMBER(10,2) NOT NULL CHECK(unit_price >= 0),
    CONSTRAINT pk_booking_service PRIMARY KEY(booking_id, service_id)
);

CREATE TABLE PAYMENT (
    payment_id     NUMBER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id     NUMBER         NOT NULL REFERENCES BOOKING(booking_id),
    payment_date   DATE           NOT NULL,
    amount         NUMBER(12,2)   NOT NULL CHECK(amount > 0),
    payment_method VARCHAR2(10)   NOT NULL
                                  CHECK(payment_method IN ('UPI','CASH','CARD','NEFT','CHEQUE')),
    reference_no   VARCHAR2(50)   UNIQUE
);

-- ── VIEWS ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_booking_details AS
    SELECT b.booking_id, c.full_name AS customer_name,
           e.event_name, p.package_name,
           b.start_at, b.end_at, b.guest_count, b.status, b.notes,
           p.base_price
    FROM BOOKING b
    JOIN CUSTOMER    c ON b.customer_id   = c.customer_id
    JOIN EVENT_TYPE  e ON b.event_type_id = e.event_type_id
    JOIN HALL_PACKAGE p ON b.package_id   = p.package_id;

CREATE OR REPLACE VIEW v_payment_summary AS
    SELECT b.booking_id, c.full_name AS customer_name,
           SUM(p.amount) AS total_paid,
           hp.base_price +
               NVL((SELECT SUM(bs.quantity*bs.unit_price)
                    FROM BOOKING_SERVICE bs WHERE bs.booking_id=b.booking_id), 0)
               AS total_amount
    FROM BOOKING b
    JOIN CUSTOMER     c  ON b.customer_id = c.customer_id
    JOIN HALL_PACKAGE hp ON b.package_id  = hp.package_id
    LEFT JOIN PAYMENT p  ON b.booking_id  = p.booking_id
    GROUP BY b.booking_id, c.full_name, hp.base_price;

-- ── STORED PROCEDURE ───────────────────────────────────────────────────────

CREATE OR REPLACE PROCEDURE create_booking(
    p_customer_id   IN NUMBER,
    p_event_type_id IN NUMBER,
    p_package_id    IN NUMBER,
    p_start_at      IN DATE,
    p_end_at        IN DATE,
    p_guest_count   IN NUMBER,
    p_notes         IN VARCHAR2 DEFAULT NULL,
    p_booking_id    OUT NUMBER
) AS
    v_capacity  NUMBER;
    v_overlap   NUMBER;
BEGIN
    -- Validate times
    IF p_end_at <= p_start_at THEN
        RAISE_APPLICATION_ERROR(-20001, 'end_at must be later than start_at');
    END IF;

    -- Check capacity
    SELECT capacity INTO v_capacity FROM HALL_PACKAGE WHERE package_id = p_package_id;
    IF p_guest_count > v_capacity THEN
        RAISE_APPLICATION_ERROR(-20002, 'Guest count exceeds package capacity ' || v_capacity);
    END IF;

    -- Check overlap
    SELECT COUNT(*) INTO v_overlap FROM BOOKING
    WHERE status IN ('PENDING','CONFIRMED')
      AND end_at   > p_start_at
      AND start_at < p_end_at;
    IF v_overlap > 0 THEN
        RAISE_APPLICATION_ERROR(-20003, 'Time slot overlaps an existing active booking');
    END IF;

    INSERT INTO BOOKING(customer_id,event_type_id,package_id,start_at,end_at,guest_count,notes)
    VALUES(p_customer_id,p_event_type_id,p_package_id,p_start_at,p_end_at,p_guest_count,p_notes)
    RETURNING booking_id INTO p_booking_id;

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN ROLLBACK; RAISE;
END create_booking;
/

-- ── FUNCTION ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calc_total_payment(p_booking_id IN NUMBER)
RETURN NUMBER AS
    v_total NUMBER;
BEGIN
    SELECT NVL(SUM(amount),0) INTO v_total FROM PAYMENT WHERE booking_id = p_booking_id;
    RETURN v_total;
EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN 0;
END calc_total_payment;
/

-- ── CURSOR ─────────────────────────────────────────────────────────────────

DECLARE
    CURSOR cur_bookings IS
        SELECT b.booking_id, c.full_name, e.event_name, b.start_at, b.status
        FROM BOOKING b
        JOIN CUSTOMER c    ON b.customer_id   = c.customer_id
        JOIN EVENT_TYPE e  ON b.event_type_id = e.event_type_id
        ORDER BY b.start_at;
BEGIN
    FOR rec IN cur_bookings LOOP
        DBMS_OUTPUT.PUT_LINE(
            rec.booking_id || ' | ' || rec.full_name || ' | ' ||
            rec.event_name || ' | ' || rec.start_at  || ' | ' || rec.status
        );
    END LOOP;
END;
/

-- ── TRIGGER ────────────────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER trg_check_capacity
BEFORE INSERT OR UPDATE ON BOOKING
FOR EACH ROW
DECLARE
    v_capacity NUMBER;
BEGIN
    SELECT capacity INTO v_capacity FROM HALL_PACKAGE WHERE package_id = :NEW.package_id;
    IF :NEW.guest_count > v_capacity THEN
        RAISE_APPLICATION_ERROR(-20010,
            'Guest count ' || :NEW.guest_count ||
            ' exceeds package capacity ' || v_capacity);
    END IF;
END trg_check_capacity;
/

-- ── EXCEPTION HANDLING DEMO ────────────────────────────────────────────────

DECLARE
    v_id NUMBER;
BEGIN
    create_booking(999, 1, 1, SYSDATE, SYSDATE+1/24, 100, 'Test', v_id);
    DBMS_OUTPUT.PUT_LINE('Created booking: ' || v_id);
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('ERROR ' || SQLCODE || ': ' || SQLERRM);
END;
/

