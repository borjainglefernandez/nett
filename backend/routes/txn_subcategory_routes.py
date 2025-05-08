from flask import Blueprint, request, jsonify
from http import HTTPStatus

from utils.route_utils import (
    create_model_request,
    get_model_request,
    update_model_request,
)
from utils.error_utils import (
    error_response,
)
from models.transaction.txn import Txn
from models.transaction.txn_subcategory import TxnSubcategory
from models import db


txn_subcategory_bp = Blueprint(
    "txn_subcategory", __name__, url_prefix="/api/subcategory"
)


@txn_subcategory_bp.route("", methods=["POST"])
def create_subcategory():
    return create_model_request(TxnSubcategory, request, db.session)


@txn_subcategory_bp.route("", methods=["PUT"])
def update_subcategory():
    return update_model_request(TxnSubcategory, request, db.session)


@txn_subcategory_bp.route("/<string:subcategory_id>", methods=["DELETE"])
def delete_subcategory(subcategory_id: str):
    subcategory = db.session.query(TxnSubcategory).get(subcategory_id)
    if not subcategory:
        return error_response(
            HTTPStatus.NOT_FOUND.value, f"Subcategory {subcategory_id} not found"
        )

    # Check if there are any transactions associated with the subcategory
    transactions = db.session.query(Txn).filter_by(subcategory_id=subcategory_id).all()
    if transactions:
        return error_response(
            HTTPStatus.BAD_REQUEST.value,
            "Cannot delete subcategory with associated transactions.",
        )

    db.session.delete(subcategory)
    db.session.commit()
    return (
        jsonify({"message": "Subcategory deleted successfully"}),
        HTTPStatus.OK.value,
    )


@txn_subcategory_bp.route("/<string:subcategory_id>", methods=["GET"])
def get_subcategory(subcategory_id: str):
    try:
        return get_model_request(TxnSubcategory, subcategory_id, db.session)
    except Exception as e:
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            str(e),
        )
