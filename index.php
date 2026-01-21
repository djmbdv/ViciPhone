<?php
// Thin front-controller so DigitalOcean detects a PHP app and forwards to the existing Source entrypoint.
require __DIR__ . '/Source/viciphone.php';