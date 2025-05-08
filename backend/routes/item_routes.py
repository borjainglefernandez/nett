from datetime import datetime
from sqlite3 import IntegrityError
from flask import Blueprint, request, jsonify, current_app
from http import HTTPStatus

import plaid
from models.account.account import Account
from models.institution.institution import Institution
from models.item.item import Item
from models import db
from utils.model_utils import (
    create_model_instance_from_dict,
    list_instances_of_model,
)
from utils.error_utils import (
    error_response,
)
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest


item_bp = Blueprint("item", __name__, url_prefix="/api/item")


from datetime import datetime
from sqlite3 import IntegrityError
from flask import Blueprint, request, jsonify, current_app
from http import HTTPStatus

import plaid
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
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest


item_bp = Blueprint("item", __name__, url_prefix="/api/item")


@item_bp.route("", methods=["POST"])
def create_item():
    data = request.get_json()
    access_token = data["access_token"]
    plaid_client = current_app.config["plaid_client"]

    try:
        # Create item
        get_item_request = ItemGetRequest(access_token=access_token)
        get_item_response = plaid_client.item_get(get_item_request)
        item_dict = get_item_response["item"].to_dict()

        item_dict["access_token"] = access_token
        item_dict["id"] = item_dict["item_id"]
        item = create_model_instance_from_dict(Item, item_dict, db.session)

        # Create item's institution
        institution_dict = {
            "id": item_dict["institution_id"],
            "name": item_dict["institution_name"],
        }
        institution = create_model_instance_from_dict(
            Institution, institution_dict, db.session
        )

        # Add item's accounts
        account_balance_request = AccountsBalanceGetRequest(access_token=access_token)
        account_balance_response = plaid_client.accounts_balance_get(
            account_balance_request
        )
        plaid_accounts = account_balance_response["accounts"]

        accounts = []
        for plaid_account in plaid_accounts:
            balances = plaid_account["balances"]
            account_dict = {
                "id": plaid_account.get("persistent_account_id")
                or plaid_account.get("account_id"),
                "name": plaid_account.get("name"),
                "balance": balances.get("available") or 0.0,
                "limit": balances.get("limit") or 0.0,
                "last_updated": datetime.now(),
                "institution_id": institution.id,
                "item_id": item.id,
                "account_type": str(plaid_account.get("type")),
                "account_subtype": str(plaid_account.get("subtype")),
            }
            account = create_model_instance_from_dict(Account, account_dict, db.session)
            accounts.append(account)

        return jsonify([account.to_dict() for account in accounts])

    except plaid.ApiException as e:
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            f"Plaid API error: {e.status} - {e.message}",
        )

    except IntegrityError as e:
        db.session.rollback()
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            str(e),
        )

    except Exception as e:
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            str(e),
        )


@item_bp.route("", methods=["GET"])
def get_items():
    try:
        return jsonify(list_instances_of_model(Item, db.session))
    except Exception as e:
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            str(e),
        )
