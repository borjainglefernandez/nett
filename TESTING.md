# Testing Guide

This document provides comprehensive information about the testing suite for the Nett application.

## Overview

The testing suite includes:

- **Backend Tests**: Unit tests, integration tests, and E2E tests using pytest
- **Frontend Tests**: Component tests, hook tests, and integration tests using Jest and React Testing Library
- **Test Coverage**: Comprehensive coverage reporting for both backend and frontend

## Backend Testing

### Setup

1. Install test dependencies:

```bash
cd backend
pip install -r requirements.txt
```

2. Run tests:

```bash
# Run all tests
./run_tests.sh

# Run specific test types
./run_tests.sh unit          # Unit tests only
./run_tests.sh integration   # Integration tests only
./run_tests.sh e2e          # E2E tests only
./run_tests.sh coverage     # With coverage report
./run_tests.sh fast         # Fast tests only (exclude slow)
```

### Test Structure

```
backend/tests/
├── conftest.py                    # Test fixtures and configuration
├── test_models.py                 # Model tests
├── test_utils.py                  # Utility function tests
├── unit/                          # Unit tests (mocked dependencies)
│   ├── test_account_routes.py
│   └── test_item_routes.py
├── integration/                   # Integration tests (real Plaid sandbox)
│   └── test_plaid_integration.py
└── e2e/                          # End-to-end tests
    └── test_full_flow.py
```

### Test Categories

- **Unit Tests** (`@pytest.mark.unit`): Fast tests with mocked dependencies
- **Integration Tests** (`@pytest.mark.integration`): Tests with real Plaid sandbox API
- **E2E Tests** (`@pytest.mark.e2e`): Complete application flow tests
- **Slow Tests** (`@pytest.mark.slow`): Tests that take longer to run

### Key Test Scenarios

1. **Account Management**:

   - Account creation and reactivation
   - Soft deletion and reactivation
   - Account limit enforcement (10 production, 15 sandbox)

2. **Item Management**:

   - Item creation with Plaid integration
   - Item deletion (removes from Plaid and database)
   - Account grouping by item_id

3. **Transaction Sync**:

   - Transaction fetching and storage
   - Error handling and retries

4. **Error Handling**:
   - Plaid API errors
   - Network errors
   - Database errors

## Frontend Testing

### Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Run tests:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in CI mode
npm run test:ci
```

### Test Structure

```
frontend/src/
├── setupTests.ts                  # Test setup and configuration
├── test-utils.tsx                 # Custom render function and utilities
├── mocks/                         # API mocking
│   ├── server.ts
│   └── handlers.ts
├── Components/
│   └── AccountsList/
│       └── __tests__/
│           ├── AccountList.test.tsx
│           └── AccountSelectableCard.test.tsx
├── Pages/
│   └── __tests__/
│       └── Main.test.tsx
├── hooks/
│   └── __tests__/
│       ├── apiService.test.ts
│       └── appAlert.test.ts
└── __tests__/
    └── integration/
        └── ItemDeletion.test.tsx
```

### Test Categories

- **Component Tests**: Individual component functionality
- **Hook Tests**: Custom hook behavior
- **Integration Tests**: Component interaction and API integration
- **Page Tests**: Complete page functionality

### Key Test Scenarios

1. **Account List**:

   - Account grouping by item_id
   - Account selection and deselection
   - Remove bank connection flow

2. **Account Cards**:

   - Account information display
   - Account name editing
   - Expand/collapse functionality

3. **Item Deletion**:

   - Confirmation dialog
   - API integration
   - Error handling

4. **API Service**:
   - HTTP method handling
   - Error handling
   - Alert triggering

## Test Configuration

### Backend Configuration

- **Database**: In-memory SQLite for tests
- **Plaid Environment**: Sandbox for integration tests
- **Coverage**: HTML and terminal reports
- **Markers**: Unit, integration, E2E, slow

### Frontend Configuration

- **Test Environment**: Jest with React Testing Library
- **API Mocking**: Mock Service Worker (MSW)
- **Coverage**: Comprehensive coverage reporting
- **Mocking**: Components, hooks, and API calls

## Running Tests

### Backend

```bash
# All tests
pytest

# Specific markers
pytest -m unit
pytest -m integration
pytest -m e2e

# With coverage
pytest --cov=. --cov-report=html

# Fast tests only
pytest -m "not slow"
```

### Frontend

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# CI mode
npm run test:ci
```

## Coverage Goals

- **Backend**: 80%+ code coverage
- **Frontend**: 70%+ code coverage
- **Critical Paths**: 100% coverage

## Test Data

### Backend Test Data

- **Sample Accounts**: Mock account data with various types
- **Sample Transactions**: Mock transaction data
- **Sample Items**: Mock Plaid item data
- **Sample Institutions**: Mock institution data

### Frontend Test Data

- **Mock API Responses**: Consistent test data
- **Component Props**: Realistic prop data
- **User Interactions**: Simulated user actions

## Best Practices

### Backend Testing

1. Use fixtures for common test data
2. Mock external dependencies (Plaid API)
3. Test error scenarios
4. Use descriptive test names
5. Group related tests in classes

### Frontend Testing

1. Test user interactions, not implementation details
2. Use custom render function with providers
3. Mock external dependencies
4. Test accessibility
5. Use data-testid for reliable element selection

## Troubleshooting

### Common Issues

1. **Test Database Issues**: Ensure in-memory database is used
2. **Plaid API Issues**: Check sandbox credentials
3. **Mock Issues**: Verify mock setup and teardown
4. **Coverage Issues**: Check test file inclusion

### Debug Tips

1. Use `pytest -v` for verbose output
2. Use `pytest --pdb` for debugging
3. Check test logs for detailed error information
4. Verify mock calls with `assert_called_with`

## Continuous Integration

The test suite is designed to run in CI/CD pipelines:

- **Backend**: Uses pytest with coverage reporting
- **Frontend**: Uses Jest with coverage reporting
- **Environment**: Sandbox for safe testing
- **Parallel**: Tests can run in parallel for speed

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this documentation if needed

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Mock Service Worker](https://mswjs.io/)


