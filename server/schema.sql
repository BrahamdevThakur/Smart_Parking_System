-- ============================================================
-- Smart Parking Management System - Database Schema + Seed
-- ============================================================

-- Drop tables in reverse dependency order (for re-runs)
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS parking_slots CASCADE;
DROP TABLE IF EXISTS parking_lots CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS vehicle_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Vehicle Types
CREATE TABLE vehicle_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(30) NOT NULL UNIQUE
);

-- Users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles
CREATE TABLE vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    type_id INT REFERENCES vehicle_types(type_id),
    plate_number VARCHAR(20) NOT NULL UNIQUE
);

-- Parking Lots
CREATE TABLE parking_lots (
    lot_id SERIAL PRIMARY KEY,
    lot_name VARCHAR(100) NOT NULL,
    total_capacity INT NOT NULL CHECK (total_capacity > 0),
    base_rate DECIMAL(6,2) NOT NULL
);

-- Parking Slots
CREATE TABLE parking_slots (
    slot_id SERIAL PRIMARY KEY,
    lot_id INT REFERENCES parking_lots(lot_id) ON DELETE CASCADE,
    slot_number VARCHAR(10) NOT NULL,
    is_occupied BOOLEAN DEFAULT FALSE,
    UNIQUE (lot_id, slot_number)
);

-- Reservations
CREATE TABLE reservations (
    reservation_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    slot_id INT REFERENCES parking_slots(slot_id),
    vehicle_id INT REFERENCES vehicles(vehicle_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_time CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_reservations_slot_time ON reservations(slot_id, start_time, end_time);
CREATE INDEX idx_reservations_user ON reservations(user_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Vehicle Types
INSERT INTO vehicle_types (type_name) VALUES
    ('Car'),
    ('Motorcycle'),
    ('Truck'),
    ('Van'),
    ('Electric Vehicle');

-- Parking Lots
INSERT INTO parking_lots (lot_name, total_capacity, base_rate) VALUES
    ('Central Plaza Parking', 20, 2.50),
    ('North Wing Garage',     16, 1.75),
    ('East Market Lot',       12, 3.00),
    ('Airport Express Park',  24, 5.00);

-- Parking Slots - Central Plaza (Lot 1, 20 slots)
INSERT INTO parking_slots (lot_id, slot_number) VALUES
    (1,'S01'),(1,'S02'),(1,'S03'),(1,'S04'),(1,'S05'),
    (1,'S06'),(1,'S07'),(1,'S08'),(1,'S09'),(1,'S10'),
    (1,'S11'),(1,'S12'),(1,'S13'),(1,'S14'),(1,'S15'),
    (1,'S16'),(1,'S17'),(1,'S18'),(1,'S19'),(1,'S20');

-- Parking Slots - North Wing (Lot 2, 16 slots)
INSERT INTO parking_slots (lot_id, slot_number) VALUES
    (2,'A01'),(2,'A02'),(2,'A03'),(2,'A04'),
    (2,'A05'),(2,'A06'),(2,'A07'),(2,'A08'),
    (2,'B01'),(2,'B02'),(2,'B03'),(2,'B04'),
    (2,'B05'),(2,'B06'),(2,'B07'),(2,'B08');

-- Parking Slots - East Market (Lot 3, 12 slots)
INSERT INTO parking_slots (lot_id, slot_number) VALUES
    (3,'E01'),(3,'E02'),(3,'E03'),(3,'E04'),
    (3,'E05'),(3,'E06'),(3,'E07'),(3,'E08'),
    (3,'E09'),(3,'E10'),(3,'E11'),(3,'E12');

-- Parking Slots - Airport (Lot 4, 24 slots)
INSERT INTO parking_slots (lot_id, slot_number) VALUES
    (4,'P01'),(4,'P02'),(4,'P03'),(4,'P04'),(4,'P05'),(4,'P06'),
    (4,'P07'),(4,'P08'),(4,'P09'),(4,'P10'),(4,'P11'),(4,'P12'),
    (4,'P13'),(4,'P14'),(4,'P15'),(4,'P16'),(4,'P17'),(4,'P18'),
    (4,'P19'),(4,'P20'),(4,'P21'),(4,'P22'),(4,'P23'),(4,'P24');

-- Demo admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, is_admin) VALUES
    ('admin@parkingsystem.com',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBAQOlyASKkB7i',
     'System Administrator',
     TRUE);

-- Confirmation
SELECT 'Schema and seed data loaded successfully!' AS status;
SELECT 'Vehicle types: ' || COUNT(*) FROM vehicle_types;
SELECT 'Parking lots: ' || COUNT(*) FROM parking_lots;
SELECT 'Parking slots: ' || COUNT(*) FROM parking_slots;
