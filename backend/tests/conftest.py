import os
import pytest
import tempfile
from datetime import datetime
from decimal import Decimal
from unittest.mock import Mock, patch

import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app
from models import db
from models.account.account import Account
from models.item.item import Item
from models.institution.institution import Institution
from models.transaction.txn import Txn
from models.account.account_type import AccountType
from models.account.account_subtype import AccountSubtype


@pytest.fixture
def test_app():
    """Create and configure a new app instance for each test."""
    import plaid
    from plaid.api import plaid_api

    # Create a temporary file to serve as the database
    db_fd, db_path = tempfile.mkstemp()

    # Get real Plaid credentials from environment for integration tests
    plaid_client_id = os.getenv("PLAID_CLIENT_ID")
    plaid_secret = os.getenv("PLAID_SECRET")
    plaid_env = os.getenv("PLAID_ENV", "sandbox")

    # Use real Plaid credentials if available, otherwise use mock
    use_real_plaid = plaid_client_id and plaid_secret

    if use_real_plaid:
        # Configure real Plaid client
        host = {
            "sandbox": plaid.Environment.Sandbox,
            "production": plaid.Environment.Production,
        }.get(plaid_env, plaid.Environment.Sandbox)

        configuration = plaid.Configuration(
            host=host,
            api_key={
                "clientId": plaid_client_id,
                "secret": plaid_secret,
                "plaidVersion": "2020-09-14",
            },
        )

        api_client = plaid.ApiClient(configuration)
        plaid_client = plaid_api.PlaidApi(api_client)
    else:
        # Use mock Plaid client
        plaid_client = None

    app.config.update(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "PLAID_ENV": plaid_env,
            "PLAID_CLIENT_ID": plaid_client_id or "test_client_id",
            "PLAID_SECRET": plaid_secret or "test_secret",
        }
    )

    # Set Plaid client in app config
    app.config["plaid_client"] = plaid_client

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(test_app):
    """A test client for the app."""
    return test_app.test_client()


@pytest.fixture
def mock_plaid_client():
    """Mock Plaid client for unit tests."""
    mock_client = Mock()

    # Mock common Plaid responses
    mock_item_response = Mock()
    mock_item_response.to_dict.return_value = {
        "item_id": "test_item_id",
        "institution_id": "ins_56",
        "institution_name": "Chase",
        "access_token": "test_access_token",
        "products": ["transactions"],
        "error": None,
        "available_products": ["transactions"],
        "billed_products": ["transactions"],
        "consent_expiration_time": None,
        "consented_data_scopes": None,
        "consented_products": ["transactions"],
        "consented_use_cases": ["test"],
        "created_at": datetime.now(),
        "update_type": "background",
        "webhook": "",
    }

    mock_accounts_response = Mock()
    mock_accounts_response.__getitem__.return_value = [
        {
            "account_id": "test_account_1",
            "persistent_account_id": "test_account_1",
            "name": "Test Checking Account",
            "official_name": "Test Checking Account",
            "mask": "0000",
            "type": "depository",
            "subtype": "checking",
            "balances": {"available": 1000.0, "current": 1000.0, "limit": None},
        },
        {
            "account_id": "test_account_2",
            "persistent_account_id": "test_account_2",
            "name": "Test Savings Account",
            "official_name": "Test Savings Account",
            "mask": "1111",
            "type": "depository",
            "subtype": "savings",
            "balances": {"available": 5000.0, "current": 5000.0, "limit": None},
        },
    ]

    mock_institution_response = Mock()
    mock_institution_response.__getitem__.return_value.to_dict.return_value = {
        "institution_id": "ins_56",
        "name": "Chase",
        "logo": None,
    }

    mock_transactions_response = Mock()
    mock_transactions_response.__getitem__.return_value = {
        "transactions": [],
        "total_transactions": 0,
        "request_id": "test_request_id",
    }

    mock_client.item_get.return_value = mock_item_response
    mock_client.accounts_get.return_value = mock_accounts_response
    mock_client.institutions_get_by_id.return_value = mock_institution_response
    mock_client.transactions_sync.return_value = mock_transactions_response
    mock_client.item_remove.return_value = {"request_id": "test_request_id"}

    return mock_client


@pytest.fixture(scope="function")
def sample_institution(test_app):
    """Create a sample institution for testing."""
    with test_app.app_context():
        # Get or create institution (handles race conditions)
        institution = Institution.query.filter_by(id="ins_56").first()
        if not institution:
            institution = Institution(id="ins_56", name="Chase", logo=None)
            db.session.add(institution)
            db.session.commit()
        return institution.id  # Return ID instead of object


@pytest.fixture(scope="function")
def sample_item(test_app, sample_institution):
    """Create a sample item for testing."""
    with test_app.app_context():
        # Get or create item
        item = Item.query.filter_by(id="test_item_id").first()
        if not item:
            item = Item(
                id="test_item_id",
                access_token="test_access_token",
                institution_id=sample_institution,  # sample_institution is now just the ID
            )
            db.session.add(item)
            db.session.commit()
        return item.id  # Return ID instead of object


@pytest.fixture(scope="function")
def sample_accounts(test_app, sample_item, sample_institution):
    """Create sample accounts for testing."""
    with test_app.app_context():
        accounts = [
            Account(
                id="test_account_1",
                name="Test Checking Account-0000",
                original_name="Test Checking Account-0000",
                balance=1000.0,
                limit=0.0,
                last_updated=datetime.now(),
                institution_id=sample_institution,  # Now just the ID
                item_id=sample_item,  # Now just the ID
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.CHECKING,
                active=True,
            ),
            Account(
                id="test_account_2",
                name="Test Savings Account-1111",
                original_name="Test Savings Account-1111",
                balance=5000.0,
                limit=0.0,
                last_updated=datetime.now(),
                institution_id=sample_institution,  # Now just the ID
                item_id=sample_item,  # Now just the ID
                account_type=AccountType.DEPOSITORY,
                account_subtype=AccountSubtype.SAVINGS,
                active=True,
            ),
        ]
        for account in accounts:
            existing = Account.query.filter_by(id=account.id).first()
            if not existing:
                db.session.add(account)
        db.session.commit()
        db.session.expire_all()  # Force refresh to prevent detached instances
        return [Account.query.get(acc.id) for acc in accounts]  # Return fresh objects


@pytest.fixture(scope="function")
def sample_transactions(test_app, sample_accounts):
    """Create sample transactions for testing."""
    with test_app.app_context():
        transactions = [
            Txn(
                id="txn_1",
                account_id=sample_accounts[0].id,
                amount=Decimal("-50.0"),
                date=datetime.now().date(),
                name="Test Transaction 1",
                category_id="1",
            ),
            Txn(
                id="txn_2",
                account_id=sample_accounts[1].id,
                amount=Decimal("100.0"),
                date=datetime.now().date(),
                name="Test Transaction 2",
                category_id="2",
            ),
        ]
        for transaction in transactions:
            existing = Txn.query.filter_by(id=transaction.id).first()
            if not existing:
                db.session.add(transaction)
        db.session.commit()
        return transactions


@pytest.fixture
def app_with_plaid_mock(test_app, mock_plaid_client):
    """App with mocked Plaid client."""
    with patch("server.client", mock_plaid_client):
        test_app.config["plaid_client"] = mock_plaid_client
        yield test_app
