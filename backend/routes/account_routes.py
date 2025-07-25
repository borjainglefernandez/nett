from flask import Blueprint, request, jsonify
from http import HTTPStatus
from models.account.account import Account
from utils.route_utils import safe_route, update_model_request
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
    return jsonify(list_instances_of_model(Account))


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
