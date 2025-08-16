#!/bin/bash

set -e

echo "=== Checking for Docker installation... ==="
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Please install Docker Desktop for Mac from https://www.docker.com/products/docker-desktop/"
    echo "After installing, run this script again."
    exit 1
else
    echo "Docker is already installed."
fi

echo "=== Checking if Docker daemon is running... ==="
if ! docker info &> /dev/null; then
    echo "Docker daemon is not running. Starting Docker Desktop..."
    open -a Docker

    echo "Waiting for Docker to start..."
    # Keep checking until docker responds
    while ! docker info &> /dev/null; do
        sleep 2
    done
    echo "Docker is now running."
else
    echo "Docker daemon is already running."
fi

echo "=== Checking for Docker Compose... ==="
if ! docker compose version &> /dev/null; then
    echo "Docker Compose plugin not found. Docker Desktop on Mac should include it."
    echo "Please make sure Docker Desktop is updated to the latest version."
    exit 1
else
    echo "Docker Compose is available."
fi

echo "=== Starting containers in detached mode... ==="
docker compose up -d

echo "=== All done! Containers are running in the background. ==="
