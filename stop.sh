#!/bin/bash

set -e

echo "=== Stopping Docker Compose containers... ==="
docker compose down

echo "=== All containers stopped and removed. ==="
