from flask import Blueprint, request, jsonify

from utils.route_utils import (
    create_model_request,
    delete_model_request,
    update_model_request,
    safe_route,
)
from utils.model_utils import (
    list_instances_of_model,
)
from models.transaction.txn import Txn
from models import db


txn_bp = Blueprint("txn", __name__, url_prefix="/api/transaction")


@txn_bp.route("", methods=["POST"])
@safe_route
def create_transaction():
    return create_model_request(Txn, request, db.session)


@txn_bp.route("", methods=["PUT"])
@safe_route
def update_transaction():
    return update_model_request(Txn, request, db.session)


@txn_bp.route("", methods=["GET"])
@safe_route
def get_transactions():
    return jsonify(list_instances_of_model(Txn))


@txn_bp.route("/<string:txn_id>", methods=["DELETE"])
@safe_route
def delete_transaction(txn_id: str):
    return delete_model_request(Txn, txn_id, db.session)
