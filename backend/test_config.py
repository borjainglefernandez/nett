# Test configuration for backend tests
import os

# Test environment variables
os.environ["PLAID_ENV"] = "sandbox"
os.environ["PLAID_CLIENT_ID"] = "test_client_id"
os.environ["PLAID_SECRET"] = "test_secret"
os.environ["FLASK_ENV"] = "testing"


