# Read env vars from .env file
from collections import defaultdict
import csv
from decimal import Decimal
import os
import json
import time
from datetime import date, datetime, timedelta
from http import HTTPStatus

from dotenv import load_dotenv
from flask import Blueprint, Flask, request, jsonify
import plaid
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.item_get_request import ItemGetRequest
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
from sqlalchemy import func

from models.budget.budget_utils import (
    generate_budget_periods_for_budget,
)
from models.budget.budget import Budget, BudgetFrequency
from utils.model_utils import (
    has_required_fields_for_model,
    required_fields_for_model_str,
    update_model_instance_from_dict,
    create_model_instance_from_dict,
)
from models.transaction.txn_category import TxnCategory
from models.transaction.txn_subcategory import TxnSubcategory
from models import db
from models.account.account_subtype import AccountSubtype
from models.transaction.txn import Txn
from models.transaction.transaction_categories import (
    seed_transaction_categories,
)
from models.transaction.payment_channel import PaymentChannel
from models.account.account import Account
from models.item.item import Item
from models.account.account_type import AccountType
from models.institution.institution import Institution
from sqlalchemy.exc import IntegrityError
from routes.item_routes import item_bp
from routes.account_routes import account_bp
from routes.budget_routes import budget_bp
from routes.transaction_routes import transaction_bp

load_dotenv()


app = Flask(__name__)
app.register_blueprint(item_bp)
app.register_blueprint(account_bp)
app.register_blueprint(budget_bp)
app.register_blueprint(transaction_bp)

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


# Transaction Categories


@app.route("/api/transaction/categories", methods=["GET"])
def get_categories():
    categories = TxnCategory.query.all()
    return jsonify([category.to_dict() for category in categories])


@app.route("/api/category", methods=["POST"])
def create_category():
    try:
        data = request.get_json()
        data.pop("id", None)  # Remove id if it exists
        if not has_required_fields_for_model(data, TxnCategory):
            return (
                jsonify(
                    create_formatted_error(
                        HTTPStatus.BAD_REQUEST.value,
                        required_fields_for_model_str(TxnCategory),
                    )
                ),
                HTTPStatus.BAD_REQUEST.value,
            )
        category_name = data.get("name")
        if db.session.query(TxnCategory).filter_by(name=category_name).first():
            return (
                jsonify(
                    create_formatted_error(
                        HTTPStatus.CONFLICT.value,
                        f"Category '{category_name}' already exists.",
                    )
                ),
                HTTPStatus.CONFLICT.value,
            )
        create_model_instance_from_dict(TxnCategory, data, db.session)
        db.session.commit()
        return jsonify({}), 200

    except Exception as e:
        return jsonify(create_formatted_error(400, str(e))), 400


@app.route("/api/category", methods=["PUT"])
def create_update_category():
    try:
        data = request.get_json()
        category_id = data.get("id")
        name = data.get("name")

        # Validate fields needed for put and post
        if not name or (request.method == "PUT" and not category_id):
            return (
                jsonify(
                    create_formatted_error(
                        HTTPStatus.BAD_REQUEST.value,
                        (
                            "Name is required"
                            if request.method == "POST"
                            else "Id and name are required for update"
                        ),
                    )
                ),
                HTTPStatus.BAD_REQUEST.value,
            )

        # Validate not creating same category
        if request.method == "POST":
            if db.session.query(TxnCategory).filter_by(name=name).first():
                return (
                    jsonify(
                        create_formatted_error(
                            HTTPStatus.CONFLICT.value,
                            f"Category '{name}' already exists.",
                        )
                    ),
                    HTTPStatus.CONFLICT.value,
                )

        category = db.session.get(TxnCategory, category_id)
        if category:
            category.name = name
        else:
            category = TxnCategory(name=name)
            db.session.add(category)

        db.session.commit()
        return jsonify(category.to_dict()), 200
    except Exception as e:
        return jsonify(create_formatted_error(400, str(e))), 400


