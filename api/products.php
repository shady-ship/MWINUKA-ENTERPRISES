<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

try {
    $db = database();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $products = $db->query(
            'SELECT id, name, sku, category, quantity, reorder_level AS reorder, icon
             FROM products ORDER BY created_at DESC, id DESC'
        )->fetchAll();
        jsonResponse($products);
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
        $name = trim((string) ($input['name'] ?? ''));
        $sku = trim((string) ($input['sku'] ?? ''));
        $category = 'General';
        $quantity = filter_var($input['quantity'] ?? null, FILTER_VALIDATE_INT);
        $reorder = filter_var($input['reorder'] ?? null, FILTER_VALIDATE_INT);

        if ($name === '' || $sku === '' || $quantity === false || $quantity < 0 || $reorder === false || $reorder < 0) {
            jsonResponse(['error' => 'Product details are invalid.'], 422);
        }

        $statement = $db->prepare(
            'INSERT INTO products (name, sku, category, quantity, reorder_level)
             VALUES (:name, :sku, :category, :quantity, :reorder)'
        );
        $statement->execute([
            'name' => $name,
            'sku' => $sku,
            'category' => $category,
            'quantity' => $quantity,
            'reorder' => $reorder,
        ]);
        $productId = (int) $db->lastInsertId();

        $activity = $db->prepare(
            'INSERT INTO inventory_activity (product_id, action, quantity_change, description)
             VALUES (:product_id, :action, :quantity_change, :description)'
        );
        $activity->execute([
            'product_id' => $productId,
            'action' => 'New product added',
            'quantity_change' => $quantity,
            'description' => $name,
        ]);

        jsonResponse(['id' => $productId], 201);
    }

    jsonResponse(['error' => 'Method not allowed.'], 405);
} catch (JsonException) {
    jsonResponse(['error' => 'Request body must be valid JSON.'], 400);
} catch (PDOException $exception) {
    error_log($exception->getMessage());
    jsonResponse(['error' => 'Database request failed. Check the MySQL configuration.'], 500);
}
