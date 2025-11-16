# Nett

Nett is a financial application that integrates with Plaid to manage bank accounts, transactions, budgets, and financial data.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
- [Access Token Backup](#access-token-backup)
  - [Setup](#setup)
  - [Recovery](#recovery)
- [Testing](#testing)
  - [Backend Testing](#backend-testing)
  - [Frontend Testing](#frontend-testing)
  - [Test Configuration](#test-configuration)
  - [Coverage Goals](#coverage-goals)
  - [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Getting Started

### Prerequisites

- Python 3.8+ (for backend)
- Node.js 14+ and npm (for frontend)
- Docker and Docker Compose (optional, for containerized deployment)
- Plaid API credentials ([Get them here](https://dashboard.plaid.com/developers/keys))

### Environment Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd Nett
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and fill in your Plaid credentials:

- `PLAID_CLIENT_ID`: Your Plaid Client ID
- `PLAID_SECRET`: Your Plaid Secret
- `PLAID_ENV`: Environment (`sandbox`, `development`, or `production`)
- `PLAID_PRODUCTS`: Comma-separated list of products (e.g., `transactions`)
- `PLAID_COUNTRY_CODES`: Comma-separated list of country codes (e.g., `US`)
- `PLAID_REDIRECT_URI`: Optional redirect URI for OAuth (e.g., `http://localhost:3000/`)

**Access Token Backup (Optional but Recommended):**

For production use, configure AWS S3 backup to protect against database loss:

- `AWS_S3_BUCKET_NAME`: S3 bucket name for storing access token backups
- `AWS_ACCESS_KEY`: AWS access key with S3 write permissions
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (optional, defaults to `us-east-2`)

> **Note**: `.env` files are for local development only. Never commit secrets or use `.env` files in production.

### Running the Application

#### Option 1: Run with Docker

**Prerequisites:** Make sure Docker Desktop (or Docker daemon) is running.

1. Start the containers:

```bash
make up
```

The backend will be available at `http://localhost:8000` and the frontend at `http://localhost:3000`.

2. View logs:

```bash
make logs
```

3. Stop the containers:

```bash
make stop
```

4. Stop and remove containers:

```bash
make down
```

#### Option 2: Run without Docker

**Backend:**

```bash
cd backend
pip install -r requirements.txt
./start.sh
```

The backend will run on `http://localhost:8000`.

**Frontend:**

```bash
cd frontend
npm install
npm start
```

The frontend will run on `http://localhost:3000`.

## Access Token Backup

Nett includes an optional S3-based backup system for Plaid access tokens. This serves as a failsafe to recover access tokens if the local database is lost or corrupted, allowing you to remove items from Plaid and stop billing.

### Setup

1. **Create an S3 bucket** with encryption at rest enabled:

   - Go to AWS S3 Console
   - Create a new bucket
   - Enable encryption (SSE-S3 or SSE-KMS)
   - Note the bucket name

2. **Create an IAM user** with S3 access:

   - Go to AWS IAM Console → Users
   - Create a new user (e.g., `nett-backup-user`)
   - Attach policy: `AmazonS3FullAccess` or create a custom policy for your bucket
   - Create access keys and save them securely

3. **Configure environment variables** in your `.env` file:

   ```
   AWS_S3_BUCKET_NAME=your-bucket-name
   AWS_ACCESS_KEY=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_REGION=us-east-2  # Optional, defaults to us-east-2
   ```

4. **How it works**:
   - Access tokens are automatically backed up to S3 when items are created or reactivated
   - Tokens are stored with metadata (item_id, environment)
   - Backup files are environment-specific: `access_tokens_backup_sandbox.json` and `access_tokens_backup_production.json`
   - Tokens are never deleted from backup (permanent failsafe)
   - Production backups are never touched by tests (only sandbox backups are cleaned up after test runs)

### Recovery

If your database is lost, you can recover access tokens from S3:

1. **Restore a specific token** via API:

   ```bash
   GET /api/item/<item_id>/restore-token
   ```

   Returns: `{"access_token": "token"}`

2. **Use the restored token** to remove items from Plaid:
   ```python
   from plaid.model.item_remove_request import ItemRemoveRequest
   remove_request = ItemRemoveRequest(access_token=restored_token)
   plaid_client.item_remove(remove_request)
   ```

**Cost**: < $0.10/month for < 100 items (S3 storage + minimal request costs)

### Test Credentials

When using Plaid Sandbox, you can use these test credentials:

- **Username**: `user_good`
- **Password**: `pass_good`
- **2FA Code**: `1234`

For more realistic transaction data:

- **Username**: `user_transactions_dynamic`
- **Password**: Any non-blank string

For credit and underwriting products, see [Plaid's test credentials documentation](https://plaid.com/docs/sandbox/test-credentials/#credit-and-income-testing-credentials).

## Testing

This document provides comprehensive information about the testing suite for the Nett application.

### Overview

The testing suite includes:

- **Backend Tests**: Unit tests, integration tests, and E2E tests using pytest
- **Frontend Tests**: Component tests, hook tests, and integration tests using Jest and React Testing Library
- **Test Coverage**: Comprehensive coverage reporting for both backend and frontend

### Backend Testing

#### Setup

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

#### Test Structure

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

#### Test Categories

- **Unit Tests** (`@pytest.mark.unit`): Fast tests with mocked dependencies
- **Integration Tests** (`@pytest.mark.integration`): Tests with real Plaid sandbox API
- **E2E Tests** (`@pytest.mark.e2e`): Complete application flow tests
- **Slow Tests** (`@pytest.mark.slow`): Tests that take longer to run

#### Key Test Scenarios

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

#### Running Backend Tests

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

### Frontend Testing

#### Setup

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

#### Test Structure

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

#### Test Categories

- **Component Tests**: Individual component functionality
- **Hook Tests**: Custom hook behavior
- **Integration Tests**: Component interaction and API integration
- **Page Tests**: Complete page functionality

#### Key Test Scenarios

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

#### Running Frontend Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# CI mode
npm run test:ci
```

### Test Configuration

#### Backend Configuration

- **Database**: In-memory SQLite for tests
- **Plaid Environment**: Sandbox for integration tests
- **Coverage**: HTML and terminal reports
- **Markers**: Unit, integration, E2E, slow

#### Frontend Configuration

- **Test Environment**: Jest with React Testing Library
- **API Mocking**: Mock Service Worker (MSW)
- **Coverage**: Comprehensive coverage reporting
- **Mocking**: Components, hooks, and API calls

### Coverage Goals

- **Backend**: 80%+ code coverage
- **Frontend**: 70%+ code coverage
- **Critical Paths**: 100% coverage

### Best Practices

#### Backend Testing

1. Use fixtures for common test data
2. Mock external dependencies (Plaid API)
3. Test error scenarios
4. Use descriptive test names
5. Group related tests in classes

#### Frontend Testing

1. Test user interactions, not implementation details
2. Use custom render function with providers
3. Mock external dependencies
4. Test accessibility
5. Use data-testid for reliable element selection

### Troubleshooting Tests

#### Common Issues

1. **Test Database Issues**: Ensure in-memory database is used
2. **Plaid API Issues**: Check sandbox credentials
3. **Mock Issues**: Verify mock setup and teardown
4. **Coverage Issues**: Check test file inclusion

#### Debug Tips

1. Use `pytest -v` for verbose output
2. Use `pytest --pdb` for debugging
3. Check test logs for detailed error information
4. Verify mock calls with `assert_called_with`

### Continuous Integration

The test suite is designed to run in CI/CD pipelines:

- **Backend**: Uses pytest with coverage reporting
- **Frontend**: Uses Jest with coverage reporting
- **Environment**: Sandbox for safe testing
- **Parallel**: Tests can run in parallel for speed

### Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this documentation if needed

## Troubleshooting

### Link fails in Production with "something went wrong" / `INVALID_SERVER_ERROR` but works in Sandbox

If Link works in Sandbox but fails in Production, the error is most likely one of the following:

1. You need to set a use case for Link, which you can do in the Plaid Dashboard under [Link -> Customization -> Data Transparency Messaging](https://dashboard.plaid.com/link/data-transparency-v5).
2. You don't yet have OAuth access for the institution you selected. This is especially common if the institution is Chase or Charles Schwab, which have longer OAuth registration turnarounds. To check your OAuth registration status and see if you have any required action items, see the [US OAuth Institutions page](https://dashboard.plaid.com/settings/compliance/us-oauth-institutions) in the Dashboard.

### Can't get a link token, or API calls are 400ing

View the server logs to see the associated error message with detailed troubleshooting instructions. If you can't view logs locally, view them via the [Dashboard activity logs](https://dashboard.plaid.com/activity/logs).

### Works only when `PLAID_REDIRECT_URI` is not specified

Make sure to add the redirect URI to the Allowed Redirect URIs list in the [Plaid Dashboard](https://dashboard.plaid.com/team/api).

### "Connectivity not supported"

If you get a "Connectivity not supported" error after selecting a financial institution in Link, you probably specified some products in your `.env` file that the target financial institution doesn't support. Remove the unsupported products and try again.

### "You need to update your app" or "institution not supported"

If you get a "You need to update your app" or "institution not supported" error after selecting a financial institution in Link, you're probably running the application in Production and attempting to link an institution, such as Chase or Wells Fargo, that requires an OAuth-based connection. In order to make OAuth connections to US-based institutions in Production, you must have full Production access approval, and certain institutions may also require additional approvals before you can be enabled. To use this institution, [apply for full Production access](https://dashboard.plaid.com/overview/production) and see the [OAuth institutions page](https://dashboard.plaid.com/team/oauth-institutions) for any other required steps and to track your OAuth enablement status.

### "oauth uri does not contain a valid oauth_state_id query parameter"

If you get the console error "oauth uri does not contain a valid oauth_state_id query parameter", you are attempting to initialize Link with a redirect uri when it is not necessary to do so. The `receivedRedirectUri` should not be set when initializing Link for the first time. It is used when initializing Link for the second time, after returning from the OAuth redirect.

### Testing OAuth

Some institutions require an OAuth redirect authentication flow, where the end user is redirected to the bank's website or mobile app to authenticate.

To test the OAuth flow in Sandbox, select any institution that uses an OAuth connection with Plaid (a partial list can be found on the [Dashboard OAuth Institutions page](https://dashboard.plaid.com/team/oauth-institutions)), or choose 'Platypus OAuth Bank' from the list of financial institutions in Plaid Link.

#### Testing OAuth with a redirect URI (optional)

To test the OAuth flow in Sandbox with a [redirect URI](https://www.plaid.com/docs/link/oauth/#create-and-register-a-redirect-uri), you should set `PLAID_REDIRECT_URI=http://localhost:3000/` in `.env`. You will also need to register this localhost redirect URI in the [Plaid dashboard under Developers > API > Allowed redirect URIs](https://dashboard.plaid.com/developers/api). It is not required to configure a redirect URI in the `.env` file to use OAuth with the application.

#### Instructions for using https with localhost

If you want to test OAuth in development with a redirect URI, you need to use https and set `PLAID_REDIRECT_URI=https://localhost:3000/` in `.env`. In order to run your localhost on https, you will need to create a self-signed certificate and add it to the frontend root folder. You can use the following instructions to do this. Note that self-signed certificates should be used for testing purposes only, never for actual deployments.

In your terminal, change to the frontend folder:

```bash
cd frontend
```

Use homebrew to install mkcert:

```bash
brew install mkcert
```

Then create your certificate for localhost:

```bash
mkcert -install
mkcert localhost
```

This will create a certificate file `localhost.pem` and a key file `localhost-key.pem` inside your frontend folder.

Then in the `package.json` file in the frontend folder, the start script should already be configured to use HTTPS with these certificates.

After starting up the application, you can now view it at `https://localhost:3000`. If you are on Windows, you may still get an invalid certificate warning on your browser. If so, click on "advanced" and proceed. Also on Windows, the frontend may still try to load `http://localhost:3000` and you may have to access `https://localhost:3000` manually.

## Resources

- [Plaid Documentation](https://plaid.com/docs/)
- [Plaid Quickstart Guide](https://plaid.com/docs/quickstart)
- [Plaid Client Libraries](https://plaid.com/docs/api/libraries)
- [pytest Documentation](https://docs.pytest.org/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Mock Service Worker](https://mswjs.io/)
