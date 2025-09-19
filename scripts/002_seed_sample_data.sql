-- Insert sample categories
INSERT INTO public.categories (name, description, image_url) VALUES
('Phone Cases', 'Protective cases for smartphones', '/placeholder.svg?height=200&width=200'),
('Chargers & Cables', 'Charging solutions and cables', '/placeholder.svg?height=200&width=200'),
('Headphones & Earbuds', 'Audio accessories and headphones', '/placeholder.svg?height=200&width=200'),
('Screen Protectors', 'Screen protection for devices', '/placeholder.svg?height=200&width=200'),
('Power Banks', 'Portable charging solutions', '/placeholder.svg?height=200&width=200'),
('Phone Stands & Mounts', 'Device holders and mounts', '/placeholder.svg?height=200&width=200')
ON CONFLICT (name) DO NOTHING;

-- Insert sample products
WITH category_ids AS (
  SELECT id, name FROM public.categories
)
INSERT INTO public.products (name, description, price, original_price, category_id, image_url, images, stock_quantity, is_featured, specifications) 
SELECT 
  product_name,
  product_description,
  product_price,
  original_price,
  cat.id,
  main_image,
  product_images,
  stock,
  is_featured,
  specs
FROM (
  VALUES 
    ('iPhone 15 Pro Clear Case', 'Premium transparent case with MagSafe compatibility', 2500.00, 3000.00, 'Phone Cases', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400', '/placeholder.svg?height=400&width=400'], 50, true, '{"material": "TPU", "compatibility": "iPhone 15 Pro", "features": ["MagSafe", "Drop Protection"]}'),
    ('Samsung Galaxy S24 Leather Case', 'Genuine leather case with card slots', 3200.00, 3800.00, 'Phone Cases', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 30, true, '{"material": "Genuine Leather", "compatibility": "Samsung Galaxy S24", "features": ["Card Slots", "Premium Feel"]}'),
    ('USB-C Fast Charger 65W', 'High-speed charging adapter with USB-C', 1800.00, 2200.00, 'Chargers & Cables', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 75, true, '{"power": "65W", "ports": "USB-C", "features": ["Fast Charging", "Compact Design"]}'),
    ('Lightning to USB-C Cable 2m', 'Durable braided cable for Apple devices', 1200.00, 1500.00, 'Chargers & Cables', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 100, false, '{"length": "2m", "material": "Braided Nylon", "compatibility": "iPhone, iPad"}'),
    ('Wireless Bluetooth Earbuds Pro', 'Premium earbuds with noise cancellation', 8500.00, 10000.00, 'Headphones & Earbuds', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400', '/placeholder.svg?height=400&width=400'], 25, true, '{"battery": "8 hours + 24h case", "features": ["ANC", "Wireless Charging", "IPX4"]}'),
    ('Gaming Headset RGB', 'Professional gaming headset with RGB lighting', 6500.00, 7500.00, 'Headphones & Earbuds', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 40, false, '{"connectivity": "USB + 3.5mm", "features": ["RGB Lighting", "Surround Sound", "Noise Cancelling Mic"]}'),
    ('Tempered Glass Screen Protector', '9H hardness screen protection', 800.00, 1000.00, 'Screen Protectors', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 200, false, '{"hardness": "9H", "thickness": "0.33mm", "features": ["Anti-Fingerprint", "Easy Installation"]}'),
    ('20000mAh Power Bank', 'High-capacity portable charger with fast charging', 4500.00, 5200.00, 'Power Banks', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 60, true, '{"capacity": "20000mAh", "ports": "2x USB-A, 1x USB-C", "features": ["Fast Charging", "LED Display"]}'),
    ('Adjustable Phone Stand', 'Foldable desktop stand for phones and tablets', 1500.00, 1800.00, 'Phone Stands & Mounts', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 80, false, '{"material": "Aluminum Alloy", "compatibility": "4-12 inch devices", "features": ["Adjustable Angle", "Foldable"]}'),
    ('Car Phone Mount Magnetic', 'Strong magnetic car mount for dashboard', 2200.00, 2600.00, 'Phone Stands & Mounts', '/placeholder.svg?height=400&width=400', ARRAY['/placeholder.svg?height=400&width=400'], 45, false, '{"mount_type": "Dashboard/Windshield", "features": ["360° Rotation", "Strong Magnets", "One-Hand Operation"]}')
) AS products(product_name, product_description, product_price, original_price, category_name, main_image, product_images, stock, is_featured, specs)
JOIN category_ids cat ON cat.name = products.category_name;
