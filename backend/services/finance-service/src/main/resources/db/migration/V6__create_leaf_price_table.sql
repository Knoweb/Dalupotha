CREATE TABLE leaf_price (
    price_id UUID PRIMARY KEY,
    price_per_kg DECIMAL(12, 2) NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed an initial price
INSERT INTO leaf_price (price_id, price_per_kg, is_active) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 240.00, TRUE);
