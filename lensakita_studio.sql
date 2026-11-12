-- =====================================================
-- Database LensaKita Studio untuk XAMPP (MySQL/MariaDB)
-- Cara pakai: phpMyAdmin > tab Import > pilih file ini > Go
-- =====================================================

CREATE DATABASE IF NOT EXISTS lensakita_studio
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lensakita_studio;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS messages, payments, bookings, packages, portfolio, services, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- Pengguna (admin & pelanggan) ----------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(120) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','pelanggan') NOT NULL DEFAULT 'pelanggan',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- Layanan ----------
CREATE TABLE services (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    ENUM('wisuda','umkm','acara','video') NOT NULL,
  description TEXT NULL,
  image_url   VARCHAR(255) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- Paket (3 pilihan per layanan) ----------
CREATE TABLE packages (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_id INT UNSIGNED NOT NULL,
  name       VARCHAR(50) NOT NULL,
  price      DECIMAL(12,0) NOT NULL,
  features   TEXT NULL COMMENT 'satu fasilitas per baris',
  sort_order TINYINT NOT NULL DEFAULT 1,
  CONSTRAINT fk_pkg_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Portofolio ----------
CREATE TABLE portfolio (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title     VARCHAR(120) NOT NULL,
  category  ENUM('wisuda','umkm','acara','video') NOT NULL,
  image_url VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- ---------- Pemesanan ----------
CREATE TABLE bookings (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(20) NOT NULL UNIQUE,
  user_id      INT UNSIGNED NOT NULL,
  package_id   INT UNSIGNED NOT NULL,
  event_date   DATE NOT NULL,
  event_time   TIME NULL,
  location     VARCHAR(200) NULL,
  notes        TEXT NULL,
  total        DECIMAL(12,0) NOT NULL,
  status       ENUM('menunggu','dikonfirmasi','diproses','selesai','dibatalkan') NOT NULL DEFAULT 'menunggu',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bk_user FOREIGN KEY (user_id)    REFERENCES users(id),
  CONSTRAINT fk_bk_pkg  FOREIGN KEY (package_id) REFERENCES packages(id),
  INDEX idx_bk_status (status),
  INDEX idx_bk_date (event_date)
) ENGINE=InnoDB;

-- ---------- Pembayaran / transaksi ----------
CREATE TABLE payments (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      VARCHAR(50) NOT NULL UNIQUE COMMENT 'order_id untuk Midtrans',
  booking_id    INT UNSIGNED NOT NULL,
  method        VARCHAR(30) NULL,
  amount        DECIMAL(12,0) NOT NULL,
  status        ENUM('pending','berhasil','gagal','kedaluwarsa') NOT NULL DEFAULT 'pending',
  midtrans_ref  VARCHAR(100) NULL,
  paid_at       DATETIME NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_pay_status (status)
) ENGINE=InnoDB;

-- ---------- Pesan dari form kontak ----------
CREATE TABLE messages (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(120) NOT NULL,
  message    TEXT NOT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- DATA AWAL
-- =====================================================

-- Password demo di-hash SHA-256 agar tidak tersimpan apa adanya.
-- Untuk produksi, ganti dengan password_hash() PHP (bcrypt) dan cek dengan password_verify().
INSERT INTO users (name, username, email, phone, password_hash, role) VALUES
('Administrator', 'admin',     'admin@lensakita.test',     '081200001234', SHA2('admin123', 256), 'admin'),
('Pelanggan Demo','pelanggan', 'pelanggan@lensakita.test', '081200005678', SHA2('user123', 256),  'pelanggan');

INSERT INTO services (id, name, category, description, image_url) VALUES
(1, 'Foto Wisuda',        'wisuda', 'Sesi foto wisuda individu, keluarga, dan teman.',            'https://picsum.photos/seed/wisuda/600/450'),
(2, 'Foto Produk UMKM',   'umkm',   'Foto produk bersih dan menarik untuk marketplace dan sosmed.','https://picsum.photos/seed/produk/600/450'),
(3, 'Dokumentasi Acara',  'acara',  'Liputan foto seminar, ulang tahun, dan acara komunitas.',    'https://picsum.photos/seed/acara/600/450'),
(4, 'Video Promosi',      'video',  'Video pendek promosi bisnis untuk Reels, TikTok, dan YouTube.','https://picsum.photos/seed/video/600/450');

INSERT INTO packages (service_id, name, price, features, sort_order) VALUES
(1,'Basic',    350000,  'Durasi 1 jam\n1 fotografer\n20 foto edit\nSoftfile via Google Drive', 1),
(1,'Standard', 600000,  'Durasi 2 jam\n1 fotografer\n40 foto edit\nSoftfile via Google Drive\n1 cetak 10R', 2),
(1,'Premium',  1000000, 'Durasi 3 jam\n2 fotografer\n80 foto edit\nSoftfile via Google Drive\n3 cetak 10R + album mini', 3),
(2,'Basic',    300000,  '10 foto produk\nBackground polos\nSoftfile', 1),
(2,'Standard', 600000,  '25 foto produk\nBackground polos + styling\nSoftfile', 2),
(2,'Premium',  1200000, '50 foto produk\nStyling lengkap\nSoftfile + retouch detail', 3),
(3,'Basic',    750000,  'Durasi 2 jam\n1 fotografer\n50 foto edit', 1),
(3,'Standard', 1500000, 'Durasi 4 jam\n1 fotografer\n100 foto edit\nHighlight video 30 detik', 2),
(3,'Premium',  2800000, 'Durasi 8 jam\n2 fotografer\n250 foto edit\nHighlight video 1 menit', 3),
(4,'Basic',    900000,  '1 video 30 detik\nEditing dasar\nMusik bebas royalti', 1),
(4,'Standard', 1800000, '1 video 60 detik\nEditing + motion text\nVoice over', 2),
(4,'Premium',  3500000, '2 video 60 detik\nEditing lengkap\nSkrip + voice over\nRevisi 2x', 3);

INSERT INTO portfolio (title, category, image_url) VALUES
('Wisuda Universitas',   'wisuda', 'https://picsum.photos/seed/p1/600/450'),
('Wisuda Keluarga',      'wisuda', 'https://picsum.photos/seed/p2/600/450'),
('Foto Produk Kopi',     'umkm',   'https://picsum.photos/seed/p3/600/450'),
('Foto Produk Fashion',  'umkm',   'https://picsum.photos/seed/p4/600/450'),
('Seminar Nasional',     'acara',  'https://picsum.photos/seed/p5/600/450'),
('Ulang Tahun',          'acara',  'https://picsum.photos/seed/p6/600/450'),
('Video Promo Kedai',    'video',  'https://picsum.photos/seed/p7/600/450'),
('Video Profil Usaha',   'video',  'https://picsum.photos/seed/p8/600/450');

-- Contoh pemesanan & pembayaran
INSERT INTO bookings (booking_code, user_id, package_id, event_date, event_time, location, notes, total, status) VALUES
('BK-20261101-001', 2, 2, '2026-12-05', '09:00:00', 'Auditorium Kampus, Tangerang Selatan', 'Wisuda periode Desember', 600000, 'dikonfirmasi');

INSERT INTO payments (order_id, booking_id, method, amount, status, paid_at) VALUES
('ORD-20261101-001', 1, 'QRIS', 600000, 'berhasil', NOW());

INSERT INTO messages (name, email, message) VALUES
('Budi', 'budi@example.com', 'Apakah bisa memesan foto wisuda untuk 5 orang sekaligus?');