@app.route("/api/subcategory", methods=["POST", "PUT"])
def create_update_subcategory():
    data = request.get_json()
    name = data.get("name")
    subcategory_id = data.get("id") or name
    description = data.get("description", "")
    category_id = data.get("category_id")

    if (
        not name
        or not description
        or not category_id
        or (request.method == "PUT" and not subcategory_id)
    ):
        return (
            jsonify(
                create_formatted_error(
                    HTTPStatus.BAD_REQUEST.value,
                    (
                        "Name, description, and category id are required"
                        if request.method == "POST"
                        else "Id, name, description, and category id are required for update"
                    ),
                )
            ),
            HTTPStatus.BAD_REQUEST.value,
        )

    category = db.session.get(TxnCategory, category_id)
    if not category:
        return (
            jsonify(
                create_formatted_error(
                    HTTPStatus.NOT_FOUND.value, f"Category {category_id} not found"
                )
            ),
            HTTPStatus.NOT_FOUND.value,
        )

    # Check for duplicates
    existing_sub = (
        db.session.query(TxnSubcategory)
        .filter_by(name=name, category_id=category_id)
        .first()
    )
    if existing_sub:
        return (
            jsonify(
                create_formatted_error(
                    HTTPStatus.CONFLICT.value,
                    f"Subcategory '{name}' already exists in this category.",
                )
            ),
            HTTPStatus.CONFLICT.value,
        )

    subcategory = db.session.get(TxnSubcategory, subcategory_id)
    if subcategory:
        subcategory.name = name
        subcategory.description = description
        subcategory.category = category
    else:
        subcategory = TxnSubcategory(
            name=name, description=description, category=category
        )
        db.session.add(subcategory)

    db.session.commit()
    return jsonify(subcategory.to_dict())


@app.route("/api/category/<string:category_id>", methods=["DELETE"])
def delete_category(category_id):
    category = db.session.query(TxnCategory).get(category_id)
    if not category:
        return (
            jsonify(
                create_formatted_error(
                    HTTPStatus.NOT_FOUND.value, f"Category {category_id} not found"
                )
            ),
            HTTPStatus.NOT_FOUND.value,
        )

    # Check if there are any transactions associated with the category
    transactions = db.session.query(Txn).filter_by(category_id=category_id).all()
    if transactions:
        return (
            jsonify(
                create_formatted_error(
                    HTTPStatus.BAD_REQUEST.value,
                    "Cannot delete category with associated transactions.",
                )
            ),
            HTTPStatus.BAD_REQUEST.value,
        )

    db.session.delete(category)
    db.session.commit()
    return (
        jsonify({"message": "Category and its subcategories deleted successfully"}),
        HTTPStatus.OK.value,
    )


@app.route("/api/subcategory/<string:subcategory_id>", methods=["GET"])
def get_subcategory(subcategory_id):
    subcategory = db.session.get(TxnSubcategory, subcategory_id)
    if not subcategory:
        return (
            jsonify(
                create_formatted_error(
                    HTTPStatus.NOT_FOUND.value, "Subcategory not found"
                )
            ),
            HTTPStatus.NOT_FOUND.value,
        )

    return jsonify(subcategory.to_dict()), HTTPStatus.OK.value


@app.route("/api/subcategory/<string:subcategory_id>", methods=["DELETE"])
def delete_subcategory(subcategory_id):
    subcategory = TxnSubcategory.query.get(subcategory_id)
    if not subcategory:
        return (
            jsonify(
                create_formatted_error(
                    HTTPStatus.NOT_FOUND.value, "Subcategory not found"
                )
            ),
            HTTPStatus.NOT_FOUND.value,
        )

    # Check if there are any transactions associated with the subcategory
    transactions = Txn.query.filter_by(subcategory_id=subcategory_id).all()
    if transactions:
        return (
            jsonify(
                create_formatted_error(
                    HTTPStatus.BAD_REQUEST.value,
                    "Cannot delete subcategory with associated transactions.",
                )
            ),
            HTTPStatus.BAD_REQUEST.value,
        )

    db.session.delete(subcategory)
    db.session.commit()
    return jsonify({"message": "Subcategory deleted successfully"}), HTTPStatus.OK.value


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


# Budget Periods
@app.route("/api/budget_period", methods=["GET"])
def get_budget_period():
    freq_str = request.args.get("frequency", "")
    try:
        budget_freq = BudgetFrequency(freq_str)
    except ValueError:
        return (
            jsonify(create_formatted_error(400, f"Frequency {freq_str} not supported")),
            400,
        )

    # Get earliest transaction date
    first_txn_date = db.session.query(func.min(Txn.date)).scalar()
    if not first_txn_date:
        return jsonify([])  # No transactions to build periods from

    budgets = Budget.query.filter_by(frequency=budget_freq).all()
    all_periods = []

    for budget in budgets:
        periods = generate_budget_periods_for_budget(budget, first_txn_date)
        all_periods.extend([p.to_dict() for p in periods])

    return jsonify(all_periods)


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
