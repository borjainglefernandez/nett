# Read env vars from .env file
from decimal import Decimal
import os
import json
import time
from datetime import date, timedelta
from http import HTTPStatus

from dotenv import load_dotenv
from flask import Flask, request, jsonify
import plaid
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.link_token_create_request_statements import (
    LinkTokenCreateRequestStatements,
)
from plaid.model.link_token_create_request_cra_options import (
    LinkTokenCreateRequestCraOptions,
)
from plaid.model.consumer_report_permissible_purpose import (
    ConsumerReportPermissiblePurpose,
)
from plaid.api import plaid_api
from flask_migrate import Migrate
from models.transaction.txn_category import TxnCategory
from models.transaction.txn_subcategory import TxnSubcategory
from models import db
from models.transaction.txn import Txn
from models.transaction.transaction_categories import (
    seed_transaction_categories,
)
from models.transaction.payment_channel import PaymentChannel
from models.account.account import Account
from models.item.item import Item
from sqlalchemy.exc import IntegrityError
from routes.item_routes import item_bp
from routes.account_routes import account_bp
from routes.budget_routes import budget_bp
from routes.budget_period_routes import budget_period_routes
from routes.txn_routes import txn_bp
from routes.txn_category_routes import txn_category_bp
from routes.txn_subcategory_routes import txn_subcategory_bp

load_dotenv()


app = Flask(__name__)
app.register_blueprint(item_bp)
app.register_blueprint(account_bp)
app.register_blueprint(budget_bp)
app.register_blueprint(txn_bp)
app.register_blueprint(txn_category_bp)
app.register_blueprint(txn_subcategory_bp)
app.register_blueprint(budget_period_routes)

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")
PLAID_PRODUCTS = os.getenv("PLAID_PRODUCTS", "transactions").split(",")
PLAID_COUNTRY_CODES = os.getenv("PLAID_COUNTRY_CODES", "US").split(",")


# SQLite database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)  # 🔥 Fix: Bind the existing db instance to the app
migrate = Migrate(app, db)  # Bind Flask-Migrate to Flask app and SQLAlchemy
with app.app_context():
    db.create_all()
    seed_transaction_categories()


def empty_to_none(field):
    value = os.getenv(field)
    if value is None or len(value) == 0:
        return None
    return value


host = {
    "sandbox": plaid.Environment.Sandbox,
    "production": plaid.Environment.Production,
}.get(PLAID_ENV, plaid.Environment.Sandbox)


# Parameters used for the OAuth redirect Link flow.
#
# Set PLAID_REDIRECT_URI to 'http://localhost:3000/'
# The OAuth redirect flow requires an endpoint on the developer's website
# that the bank website should redirect to. You will need to configure
# this redirect URI for your client ID through the Plaid developer dashboard
# at https://dashboard.plaid.com/team/api.
PLAID_REDIRECT_URI = empty_to_none("PLAID_REDIRECT_URI")

configuration = plaid.Configuration(
    host=host,
    api_key={
        "clientId": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET,
        "plaidVersion": "2020-09-14",
    },
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)
app.config["plaid_client"] = client

products = []
for product in PLAID_PRODUCTS:
    products.append(Products(product))


# We store the access_token in memory - in production, store it in a secure
# persistent data store.
access_token = None
# The payment_id is only relevant for the UK Payment Initiation product.
# We store the payment_id in memory - in production, store it in a secure
# persistent data store.
payment_id = None
# We store the user_token in memory - in production, store it in a secure
# persistent data store.
user_token = None

item_id = None


@app.route("/api/info", methods=["POST"])
def info():
    global access_token
    global item_id
    return jsonify(
        {"item_id": item_id, "access_token": access_token, "products": PLAID_PRODUCTS}
    )


@app.route("/api/create_link_token", methods=["POST"])
def create_link_token():
    global user_token
    try:
        request = LinkTokenCreateRequest(
            products=products,
            client_name="Plaid Quickstart",
            country_codes=list(map(lambda x: CountryCode(x), PLAID_COUNTRY_CODES)),
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id=str(time.time())),
        )
        if PLAID_REDIRECT_URI != None:
            request["redirect_uri"] = PLAID_REDIRECT_URI
        if Products("statements") in products:
            statements = LinkTokenCreateRequestStatements(
                end_date=date.today(), start_date=date.today() - timedelta(days=30)
            )
            request["statements"] = statements

        cra_products = [
            "cra_base_report",
            "cra_income_insights",
            "cra_partner_insights",
        ]
        if any(product in cra_products for product in PLAID_PRODUCTS):
            request["user_token"] = user_token
            request["consumer_report_permissible_purpose"] = (
                ConsumerReportPermissiblePurpose("ACCOUNT_REVIEW_CREDIT")
            )
            request["cra_options"] = LinkTokenCreateRequestCraOptions(days_requested=60)
        # create link token
        response = client.link_token_create(request)
        return jsonify(response.to_dict())
    except plaid.ApiException as e:
        print(e)
        return json.loads(e.body)


# Exchange token flow - exchange a Link public_token for
# an API access_token
# https://plaid.com/docs/#exchange-token-flow


@app.route("/api/set_access_token", methods=["POST"])
def get_access_token():
    data = request.get_json()
    public_token = data["public_token"]
    try:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        exchange_response = client.item_public_token_exchange(exchange_request)
        return jsonify(exchange_response.to_dict())
    except plaid.ApiException as e:
        return json.loads(e.body), HTTPStatus.INTERNAL_SERVER_ERROR.value


