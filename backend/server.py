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


load_dotenv()


app = Flask(__name__)

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


host = plaid.Environment.Sandbox

if PLAID_ENV == "sandbox":
    host = plaid.Environment.Sandbox

if PLAID_ENV == "production":
    host = plaid.Environment.Production

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
# The transfer_id is only relevant for Transfer ACH product.
# We store the transfer_id in memory - in production, store it in a secure
# persistent data store.
transfer_id = None
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
    public_token = request.form["public_token"]
    try:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        exchange_response = client.item_public_token_exchange(exchange_request)
        return jsonify(exchange_response.to_dict())
    except plaid.ApiException as e:
        return json.loads(e.body), HTTPStatus.INTERNAL_SERVER_ERROR.value


# Accounts


@app.route("/api/account", methods=["GET"])
def get_accounts():
    all_accounts = Account.query.all()
    return jsonify([account.to_dict() for account in all_accounts])


# Budgets
@app.route("/api/budget", methods=["POST"])
def create_budget():
    try:
        data = request.get_json()
        data.pop("id", None)  # Remove id if it exists
        if not has_required_fields_for_model(data, Budget):
            return (
                jsonify(
                    create_formatted_error(
                        HTTPStatus.BAD_REQUEST.value,
                        required_fields_for_model_str(Budget),
                    )
                ),
                HTTPStatus.BAD_REQUEST.value,
            )
        create_model_instance_from_dict(Budget, data, db.session)
        db.session.commit()
        return jsonify({}), 200

    except Exception as e:
        return jsonify(create_formatted_error(400, str(e))), 400

@app.route("/api/budget", methods=["PUT"])
def update_budget():
    try:

        data = request.get_json()
        if not has_required_fields_for_model(data, Budget):
            return (
                jsonify(
                    create_formatted_error(
                        HTTPStatus.BAD_REQUEST.value,
                        required_fields_for_model_str(Budget),
                    )
                ),  
                HTTPStatus.BAD_REQUEST.value,
            )
        budget_id = data["id"]
        budget = db.session.get(Budget, budget_id)
        if not budget:
            return jsonify(
                create_formatted_error(
                    HTTPStatus.NOT_FOUND, f"Budget {budget_id} not found."
                )
            )
        update_model_instance_from_dict(budget, data, db.session)
        db.session.commit()
        return jsonify({}), 200

    except Exception as e:
        return jsonify(create_formatted_error(400, str(e))), 400

@app.route("/api/budget", methods=["GET"])
def get_budgets():
    budgets = Budget.query.all()
    return jsonify([budget.to_dict() for budget in budgets])


@app.route("/api/budget/<string:budget_id>", methods=["DELETE"])
def delete_budget(budget_id: str):
    try:
        # Retrieve the transaction using the txn_id
        budget = db.session.get(Budget, budget_id)

        # If the transaction is not found, return a 404 error
        if not budget:
            return (
                jsonify(
                    create_formatted_error(
                        HTTPStatus.NOT_FOUND, f"Budget {budget} not found."
                    )
                ),
                HTTPStatus.NOT_FOUND.value,
            )

        # Delete the transaction from the database
        db.session.delete(budget)
        db.session.commit()

        # Return a success response
        return jsonify({"message": f"Budget {budget_id} deleted successfully."}), 200

    except Exception as e:
        # If there is any error during the deletion process, return a 400 error
        return jsonify(create_formatted_error(400, str(e))), 400


# Transactions


@app.route("/api/transaction/<string:txn_id>", methods=["PUT"])
def update_transaction(txn_id: str):
    try:
        data = request.get_json()

        if not has_required_fields_for_model(data, Txn):
            return (
                jsonify(
                    create_formatted_error(
                        HTTPStatus.BAD_REQUEST.value, required_fields_for_model_str(Txn)
                    )
                ),
                HTTPStatus.BAD_REQUEST.value,
            )

        txn_id = data["id"]
        txn = db.session.get(Txn, txn_id)
        if not txn:
            return jsonify(
                create_formatted_error(
                    HTTPStatus.NOT_FOUND, f"Transaction {txn_id} not found."
                )
            )
        update_model_instance_from_dict(txn, data, db.session)
        db.session.commit()
        return jsonify({}), 200

    except Exception as e:
        return jsonify(create_formatted_error(400, str(e))), 400


