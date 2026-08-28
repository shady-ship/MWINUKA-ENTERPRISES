CREATE DATABASE IF NOT EXISTS mwinuka_enterprises
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mwinuka_enterprises;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 0,
  reorder_level INT UNSIGNED NOT NULL DEFAULT 0,
  icon VARCHAR(10) NOT NULL DEFAULT '□',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_activity (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  quantity_change INT NOT NULL DEFAULT 0,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO products (name, sku, category, quantity, reorder_level, icon) VALUES
  ('Coca-Cola 500ml', 'BEV-024', 'Beverages', 248, 50, '◉'),
  ('Azam Energy Drink', 'BEV-018', 'Beverages', 24, 50, '◒'),
  ('Samsung 55" TV', 'ELC-009', 'Electronics', 12, 10, '▣'),
  ('Sunlight Dishwashing', 'HOU-031', 'Household', 8, 20, '✦'),
  ('Golden Penny Flour 2kg', 'FOD-012', 'Food', 0, 15, '◆'),
  ('Kilimanjaro Water 1.5L', 'BEV-041', 'Beverages', 86, 30, '◌');

