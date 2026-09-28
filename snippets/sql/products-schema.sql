PRAGMA foreign_keys = ON;

CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE
        CHECK (length(trim(name)) BETWEEN 2 AND 80)
);

CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL
        CHECK (length(trim(name)) BETWEEN 2 AND 120),
    price_cents INTEGER NOT NULL
        CHECK (price_cents >= 0),
    stock INTEGER NOT NULL DEFAULT 0
        CHECK (stock >= 0),
    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_products_category_active_name
    ON products (category_id, active, name);

CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    quantity_delta INTEGER NOT NULL
        CHECK (quantity_delta <> 0),
    reason TEXT NOT NULL
        CHECK (length(trim(reason)) BETWEEN 2 AND 80),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_stock_movements_product_created
    ON stock_movements (product_id, created_at);
