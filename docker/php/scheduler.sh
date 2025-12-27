#!/bin/sh
# =============================================================================
# Laravel Scheduler Runner
# Handles signals properly for graceful shutdown
# =============================================================================

set -e

# Trap signals for graceful shutdown
trap 'echo "Received shutdown signal, exiting..."; exit 0' SIGTERM SIGINT SIGQUIT

echo "Starting Laravel scheduler..."

# Wait for PHP-FPM to be ready (in case we depend on it)
sleep 5

while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running scheduler..."
    php /var/www/html/artisan schedule:run --verbose --no-interaction
    
    # Sleep for 60 seconds, but check for signals every second
    for i in $(seq 1 60); do
        sleep 1
    done
done
