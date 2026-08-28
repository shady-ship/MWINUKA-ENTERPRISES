<?php
declare(strict_types=1);

// Create a Gmail App Password and paste it here. Never use your normal Gmail password.
const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 587;
const SMTP_USERNAME = 'shadrackmwinuka002@gmail.com';
define('SMTP_APP_PASSWORD', getenv('MWINUKA_SMTP_APP_PASSWORD') ?: '');
const RESET_BASE_URL = 'http://localhost/mwinuka/reset-password.html';
