from flask import Blueprint, request, jsonify
from http import HTTPStatus
from models.account.account import Account
from utils.route_utils import safe_route, update_model_request
from models import db
from utils.model_utils import (
    list_instances_of_model,
)
from utils.error_utils import (
    error_response,
)

account_bp = Blueprint("account", __name__, url_prefix="/api/account")


@account_bp.route("", methods=["GET"])
@safe_route
def get_accounts():
    active_accounts = Account.query.filter_by(active=True).all()
    return jsonify([account.to_dict() for account in active_accounts])


@account_bp.route("", methods=["PUT"])
@safe_route
def update_account():
    return update_model_request(Account, request)


@account_bp.route("/<account_id>/transactions", methods=["GET"])
@safe_route
def get_transactions(account_id):
    account = Account.query.filter_by(id=account_id).one_or_none()
    if not account:
        return error_response(
            HTTPStatus.NOT_FOUND.value,
            f"Could not find account with id {account_id}.",
        )
    return jsonify(account.get_transactions())


@account_bp.route("/<string:account_id>", methods=["DELETE"])
@safe_route
def delete_account(account_id: str):
    """Delete account by removing the entire item (bank connection)"""
    account = db.session.get(Account, account_id)
    if not account:
        return error_response(HTTPStatus.NOT_FOUND, f"Account {account_id} not found.")

    # Get the item_id for this account
    item_id = account.item_id

    # Return the item_id so frontend can call the item deletion endpoint
    return (
        jsonify(
            {
                "message": "Account deletion requires removing the entire bank connection",
                "item_id": item_id,
                "action": "delete_item",
            }
        ),
        HTTPStatus.OK,
    )
