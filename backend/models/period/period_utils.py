from datetime import datetime, timedelta

from sqlalchemy import func
from models.period.period import Period
from models.budget.budget_frequency import BudgetFrequency
from models.budget.budget_utils import (
    get_frequency_period_end_date,
    get_frequency_period_start_date,
)
from models.transaction.txn import Txn
from models import db


def get_oldest_transaction_date() -> datetime:
    # Assuming Txn is a SQLAlchemy model and has a date field
    oldest_txn = Txn.query.order_by(Txn.date).first()
    if oldest_txn:
        return oldest_txn.date
    else:
        raise ValueError("No transactions found in the database.")


def get_spent_amounts_by_frequency(frequency: BudgetFrequency) -> list[dict]:
    try:
        start_date = get_oldest_transaction_date()
    except ValueError:
        return []  # No transactions found

    today = datetime.today()
    current_start = get_frequency_period_start_date(frequency, start_date)
    periods = []

    while current_start <= today:
        current_end = get_frequency_period_end_date(frequency, current_start)

        # Sum all transactions in this period
        total = (
            db.session.query(func.sum(Txn.amount))
            .filter(Txn.date >= current_start, Txn.date <= current_end)
            .scalar()
            or 0.0
        )

        periods.append(
            Period(
                start_date=current_start,
                end_date=current_end,
                spent_amount=total,
            )
        )

        # Move to next period
        current_start = current_end + timedelta(days=1)
        current_start = get_frequency_period_start_date(frequency, current_start)

    return periods
