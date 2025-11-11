#!/bin/bash

# Test execution script for backend

echo "🧪 Running Backend Tests"
echo "========================"

# Function to run tests with specific markers
run_tests() {
    local marker=$1
    local description=$2
    
    echo ""
    echo "📋 $description"
    echo "----------------------------------------"
    
    if [ -n "$marker" ]; then
        pytest -m "$marker" -v
    else
        pytest -v
    fi
}

# Check if marker is provided as argument
if [ $# -eq 0 ]; then
    # Run all tests
    run_tests "" "All Tests"
else
    case $1 in
        "unit")
            run_tests "unit" "Unit Tests (Mocked Dependencies)"
            ;;
        "integration")
            run_tests "integration" "Integration Tests (Real Plaid Sandbox)"
            ;;
        "e2e")
            run_tests "e2e" "End-to-End Tests"
            ;;
        "slow")
            run_tests "slow" "Slow Tests"
            ;;
        "coverage")
            echo "📊 Running Tests with Coverage Report"
            echo "----------------------------------------"
            pytest --cov=. --cov-report=html --cov-report=term -v
            echo ""
            echo "📁 Coverage report generated in htmlcov/index.html"
            ;;
        "fast")
            echo "⚡ Running Fast Tests Only"
            echo "----------------------------------------"
            pytest -m "not slow" -v
            ;;
        *)
            echo "Usage: $0 [unit|integration|e2e|slow|coverage|fast]"
            echo ""
            echo "Available options:"
            echo "  unit        - Run unit tests with mocked dependencies"
            echo "  integration - Run integration tests with real Plaid sandbox"
            echo "  e2e         - Run end-to-end tests"
            echo "  slow        - Run slow tests"
            echo "  coverage    - Run all tests with coverage report"
            echo "  fast        - Run fast tests only (exclude slow tests)"
            echo ""
            echo "No arguments: Run all tests"
            exit 1
            ;;
    esac
fi

echo ""
echo "✅ Test execution completed!"

