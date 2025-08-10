from datetime import datetime
from decimal import Decimal
import os
from sqlite3 import IntegrityError
import time
from flask import Blueprint, request, jsonify, current_app
from http import HTTPStatus

from plaid.model.country_code import CountryCode
from models.account.account import Account
from models.institution.institution import Institution

from models import db
from utils.model_utils import (
    create_model_instance_from_dict,
    list_instances_of_model,
)
from utils.error_utils import (
    error_response,
)
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from models.transaction.payment_channel import PaymentChannel
from models.account.account import Account
from models.item.item import Item
from sqlalchemy.exc import IntegrityError
from models.transaction.txn_category import TxnCategory
from models.transaction.txn_subcategory import TxnSubcategory
from models.transaction.txn import Txn
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from utils.logger import get_logger

item_bp = Blueprint("item", __name__, url_prefix="/api/item")
logger = get_logger(__name__)

from datetime import datetime
from sqlite3 import IntegrityError
from flask import Blueprint, request, jsonify, current_app
from http import HTTPStatus

from models.account.account import Account
from models.institution.institution import Institution
from models.item.item import Item
from models import db
from utils.model_utils import (
    create_model_instance_from_dict,
)
from utils.error_utils import (
    error_response,
)
from plaid.model.item_get_request import ItemGetRequest
from utils.route_utils import safe_route

item_bp = Blueprint("item", __name__, url_prefix="/api/item")


@item_bp.route("", methods=["POST"])
@safe_route
def create_item():
    data = request.get_json()
    access_token = data["access_token"]
    plaid_client = current_app.config["plaid_client"]

    # Create item
    get_item_request = ItemGetRequest(access_token=access_token)
    get_item_response = plaid_client.item_get(get_item_request)
    item_dict = get_item_response["item"].to_dict()

    item_dict["access_token"] = access_token
    item_dict["id"] = item_dict["item_id"]
    item = create_model_instance_from_dict(Item, item_dict, fail_on_duplicate=False)

    # Get item's insitution details
    institution_id = item_dict["institution_id"]
    get_institution_by_id_request = InstitutionsGetByIdRequest(
        institution_id=institution_id,
        country_codes=list(
            map(
                lambda x: CountryCode(x),
                os.getenv("PLAID_COUNTRY_CODES", "US").split(","),
            )
        ),
        options={
            "include_optional_metadata": True,
        },
    )
    get_institution_response = plaid_client.institutions_get_by_id(
        get_institution_by_id_request
    )
    institution_dict = get_institution_response["institution"].to_dict()

    # Create item's institution
    institution_dict = {
        "id": item_dict["institution_id"],
        "name": item_dict["institution_name"],
        "logo": institution_dict.get("logo", None),
    }
    institution = create_model_instance_from_dict(
        Institution, institution_dict, fail_on_duplicate=False
    )

    # Add item's accounts
    account_get_request = AccountsGetRequest(access_token=access_token)
    account_balance_response = plaid_client.accounts_get(account_get_request)
    plaid_accounts = account_balance_response["accounts"]

    accounts = []
    for plaid_account in plaid_accounts:
        balances = plaid_account["balances"]
        logger.debug(f"Processing account: {plaid_account}")
        account_dict = {
            "id": plaid_account.get("persistent_account_id")
            or plaid_account.get("account_id"),
            "name": plaid_account.get(
                "official_name", plaid_account.get("name", "Unnamed")
            )
            + "-"
            + plaid_account.get("mask", ""),
            "original_name": plaid_account.get("name", "Unnamed"),
            "balance": balances.get("available") or 0.0,
            "limit": balances.get("limit") or 0.0,
            "last_updated": datetime.now(),
            "institution_id": institution.id,
            "item_id": item.id,
            "account_type": str(plaid_account.get("type")),
            "account_subtype": str(plaid_account.get("subtype")),
        }
        account = create_model_instance_from_dict(
            Account, account_dict, fail_on_duplicate=False
        )
        accounts.append(account)

    return jsonify([account.to_dict() for account in accounts])