@app.route("/api/transaction/<string:txn_id>", methods=["DELETE"])
def delete_transaction(txn_id: str):
    try:
        # Retrieve the transaction using the txn_id
        txn = db.session.get(Txn, txn_id)

        # If the transaction is not found, return a 404 error
        if not txn:
            return (
                jsonify(
                    create_formatted_error(
                        HTTPStatus.NOT_FOUND, f"Transaction {txn_id} not found."
                    )
                ),
                HTTPStatus.NOT_FOUND.value,
            )

        # Delete the transaction from the database
        db.session.delete(txn)
        db.session.commit()

        # Return a success response
        return jsonify({"message": f"Transaction {txn_id} deleted successfully."}), 200

    except Exception as e:
        # If there is any error during the deletion process, return a 400 error
        return jsonify(create_formatted_error(400, str(e))), 400


@app.route("/api/account/<account_id>/transactions", methods=["GET"])
def get_transactions(account_id):
    account = Account.query.filter_by(id=account_id).one_or_none()
    if not account:
        return (
            jsonify(
                create_formatted_error(
                    HTTPStatus.NOT_FOUND.value,
                    f"Could not find account with id {item_id}.",
                )
            ),
            HTTPStatus.NOT_FOUND.value,
        )
    return jsonify(account.get_transactions())


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


# Items


@app.route("/api/item", methods=["POST"])
def create_item():
    access_token = request.form["access_token"]
    try:
        get_item_request = ItemGetRequest(access_token=access_token)
        response = client.item_get(get_item_request)
        item = response["item"]

        item_id = item["item_id"]
        institution_id = item["institution_id"]
        institution_name = item["institution_name"]

        # TODO: figure out logic to not add multiple of the same account

        # Create item
        item = Item(
            id=item_id, access_token=access_token, institution_id=institution_id
        )
        db.session.add(item)
        db.session.commit()

        # See if institution exists
        institution = Institution.query.filter_by(id=institution_id).one_or_none()
        if not institution:  # If not create one
            create_institution(institution_name, institution_id)

        # Add new accounts
        accounts = add_accounts_from_item(access_token, item_id, institution_id)
        return jsonify([account.to_dict() for account in accounts])

    except plaid.ApiException as e:
        error_response = format_error(e)
        return jsonify(error_response), HTTPStatus.INTERNAL_SERVER_ERROR.value

    except IntegrityError as e:
        db.session.rollback()
        error_response = create_formatted_error(500, str(e))
        return jsonify(error_response), HTTPStatus.INTERNAL_SERVER_ERROR.value

    except Exception as e:
        db.session.rollback()
        error_response = create_formatted_error(500, str(e))
        return jsonify(error_response), HTTPStatus.INTERNAL_SERVER_ERROR.value


@app.route("/api/item", methods=["GET"])
def get_items():
    items = Item.query.all()
    return jsonify([item.to_dict() for item in items])


def create_institution(name: str, institution_id: str):
    institution = Institution(id=institution_id, name=name)
    db.session.add(institution)
    db.session.commit()


def add_accounts_from_item(access_token: str, item_id: str, institution_id: str):
    request = AccountsBalanceGetRequest(access_token=access_token)
    response = client.accounts_balance_get(request)
    accounts = response["accounts"]
    new_accounts = []

    for account in accounts:
        existing_account = Account.query.filter_by(
            name=account.get("name")
        ).one_or_none()
        if existing_account:
            error_response = create_formatted_error(
                HTTPStatus.CONFLICT.value,
                str(f"Account {existing_account.name} already exists."),
            )
            return jsonify(error_response), HTTPStatus.CONFLICT.value

        balances = account["balances"]

        # Get account type
        try:
            account_type_str = str(account.get("type"))
            account_type = AccountType(account_type_str)
        except ValueError:
            account_type = AccountType.OTHER

        # Get account subtype
        try:
            account_subtype_str = str(account.get("subtype"))
            account_subtype = AccountSubtype(account_subtype_str)
        except ValueError:
            account_subtype = AccountSubtype.OTHER

        new_account = Account(
            id=(account.get("persistent_account_id") or account.get("account_id")),
            name=account.get("name"),
            balance=Decimal(balances.get("available") or 0.0),
            limit=Decimal(balances.get("limit") or 0.0),
            last_updated=datetime.now(),
            institution_id=institution_id,
            item_id=item_id,
            account_type=account_type,
            account_subtype=account_subtype,
        )
        new_accounts.append(new_account)
        db.session.add(new_account)

    db.session.commit()
    return new_accounts


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
            pretty_print_response(response)

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
        return jsonify(error_response), HTTPStatus.INTERNAL_SERVER_ERROR.value

    except IntegrityError as e:
        db.session.rollback()
        error_response = create_formatted_error(500, str(e))
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
        db.session.add(new_txn)

    print("Committing all new transactions to the database...")
    db.session.commit()
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
