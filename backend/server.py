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

from models import db
from models.account.account_subtype import AccountSubtype
from models.transaction.txn import Txn
from models.transaction.transaction_categories import TransactionCategories
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


# Get accounts


@app.route("/api/account", methods=["GET"])
def get_accounts():
    all_accounts = Account.query.all()
    return jsonify([account.to_dict() for account in all_accounts])


# Get transactions for account


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


# Get transaction categories


# @app.route("/api/transaction/categories", methods=["GET"])
# def get_categories():
#     category_dict = defaultdict(dict)
#     with open(
#         "assets/plaid_categories.csv", newline="", encoding="utf-8"
#     ) as category_file:
#         csv_reader = csv.DictReader(category_file)
#         for row in csv_reader:
#             primary = row["PRIMARY"]
#             detailed = row["DETAILED"]
#             description = row["DESCRIPTION"]
#             if not category_dict[primary]:
#                 category_dict[primary] = []


#             sub_category_dict = {"subcategory": detailed, "description": description}
#             category_dict[primary].append(sub_category_dict)
#     return jsonify(category_dict)
@app.route("/api/transaction/categories", methods=["GET"])
def get_categories():
    categories_list = []
    category_dict = defaultdict(list)

    with open(
        "assets/plaid_categories.csv", newline="", encoding="utf-8"
    ) as category_file:
        csv_reader = csv.DictReader(category_file)
        for row in csv_reader:
            primary = row["PRIMARY"]
            detailed = row["DETAILED"]
            description = row["DESCRIPTION"]

            sub_category_dict = {"subcategory": detailed, "description": description}
            category_dict[primary].append(sub_category_dict)

    # Convert dict to list of objects
    for category, subcategories in category_dict.items():
        categories_list.append({"name": category, "subcategories": subcategories})

    return jsonify(categories_list)


# Create item


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


# Sync Transactions for Item


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
        return jsonify(error_response), HTTPStatus.INTERNAL_SERVER_ERROR.value


def handle_added_transactions(transactions: list):
    for transaction in transactions:
        existing_txn = Txn.query.filter_by(
            id=transaction["transaction_id"]
        ).one_or_none()
        if existing_txn:
            continue

        account = Account.query.filter_by(id=transaction["account_id"]).one_or_none()
        if not account:
            continue

        # Get account type
        try:
            txn_category_str = str(transaction["personal_finance_category"]["detailed"])
            txn_category = TransactionCategories(txn_category_str)
        except ValueError:
            txn_category = TransactionCategories.OTHER

        try:
            payment_channel_str = str(transaction["payment_channel"])
            payment_channel = PaymentChannel(payment_channel_str)
        except ValueError:
            payment_channel = PaymentChannel.OTHER

        new_txn = Txn(
            id=transaction.get("transaction_id"),
            name=transaction.get("name"),
            amount=Decimal(transaction.get("amount") or 0.0),
            category=txn_category,
            date=transaction.get("date"),
            date_time=transaction.get("datetime"),
            merchant=transaction.get("merchant_name"),
            logo_url=transaction.get("logo_url"),
            channel=payment_channel,
            account_id=account.id,
        )
        db.session.add(new_txn)
    db.session.commit()


def handle_modified_transactions(transactions: list):
    pass


def handle_removed_transactions(transactions: list):
    pass


# Retrieve real-time balance data for each of an Item's accounts
# https://plaid.com/docs/#balance


@app.route("/api/balance", methods=["GET"])
def get_balance():
    try:
        request = AccountsBalanceGetRequest(access_token=access_token)
        response = client.accounts_balance_get(request)
        pretty_print_response(response.to_dict())
        return jsonify(response.to_dict())
    except plaid.ApiException as e:
        error_response = format_error(e)
        return jsonify(error_response)


def pretty_print_response(response):
    print(json.dumps(response, indent=2, sort_keys=True, default=str))


def create_formatted_error(status_code: int, error_message: str):
    return {
        "error": {
            "status_code": status_code,
            "display_message": error_message,
            "error_code": status_code,
            "error_type": "",
        }
    }


def format_error(e):
    response = json.loads(e.body)
    return {
        "error": {
            "status_code": e.status,
            "display_message": response["error_message"],
            "error_code": response["error_code"],
            "error_type": response["error_type"],
        }
    }


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 8000)))
