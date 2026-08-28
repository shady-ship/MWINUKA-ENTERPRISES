<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/email-config.php';

try {
    $input = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['error' => 'Enter a valid email address.'], 422);
    }

    if (SMTP_APP_PASSWORD === '') {
        jsonResponse(['error' => 'Email delivery is not configured yet. Add a Gmail App Password in api/email-config.php.'], 503);
    }

    $db = database();
    $user = $db->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $user->execute(['email' => $email]);
    $account = $user->fetch();
    $message = 'If that account exists, a password reset link has been sent.';

    if ($account) {
        $token = bin2hex(random_bytes(32));
        $statement = $db->prepare(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES (:user_id, :token_hash, DATE_ADD(NOW(), INTERVAL 1 HOUR))'
        );
        $statement->execute([
            'user_id' => $account['id'],
            'token_hash' => hash('sha256', $token),
        ]);
        $resetUrl = RESET_BASE_URL . '?token=' . urlencode($token);
        $headers = "From: " . SMTP_USERNAME . "\r\nContent-Type: text/plain; charset=UTF-8";
        mail($email, 'Mwinuka Enterprises password reset', "Reset your password using this link:\n\n" . $resetUrl, $headers);
    }

    jsonResponse(['message' => $message]);
} catch (JsonException) {
    jsonResponse(['error' => 'Request body must be valid JSON.'], 400);
} catch (Throwable $exception) {
    error_log($exception->getMessage());
    jsonResponse(['error' => 'Unable to process the password reset request.'], 500);
}
