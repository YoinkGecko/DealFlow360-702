CREATE EXTENSION IF NOT EXISTS pgcrypto;


--  
-- 1. ROLES
--  

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE
);


--  
-- 2. USERS
--  

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id UUID NOT NULL
        REFERENCES roles(id)
        ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


--  
-- 3. CUSTOMER TIERS
--  

CREATE TABLE customer_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    default_discount_limit NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_tier_discount_check
        CHECK (
            default_discount_limit >= 0
            AND default_discount_limit <= 100
        )
);


--  
-- 4. CUSTOMERS
--  

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    tier_id UUID NOT NULL
        REFERENCES customer_tiers(id)
        ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--  
-- 5. PRODUCT CATEGORIES
--  

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


--  
-- 6. PRODUCTS
--  

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    category_id UUID NOT NULL
        REFERENCES product_categories(id)
        ON DELETE RESTRICT,
    description TEXT,
    unit VARCHAR(30) NOT NULL DEFAULT 'unit',
    cost_price NUMERIC(12,2) NOT NULL,
    selling_price NUMERIC(12,2) NOT NULL,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT product_cost_check
        CHECK (cost_price >= 0),

    CONSTRAINT product_selling_price_check
        CHECK (selling_price >= 0),

    CONSTRAINT product_tax_check
        CHECK (
            tax_rate >= 0
            AND tax_rate <= 100
        )
);


--  
-- 7. DISCOUNT RULES
--  

CREATE TABLE discount_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_tier_id UUID NOT NULL
        REFERENCES customer_tiers(id)
        ON DELETE CASCADE,
    product_category_id UUID NOT NULL
        REFERENCES product_categories(id)
        ON DELETE CASCADE,
    max_discount_percent NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT discount_rule_percent_check
        CHECK (
            max_discount_percent >= 0
            AND max_discount_percent <= 100
        ),
    CONSTRAINT unique_discount_rule
        UNIQUE (
            customer_tier_id,
            product_category_id
        )
);


--  
-- 8. APPROVAL RULES
--  

CREATE TYPE approval_chain AS ENUM (
    'NONE',
    'MANAGER',
    'MANAGER_FINANCE'
);


CREATE TABLE approval_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_risk_score NUMERIC(5,2) NOT NULL,
    max_risk_score NUMERIC(5,2) NOT NULL,
    required_level approval_chain NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT approval_risk_range_check
        CHECK (
            min_risk_score >= 0
            AND max_risk_score <= 100
            AND min_risk_score <= max_risk_score
        )
);


--  
-- 9. QUOTATIONS
--  

CREATE TYPE quotation_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'SENT',
    'UNDER_NEGOTIATION',
    'CONFIRMED',
    'FULFILLMENT',
    'COMPLETED',
    'CANCELLED'
);


CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL
        REFERENCES customers(id)
        ON DELETE RESTRICT,
    sales_rep_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,
    status quotation_status NOT NULL DEFAULT 'DRAFT',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    margin_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    risk_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT quotation_subtotal_check
        CHECK (subtotal >= 0),

    CONSTRAINT quotation_discount_check
        CHECK (discount_amount >= 0),

    CONSTRAINT quotation_total_check
        CHECK (total_amount >= 0),

    CONSTRAINT quotation_cost_check
        CHECK (total_cost >= 0),

    CONSTRAINT quotation_risk_check
        CHECK (
            risk_score >= 0
            AND risk_score <= 100
        )
);


--  
-- 10. QUOTATION ITEMS
--  

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL
        REFERENCES quotations(id)
        ON DELETE CASCADE,
    product_id UUID NOT NULL
        REFERENCES products(id)
        ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12,2) NOT NULL,
    line_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_margin NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT quotation_item_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT quotation_item_price_check
        CHECK (unit_price >= 0),

    CONSTRAINT quotation_item_discount_check
        CHECK (
            discount_percent >= 0
            AND discount_percent <= 100
        ),
    CONSTRAINT quotation_item_cost_check
        CHECK (unit_cost >= 0)
);


--  
-- 11. APPROVAL REQUESTS
--  

CREATE TYPE approval_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'REVISION_REQUIRED'
);


CREATE TYPE approval_level AS ENUM (
    'SALES_MANAGER',
    'FINANCE'
);


CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL
        REFERENCES quotations(id)
        ON DELETE CASCADE,
    level approval_level NOT NULL,
    sequence_no INTEGER NOT NULL,
    approver_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,
    status approval_status NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acted_at TIMESTAMPTZ,
    reason TEXT
);


--  
-- 12. APPROVAL LOGS
--  

CREATE TYPE approval_action AS ENUM (
    'APPROVED',
    'REJECTED',
    'RETURNED_FOR_REVISION'
);


CREATE TABLE approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL
        REFERENCES quotations(id)
        ON DELETE CASCADE,
    approval_request_id UUID
        REFERENCES approval_requests(id)
        ON DELETE SET NULL,
    user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,
    action approval_action NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


--  
-- INDEXES
--  

CREATE INDEX idx_users_role_id
    ON users(role_id);

CREATE INDEX idx_customers_tier_id
    ON customers(tier_id);

CREATE INDEX idx_products_category_id
    ON products(category_id);

CREATE INDEX idx_discount_rules_tier_category
    ON discount_rules(customer_tier_id, product_category_id);

CREATE INDEX idx_quotations_customer_id
    ON quotations(customer_id);

CREATE INDEX idx_quotations_sales_rep_id
    ON quotations(sales_rep_id);

CREATE INDEX idx_quotations_status
    ON quotations(status);

CREATE INDEX idx_quotation_items_quotation_id
    ON quotation_items(quotation_id);

CREATE INDEX idx_approval_requests_quotation_id
    ON approval_requests(quotation_id);

CREATE INDEX idx_approval_requests_status
    ON approval_requests(status);

CREATE INDEX idx_approval_requests_approver_id
    ON approval_requests(approver_id);

CREATE INDEX idx_approval_logs_quotation_id
    ON approval_logs(quotation_id);