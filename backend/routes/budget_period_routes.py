from flask import Blueprint, request, jsonify
from http import HTTPStatus

from sqlalchemy import func

from models.budget.budget import Budget
from models.budget.budget_frequency import BudgetFrequency
from models.budget.budget_utils import generate_budget_periods_for_budget
from utils.error_utils import (
    error_response,
)
from utils.route_utils import safe_route
from models.transaction.txn import Txn
from models import db


budget_period_routes = Blueprint(
    "budget_period", __name__, url_prefix="/api/budget_period"
)


@budget_period_routes.route("", methods=["GET"])
@safe_route
def get_budget_period():
    freq_str = request.args.get("frequency", "")
    try:
        budget_freq = BudgetFrequency(freq_str)
    except ValueError:
        return error_response(
            HTTPStatus.BAD_REQUEST, f"Frequency {freq_str} not supported"
        )

    # Get earliest transaction date
    first_txn_date = db.session.query(func.min(Txn.date)).scalar()
    if not first_txn_date:
        return jsonify([])  # No transactions to build periods from

    budgets = Budget.query.filter_by(frequency=budget_freq).all()
    all_periods = []

    for budget in budgets:
        periods = generate_budget_periods_for_budget(budget, first_txn_date)
        all_periods.extend([p.to_dict() for p in periods])

    return jsonify(all_periods)
