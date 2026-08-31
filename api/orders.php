<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

try {
    $db = database();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $orders = $db->query(
            'SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.customer_email, 
                    o.total_amount, o.status, o.created_at,
                    COUNT(oi.id) as item_count
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             GROUP BY o.id
             ORDER BY o.created_at DESC'
        )->fetchAll();
        jsonResponse($orders);
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
        
        $customer_name = trim((string) ($input['customer_name'] ?? ''));
        $customer_phone = trim((string) ($input['customer_phone'] ?? ''));
        $customer_email = trim((string) ($input['customer_email'] ?? ''));
        $items = $input['items'] ?? [];
        $notes = trim((string) ($input['notes'] ?? ''));

        if ($customer_name === '' || $customer_phone === '' || empty($items)) {
            jsonResponse(['error' => 'Order details are invalid.'], 422);
        }

        // Generate order number
        $order_number = 'ORD-' . date('YmdHis') . '-' . mt_rand(1000, 9999);
        $total_amount = 0;

        // Validate items and calculate total
        foreach ($items as $item) {
            $product_id = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);
            $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
            
            if ($product_id === false || $quantity === false || $quantity <= 0) {
                jsonResponse(['error' => 'Invalid order item details.'], 422);
            }

            // Get product details
            $product = $db->prepare('SELECT id, quantity, name FROM products WHERE id = :id')
                ->execute([':id' => $product_id])
                ->fetch();

            if (!$product) {
                jsonResponse(['error' => 'Product not found.'], 404);
            }

            if ($product['quantity'] < $quantity) {
                jsonResponse(['error' => "Insufficient stock for {$product['name']}."], 422);
            }
        }

        // Start transaction
        $db->beginTransaction();

        try {
            // Insert order
            $order_stmt = $db->prepare(
                'INSERT INTO orders (order_number, customer_name, customer_phone, customer_email, total_amount, notes)
                 VALUES (:order_number, :customer_name, :customer_phone, :customer_email, :total_amount, :notes)'
            );
            
            $order_stmt->execute([
                ':order_number' => $order_number,
                ':customer_name' => $customer_name,
                ':customer_phone' => $customer_phone,
                ':customer_email' => $customer_email,
                ':total_amount' => $total_amount,
                ':notes' => $notes
            ]);
            
            $order_id = (int) $db->lastInsertId();

            // Insert order items and update inventory
            $item_stmt = $db->prepare(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
                 VALUES (:order_id, :product_id, :quantity, :unit_price, :subtotal)'
            );

            $update_inventory = $db->prepare(
                'UPDATE products SET quantity = quantity - :quantity WHERE id = :product_id'
            );

            $log_activity = $db->prepare(
                'INSERT INTO inventory_activity (product_id, action, quantity_change, description)
                 VALUES (:product_id, :action, :quantity_change, :description)'
            );

            foreach ($items as $item) {
                $product_id = $item['product_id'];
                $quantity = $item['quantity'];
                $unit_price = (float) ($item['unit_price'] ?? 0);
                $subtotal = $quantity * $unit_price;
                $total_amount += $subtotal;

                // Get product name
                $product = $db->prepare('SELECT name FROM products WHERE id = :id')
                    ->execute([':id' => $product_id])
                    ->fetch();

                // Insert order item
                $item_stmt->execute([
                    ':order_id' => $order_id,
                    ':product_id' => $product_id,
                    ':quantity' => $quantity,
                    ':unit_price' => $unit_price,
                    ':subtotal' => $subtotal
                ]);

                // Update inventory
                $update_inventory->execute([
                    ':quantity' => $quantity,
                    ':product_id' => $product_id
                ]);

                // Log activity
                $log_activity->execute([
                    ':product_id' => $product_id,
                    ':action' => 'Order placed',
                    ':quantity_change' => -$quantity,
                    ':description' => "Order {$order_number}: {$product['name']} -$quantity units"
                ]);
            }

            // Update order total
            $db->prepare('UPDATE orders SET total_amount = :total WHERE id = :id')
                ->execute([':total' => $total_amount, ':id' => $order_id]);

            $db->commit();

            jsonResponse(['success' => true, 'order_id' => $order_id, 'order_number' => $order_number]);

        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
        $order_id = filter_var($input['order_id'] ?? null, FILTER_VALIDATE_INT);
        $status = $input['status'] ?? '';

        if ($order_id === false || !in_array($status, ['pending', 'processing', 'completed', 'cancelled'])) {
            jsonResponse(['error' => 'Invalid order ID or status.'], 422);
        }

        $db->prepare('UPDATE orders SET status = :status WHERE id = :id')
            ->execute([':status' => $status, ':id' => $order_id]);

        jsonResponse(['success' => true, 'message' => 'Order status updated.']);
    }

    jsonResponse(['error' => 'Invalid request method.'], 405);

} catch (Exception $e) {
    jsonResponse(['error' => $e->getMessage()], 500);
}
