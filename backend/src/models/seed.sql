

-- 1. ROLES
 

INSERT INTO roles (name)
VALUES
    ('ADMIN'),
    ('SALES_REP'),
    ('SALES_MANAGER'),
    ('FINANCE'),
    ('CUSTOMER')
ON CONFLICT (name) DO NOTHING;


 
-- 2. USERS

INSERT INTO users (
    name,
    email,
    password_hash,
    role_id
)
VALUES
(
    'Admin User',
    'admin@dealflow.com',
    'TEMP_HASH_ADMIN',
    (SELECT id FROM roles WHERE name = 'ADMIN')
),

(
    'Rahul Sales',
    'rahul@dealflow.com',
    'TEMP_HASH_RAHUL',
    (SELECT id FROM roles WHERE name = 'SALES_REP')
),

(
    'Priya Manager',
    'priya@dealflow.com',
    'TEMP_HASH_PRIYA',
    (SELECT id FROM roles WHERE name = 'SALES_MANAGER')
),

(
    'Arjun Finance',
    'arjun@dealflow.com',
    'TEMP_HASH_ARJUN',
    (SELECT id FROM roles WHERE name = 'FINANCE')
),

(
    'Demo Customer',
    'customer@example.com',
    'TEMP_HASH_CUSTOMER',
    (SELECT id FROM roles WHERE name = 'CUSTOMER')
)
ON CONFLICT (email) DO NOTHING;


 
-- 3. CUSTOMER TIERS

INSERT INTO customer_tiers (
    name,
    default_discount_limit
)
VALUES
    ('BRONZE', 5),
    ('SILVER', 10),
    ('GOLD', 15)
ON CONFLICT (name) DO NOTHING;


 
-- 4. CUSTOMERS
 

INSERT INTO customers (
    name,
    email,
    phone,
    tier_id
)
VALUES

(
    'Acme Technologies',
    'procurement@acmetech.com',
    '+91-9876543210',
    (SELECT id FROM customer_tiers WHERE name = 'GOLD')
),

(
    'Nova Retail',
    'buying@novaretail.com',
    '+91-9876543211',
    (SELECT id FROM customer_tiers WHERE name = 'SILVER')
),

(
    'BlueSky Solutions',
    'sales@bluesky.com',
    '+91-9876543212',
    (SELECT id FROM customer_tiers WHERE name = 'BRONZE')
),

(
    'Demo Customer',
    'demo.customer@example.com',
    '+91-9876543213',
    (SELECT id FROM customer_tiers WHERE name = 'GOLD')
)
ON CONFLICT (email) DO NOTHING;


 
-- 5. PRODUCT CATEGORIES
 

INSERT INTO product_categories (
    name,
    description
)
VALUES
    (
        'HARDWARE',
        'Physical computing and office hardware'
    ),
    (
        'SOFTWARE',
        'Software licenses and applications'
    ),
    (
        'SERVICES',
        'Implementation, consulting and support services'
    ),
    (
        'SUBSCRIPTION',
        'Recurring software and platform subscriptions'
    )
ON CONFLICT (name) DO NOTHING;


 
-- 6. PRODUCTS
 

INSERT INTO products (
    name,
    category_id,
    description,
    unit,
    cost_price,
    selling_price,
    tax_rate
)
VALUES

(
    'Business Laptop Pro',
    (SELECT id FROM product_categories WHERE name = 'HARDWARE'),
    'High-performance business laptop',
    'unit',
    70000,
    100000,
    18
),

(
    'Enterprise Monitor 27"',
    (SELECT id FROM product_categories WHERE name = 'HARDWARE'),
    '27 inch professional monitor',
    'unit',
    18000,
    28000,
    18
),

(
    'Mechanical Keyboard',
    (SELECT id FROM product_categories WHERE name = 'HARDWARE'),
    'Professional mechanical keyboard',
    'unit',
    5000,
    8000,
    18
),

(
    'CRM Enterprise License',
    (SELECT id FROM product_categories WHERE name = 'SOFTWARE'),
    'Enterprise CRM software license',
    'license',
    25000,
    50000,
    18
),

(
    'Implementation Service',
    (SELECT id FROM product_categories WHERE name = 'SERVICES'),
    'CRM implementation and setup',
    'hour',
    2500,
    5000,
    18
),