@app.route("/api/item/<item_id>/sync", methods=["POST"])
def sync_item_transactions(item_id: str):
    try:
        item = Item.query.filter_by(id=item_id).one_or_none()

        if not item:
            return jsonify(
                create_formatted_error(404, f"Could not find item with id {item_id}.")
            )

        cursor = item.cursor

        # New transaction updates since "cursor"
        added = []
        modified = []
        removed = []  # Removed transaction ids
        has_more = True

        # Iterate through each page of new transaction updates for item
        while has_more:
            request = TransactionsSyncRequest(
                access_token=item.access_token,
                cursor=cursor,
            )
            response = client.transactions_sync(request).to_dict()

            # Add this page of results
            added.extend(response["added"])
            modified.extend(response["modified"])
            removed.extend(response["removed"])

            has_more = response["has_more"]

            # Update cursor to the next cursor
            cursor = response["next_cursor"]

            if cursor == "":
                time.sleep(2)
                continue

        handle_added_transactions(added)
        handle_modified_transactions(modified)
        handle_removed_transactions(removed)

        # Update cursor to last one
        item.cursor = cursor
        db.session.commit()
        accounts = Account.query.all()
        return jsonify([account.get_transactions() for account in accounts])

    except plaid.ApiException as e:
        error_response = format_error(e)
        print(error_response)
        return jsonify(error_response), HTTPStatus.INTERNAL_SERVER_ERROR.value

    except IntegrityError as e:
        db.session.rollback()
        error_response = create_formatted_error(500, str(e))
        print(error_response)
        return jsonify(error_response), HTTPStatus.INTERNAL_SERVER_ERROR.value

    except Exception as e:
        db.session.rollback()
        error_response = create_formatted_error(500, str(e))
        print(error_response)
        return jsonify(error_response), HTTPStatus.INTERNAL_SERVER_ERROR.value


def handle_added_transactions(transactions: list):
    print(f"Handling {len(transactions)} new transactions")

    for i, transaction in enumerate(transactions):
        print(
            f"\nProcessing transaction {i + 1}/{len(transactions)}: ID {transaction.get('transaction_id')}"
        )

        existing_txn = Txn.query.filter_by(
            id=transaction["transaction_id"]
        ).one_or_none()

        if existing_txn:
            print(
                f"Transaction {transaction['transaction_id']} already exists, skipping."
            )
            continue

        account = Account.query.filter_by(id=transaction["account_id"]).one_or_none()
        if not account:
            print(
                f"Account {transaction['account_id']} not found, skipping transaction."
            )
            continue

        # Extract category and subcategory
        personal_finance = transaction.get("personal_finance_category", {})
        primary_category_name = personal_finance.get("primary", "OTHER").strip()
        detailed_category_name = personal_finance.get("detailed", "OTHER").strip()
        print(
            f"Primary category: {primary_category_name}, Subcategory: {detailed_category_name}"
        )

        # Get or create category
        category = TxnCategory.query.filter_by(name=primary_category_name).one_or_none()
        if not category:
            print(f"Creating new category: {primary_category_name}")
            category = TxnCategory(name=primary_category_name)
            db.session.add(category)
            db.session.commit()

        # Get or create subcategory
        subcategory = TxnSubcategory.query.filter_by(
            name=detailed_category_name, category_id=category.id
        ).one_or_none()
        if not subcategory:
            print(
                f"Creating new subcategory: {detailed_category_name} under {primary_category_name}"
            )
            subcategory = TxnSubcategory(
                name=detailed_category_name,
                description=f"Subcategory of {primary_category_name}",
                category=category,
            )
            db.session.add(subcategory)
            db.session.commit()

        try:
            payment_channel_str = str(transaction["payment_channel"])
            payment_channel = PaymentChannel(payment_channel_str)
        except ValueError:
            print(
                f"Invalid payment channel '{transaction.get('payment_channel')}', defaulting to OTHER"
            )
            payment_channel = PaymentChannel.OTHER

        print(
            f"Creating new transaction record for {transaction.get('name')} on {transaction.get('date')}"
        )
        new_txn = Txn(
            id=transaction.get("transaction_id"),
            name=transaction.get("name"),
            amount=Decimal(transaction.get("amount") or 0.0),
            category=category,
            subcategory=subcategory,
            date=transaction.get("date"),
            date_time=transaction.get("datetime"),
            merchant=transaction.get("merchant_name"),
            logo_url=transaction.get("logo_url"),
            channel=payment_channel,
            account_id=account.id,
        )
        try:
            db.session.add(new_txn)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            print(
                f"Duplicate transaction {transaction['transaction_id']} already exists, skipping."
            )

    print("Committing all new transactions to the database...")
    print("Done.")


def handle_modified_transactions(transactions: list):
    pass


def handle_removed_transactions(transactions: list):
    pass


def pretty_print_response(response):
    print(json.dumps(response, indent=2, sort_keys=True, default=str))


def create_formatted_error(status_code: int, error_message: str):
    return {
        "status_code": status_code,
        "display_message": error_message,
        "error_code": status_code,
        "error_type": "",
    }


def format_error(e):
    response = json.loads(e.body)
    return {
        "status_code": e.status,
        "display_message": response["error_message"],
        "error_code": response["error_code"],
        "error_type": response["error_type"],
    }


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 8000)))
