from flask import Blueprint, request, jsonify
from http import HTTPStatus

from utils.route_utils import (
    create_model_request,
    delete_model_request,
    update_model_request,
    safe_route,
)
from utils.error_utils import (
    error_response,
)
from utils.model_utils import (
    list_instances_of_model,
)
from models.budget.budget import Budget
from models import db


budget_bp = Blueprint("budget", __name__, url_prefix="/api/budget")


@budget_bp.route("", methods=["POST"])
@safe_route
def create_budget():
    return create_model_request(Budget, request)


@budget_bp.route("", methods=["PUT"])
@safe_route
def update_budget():
    return update_model_request(Budget, request)


@budget_bp.route("", methods=["GET"])
@safe_route
def get_budgets():
    return jsonify(list_instances_of_model(Budget))


@budget_bp.route("/<string:budget_id>", methods=["DELETE"])
@safe_route
def delete_budget(budget_id: str):
    return delete_model_request(Budget, budget_id)