(
    'Premium Support',
    (SELECT id FROM product_categories WHERE name = 'SERVICES'),
    'Premium technical support',
    'hour',
    1500,
    3500,
    18
),

(
    'CRM Pro Monthly',
    (SELECT id FROM product_categories WHERE name = 'SUBSCRIPTION'),
    'CRM Pro monthly subscription',
    'month',
    2000,
    5000,
    18
),

(
    'CRM Pro Annual',
    (SELECT id FROM product_categories WHERE name = 'SUBSCRIPTION'),
    'CRM Pro annual subscription',
    'year',
    20000,
    50000,
    18
)
ON CONFLICT DO NOTHING;


 
-- 7. DISCOUNT RULES
 

-- GOLD
-- Hardware       -> 15%
-- Software       -> 15%
-- Services       -> 10%
-- Subscription   -> 15%

INSERT INTO discount_rules (
    customer_tier_id,
    product_category_id,
    max_discount_percent
)
VALUES

(
    (SELECT id FROM customer_tiers WHERE name = 'GOLD'),
    (SELECT id FROM product_categories WHERE name = 'HARDWARE'),
    15
),

(
    (SELECT id FROM customer_tiers WHERE name = 'GOLD'),
    (SELECT id FROM product_categories WHERE name = 'SOFTWARE'),
    15
),

(
    (SELECT id FROM customer_tiers WHERE name = 'GOLD'),
    (SELECT id FROM product_categories WHERE name = 'SERVICES'),
    10
),

(
    (SELECT id FROM customer_tiers WHERE name = 'GOLD'),
    (SELECT id FROM product_categories WHERE name = 'SUBSCRIPTION'),
    15
)

ON CONFLICT (
    customer_tier_id,
    product_category_id
)
DO NOTHING;


-- SILVER
-- Hardware       -> 10%
-- Software       -> 10%
-- Services       -> 8%
-- Subscription   -> 10%

INSERT INTO discount_rules (
    customer_tier_id,
    product_category_id,
    max_discount_percent
)
VALUES

(
    (SELECT id FROM customer_tiers WHERE name = 'SILVER'),
    (SELECT id FROM product_categories WHERE name = 'HARDWARE'),
    10
),

(
    (SELECT id FROM customer_tiers WHERE name = 'SILVER'),
    (SELECT id FROM product_categories WHERE name = 'SOFTWARE'),
    10
),

(
    (SELECT id FROM customer_tiers WHERE name = 'SILVER'),
    (SELECT id FROM product_categories WHERE name = 'SERVICES'),
    8
),

(
    (SELECT id FROM customer_tiers WHERE name = 'SILVER'),
    (SELECT id FROM product_categories WHERE name = 'SUBSCRIPTION'),
    10
)

ON CONFLICT (
    customer_tier_id,
    product_category_id
)
DO NOTHING;


-- BRONZE
-- Hardware       -> 5%
-- Software       -> 5%
-- Services       -> 5%
-- Subscription   -> 5%

INSERT INTO discount_rules (
    customer_tier_id,
    product_category_id,
    max_discount_percent
)
VALUES

(
    (SELECT id FROM customer_tiers WHERE name = 'BRONZE'),
    (SELECT id FROM product_categories WHERE name = 'HARDWARE'),
    5
),

(
    (SELECT id FROM customer_tiers WHERE name = 'BRONZE'),
    (SELECT id FROM product_categories WHERE name = 'SOFTWARE'),
    5
),

(
    (SELECT id FROM customer_tiers WHERE name = 'BRONZE'),
    (SELECT id FROM product_categories WHERE name = 'SERVICES'),
    5
),

(
    (SELECT id FROM customer_tiers WHERE name = 'BRONZE'),
    (SELECT id FROM product_categories WHERE name = 'SUBSCRIPTION'),
    5
)

ON CONFLICT (
    customer_tier_id,
    product_category_id
)
DO NOTHING;


 
-- 8. APPROVAL RULES
 

INSERT INTO approval_rules (
    min_risk_score,
    max_risk_score,
    required_level
)
VALUES
    (0, 20, 'NONE'),
    (20.01, 50, 'MANAGER'),
    (50.01, 100, 'MANAGER_FINANCE')
ON CONFLICT DO NOTHING;









