from datetime import datetime, timedelta

from sqlalchemy import func
from models import db
from models.transaction.txn import Txn
from models.budget.budget import Budget
from models.budget.budget_frequency import BudgetFrequency
from models.budget.budget_period import BudgetPeriod


def get_frequency_period_start_date(
    frequency: BudgetFrequency, date: datetime
) -> datetime:
    if frequency == BudgetFrequency.WEEKLY:
        return date - timedelta(days=date.weekday())

    elif frequency == BudgetFrequency.MONTHLY:
        return date.replace(day=1)

    elif frequency == BudgetFrequency.YEARLY:
        return date.replace(month=1, day=1)

    else:
        raise ValueError(f"Unsupported frequency: {frequency}")


def get_frequency_period_end_date(
    frequency: BudgetFrequency, date: datetime
) -> datetime:
    if frequency == BudgetFrequency.WEEKLY:
        return date + timedelta(days=6 - date.weekday())

    elif frequency == BudgetFrequency.MONTHLY:
        next_month = date.replace(day=1) + timedelta(days=31)
        return next_month.replace(day=1) - timedelta(days=1)

    elif frequency == BudgetFrequency.YEARLY:
        return date.replace(month=12, day=31)

    else:
        raise ValueError(f"Unsupported frequency: {frequency}")


def calculate_spent_amount_for_period(
    budget: Budget, start: datetime, end: datetime
) -> float:
    query = Txn.query.filter(
        Txn.date >= start, Txn.date <= end, Txn.category_id == budget.category_id
    )
    return float(sum(txn.amount for txn in query.all()))


def calculate_spent_amount_for_period_for_budget(
    budget: Budget, start: datetime, end: datetime
) -> float:
    query = Txn.query.filter(
        Txn.date >= start, Txn.date <= end, Txn.category_id == budget.category_id
    )
    if budget.subcategory_id:
        query = query.filter(Txn.subcategory_id == budget.subcategory_id)

    return float(sum(txn.amount for txn in query.all()))


def generate_budget_periods_for_budget(budget: Budget, start_date: datetime) -> list:
    periods = []
    today = datetime.today()

    current_start = get_frequency_period_start_date(budget.frequency, start_date)
    current_end = get_frequency_period_end_date(budget.frequency, current_start)

    while current_start <= today:
        spent_amount = calculate_spent_amount_for_period_for_budget(
            budget, current_start, current_end
        )

        period = BudgetPeriod(
            start_date=current_start,
            end_date=current_end,
            budget=budget,
            spent_amount=spent_amount,
        )
        periods.append(period)

        # Advance to next period
        next_start = get_frequency_period_end_date(
            budget.frequency, current_start
        ) + timedelta(days=1)
        current_start = get_frequency_period_start_date(budget.frequency, next_start)
        current_end = get_frequency_period_end_date(budget.frequency, current_start)

    return periods
