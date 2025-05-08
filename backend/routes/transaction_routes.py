from flask import Blueprint, request, jsonify
from http import HTTPStatus

from utils.route_utils import (
    create_model_request,
    delete_model_request,
    update_model_request,
)
from utils.error_utils import (
    error_response,
)
from utils.model_utils import (
    list_instances_of_model,
)
from models.transaction.txn import Txn
from models import db


transaction_bp = Blueprint("transaction", __name__, url_prefix="/api/transaction")


@transaction_bp.route("", methods=["POST"])
def create_transaction():
    return create_model_request(Txn, request, db.session)


@transaction_bp.route("", methods=["PUT"])
def update_transaction():
    return update_model_request(Txn, request, db.session)


@transaction_bp.route("", methods=["GET"])
def get_transactions():
    try:
        return jsonify(list_instances_of_model(Txn, db.session))
    except Exception as e:
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            str(e),
        )


@transaction_bp.route("/<string:txn_id>", methods=["DELETE"])
def delete_transaction(txn_id: str):
    return delete_model_request(Txn, txn_id, db.session)
