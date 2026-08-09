-- Extra dummy products for testing/demo purposes.
-- Safe to run multiple times: categories are upserted by unique name, and
-- products are only inserted if a product with that exact name doesn't
-- already exist. Requires scripts/000_fresh_install.sql to have been run
-- first (categories/products tables must already exist).

INSERT INTO public.categories (name, description, image_url) VALUES
('Keyboards & Mice', 'Wired and wireless input devices', '/placeholder.svg?height=200&width=200'),
('Laptop Bags & Sleeves', 'Carrying cases and protection for laptops', '/placeholder.svg?height=200&width=200'),
('Smartwatch Accessories', 'Bands, chargers, and cases for smartwatches', '/placeholder.svg?height=200&width=200')
ON CONFLICT (name) DO NOTHING;

WITH category_ids AS (
  SELECT id, name FROM public.categories
),
new_products (product_name, product_description, product_price, original_price, category_name, main_image, product_images, stock, is_featured, specs) AS (
  VALUES
    ('Wireless Mechanical Keyboard', 'Compact 75% layout with hot-swappable switches', 7500.00, 8500.00, 'Keyboards & Mice', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 20, true, '{"switches": "Hot-swappable", "connectivity": "Bluetooth + 2.4GHz", "battery": "4000mAh"}'::jsonb),
    ('Ergonomic Wireless Mouse', 'Vertical design to reduce wrist strain', 2800.00, 3300.00, 'Keyboards & Mice', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 40, false, '{"dpi": "4000", "connectivity": "2.4GHz", "battery_life": "3 months"}'::jsonb),
    ('Silent Click Mouse', 'Noiseless buttons for office use', 1500.00, 1800.00, 'Keyboards & Mice', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 65, false, '{"dpi": "1600", "connectivity": "USB Receiver"}'::jsonb),
    ('15.6" Laptop Sleeve', 'Water-resistant neoprene sleeve', 1400.00, 1700.00, 'Laptop Bags & Sleeves', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 55, true, '{"size": "15.6 inch", "material": "Neoprene", "water_resistant": "Yes"}'::jsonb),
    ('Anti-Theft Laptop Backpack', 'Backpack with USB charging port and hidden zippers', 3800.00, 4500.00, 'Laptop Bags & Sleeves', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 35, true, '{"capacity": "25L", "features": ["USB Charging Port", "Anti-Theft Zippers"]}'::jsonb),
    ('Smartwatch Silicone Band', 'Adjustable replacement band, multiple colors', 900.00, 1100.00, 'Smartwatch Accessories', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 90, false, '{"material": "Silicone", "compatibility": "22mm lugs"}'::jsonb),
    ('Smartwatch Magnetic Charger', 'Portable USB-C magnetic charging puck', 1600.00, 1900.00, 'Smartwatch Accessories', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 50, false, '{"connector": "USB-C", "cable_length": "1m"}'::jsonb),
    ('7-in-1 USB-C Hub', 'HDMI, USB-A, SD card reader, and PD passthrough', 3200.00, 3800.00, 'Chargers & Cables', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 45, true, '{"ports": "HDMI, 3x USB-A, SD, microSD, PD", "compatibility": "USB-C laptops"}'::jsonb),
    ('True Wireless Earbuds', 'Compact earbuds with charging case', 4200.00, 5000.00, 'Headphones & Earbuds', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 60, false, '{"battery": "6 hours + 24h case", "connectivity": "Bluetooth 5.2"}'::jsonb),
    ('10000mAh Slim Power Bank', 'Pocket-sized fast-charging power bank', 2600.00, 3000.00, 'Power Banks', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 70, false, '{"capacity": "10000mAh", "ports": "USB-A, USB-C", "features": ["Fast Charging"]}'::jsonb)
)
INSERT INTO public.products (name, description, price, original_price, category_id, image_url, images, stock_quantity, is_featured, specifications)
SELECT np.product_name, np.product_description, np.product_price, np.original_price, cat.id,
       np.main_image, np.product_images, np.stock, np.is_featured, np.specs
FROM new_products np
JOIN category_ids cat ON cat.name = np.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM public.products p WHERE p.name = np.product_name
);
