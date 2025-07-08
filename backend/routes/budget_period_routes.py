from flask import Blueprint, request, jsonify

from sqlalchemy import func

from models.period.period_utils import get_totals_by_frequency
from models.budget.budget import Budget
from models.budget.budget_frequency import BudgetFrequency
from models.budget.budget_utils import (
    generate_budget_periods_for_budget,
)
from utils.route_utils import safe_route
from models.transaction.txn import Txn
from models import db


budget_period_routes = Blueprint(
    "budget_period", __name__, url_prefix="/api/budget_period"
)


def parse_frequency(frequency_str):
    try:
        return BudgetFrequency(frequency_str)
    except ValueError:
        raise ValueError(f"Frequency {frequency_str} not supported")


@budget_period_routes.route("", methods=["GET"])
@safe_route
def get_budget_period():
    budget_freq = parse_frequency(request.args.get("frequency", ""))

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


@budget_period_routes.route("/total", methods=["GET"])
@safe_route
def get_total():
    freq = parse_frequency(request.args.get("frequency", ""))
    periods = get_totals_by_frequency(freq)
    return jsonify([period.to_dict() for period in periods])
