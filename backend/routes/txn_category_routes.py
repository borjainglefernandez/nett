from flask import Blueprint, request, jsonify
from http import HTTPStatus

from utils.route_utils import (
    create_model_request,
    update_model_request,
    safe_route,
)
from utils.error_utils import (
    error_response,
)
from utils.model_utils import (
    list_instances_of_model,
)
from models.transaction.txn import Txn
from models.transaction.txn_category import TxnCategory
from models import db


txn_category_bp = Blueprint("txn_category", __name__, url_prefix="/api/category")


@txn_category_bp.route("", methods=["POST"])
@safe_route
def create_category():
    return create_model_request(TxnCategory, request)


@txn_category_bp.route("", methods=["PUT"])
@safe_route
def update_category():
    return update_model_request(TxnCategory, request)


@txn_category_bp.route("/<string:category_id>", methods=["DELETE"])
@safe_route
def delete_category(category_id: str):
    category = db.session.query(TxnCategory).get(category_id)
    if not category:
        return error_response(
            HTTPStatus.NOT_FOUND.value, f"Category {category_id} not found"
        )

    # Check if there are any transactions associated with the category
    transactions = db.session.query(Txn).filter_by(category_id=category_id).all()
    if transactions:
        return error_response(
            HTTPStatus.BAD_REQUEST.value,
            "Cannot delete category with associated transactions.",
        )

    db.session.delete(category)
    db.session.commit()
    return (
        jsonify({"message": "Category and its subcategories deleted successfully"}),
        HTTPStatus.OK.value,
    )


@txn_category_bp.route("", methods=["GET"])
@safe_route
def get_categories():
    return jsonify(list_instances_of_model(TxnCategory))
