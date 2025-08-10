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


@account_bp.route("/<string:account_id>", methods=["DELETE"])
@safe_route
def delete_account(account_id: str):
    account = db.session.get(Account, account_id)
    if not account:
        return error_response(HTTPStatus.NOT_FOUND, f"Account {account_id} not found.")

    # Get the parent Item before deleting the account
    item = account.item
    institution = account.institution

    # Delete the account
    db.session.delete(account)
    db.session.commit()

    # If the parent Item has no more accounts, delete it too
    if not item.accounts:
        db.session.delete(item)
        db.session.commit()

    # If the parent Institution has no more items, delete it too
    if not institution.items:
        db.session.delete(institution)
        db.session.commit()

    return jsonify({}), HTTPStatus.OK