@item_bp.route("", methods=["GET"])
@safe_route
def get_items():
    return jsonify(list_instances_of_model(Item))


@item_bp.route("/<item_id>/sync", methods=["POST"])
@safe_route
def sync_item_transactions(item_id: str):
    item = Item.query.filter_by(id=item_id).one_or_none()

    if not item:
        return error_response(
            HTTPStatus.NOT_FOUND.value,
            f"Could not find item with id {item_id}.",
        )

    plaid_client = current_app.config["plaid_client"]
    try:
        requested_retries = min(int(request.get_json().get("retries", 1)), 10)
    except ValueError:
        requested_retries = 3
    retries = min(requested_retries, 10)
    delay_seconds = 2
    attempt = 0
    added = []
    modified = []
    removed = []
    cursor = item.cursor

    while attempt < retries:
        current_cursor = cursor
        has_more = True

        while has_more:
            sync_request = TransactionsSyncRequest(
                access_token=item.access_token,
                cursor=current_cursor,
            )
            response = plaid_client.transactions_sync(sync_request).to_dict()

            added.extend(response["added"])
            modified.extend(response["modified"])
            removed.extend(response["removed"])

            has_more = response["has_more"]
            current_cursor = response["next_cursor"]

            if current_cursor == "":
                time.sleep(delay_seconds)
                continue

        # Break retry loop if any transactions were found
        if added or modified or removed:
            cursor = current_cursor  # save the updated cursor
            break

        attempt += 1
        logger.info(f"No transactions found. Retry attempt {attempt}...")
        time.sleep(delay_seconds)

    handle_added_transactions(added)
    handle_modified_transactions(modified)
    handle_removed_transactions(removed)

    # Update item cursor only if it changed
    if cursor and cursor != item.cursor:
        item.cursor = cursor
        db.session.commit()

    accounts = Account.query.all()
    return jsonify([account.get_transactions() for account in accounts])


def handle_added_transactions(transactions: list):
    logger.info(f"Handling {len(transactions)} new transactions")

    for i, transaction in enumerate(transactions):
        logger.debug(
            f"\nProcessing transaction {i + 1}/{len(transactions)}: ID {transaction.get('transaction_id')}"
        )

        existing_txn = db.session.query(Txn).get(transaction["transaction_id"])
        if existing_txn:
            logger.debug(
                f"Transaction {transaction['transaction_id']} already exists, skipping."
            )
            continue

        account = db.session.query(Account).get(transaction["account_id"])
        if not account:
            logger.warning(
                f"Account {transaction['account_id']} not found, skipping transaction."
            )
            continue

        # Extract category and subcategory
        personal_finance = transaction.get("personal_finance_category", {})
        primary_category_name = personal_finance.get("primary", "OTHER").strip()
        detailed_category_name = personal_finance.get("detailed", "OTHER").strip()
        logger.debug(
            f"Primary category: {primary_category_name}, Subcategory: {detailed_category_name}"
        )

        # Get or create category
        category = TxnCategory.query.filter_by(name=primary_category_name).one_or_none()
        if not category:
            logger.debug(f"Creating new category: {primary_category_name}")
            category = TxnCategory(name=primary_category_name)
            db.session.add(category)
            db.session.commit()

        # Get or create subcategory
        subcategory = TxnSubcategory.query.filter_by(
            name=detailed_category_name, category_id=category.id
        ).one_or_none()
        if not subcategory:
            logger.debug(
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
            logger.warning(
                f"Invalid payment channel '{transaction.get('payment_channel')}', defaulting to OTHER"
            )
            payment_channel = PaymentChannel.OTHER

        logger.debug(
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
            logger.warning(
                f"Duplicate transaction {transaction['transaction_id']} already exists, skipping."
            )

    logger.info("All new transactions have been processed.")


def handle_modified_transactions(transactions: list):
    logger.info(f"Handling {len(transactions)} modified transactions")


def handle_removed_transactions(transactions: list):
    logger.info(f"Handling {len(transactions)} removed transactions")
