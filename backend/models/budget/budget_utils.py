from datetime import datetime, timedelta
from models.transaction.txn import Txn
from models.budget.budget import Budget
from models.budget.budget_frequency import BudgetFrequency
from models.budget.budget_period import BudgetPeriod


def get_budget_period_start_date(budget: Budget, date: datetime) -> datetime:
    if budget.frequency == BudgetFrequency.WEEKLY:
        return date - timedelta(days=date.weekday())

    elif budget.frequency == BudgetFrequency.MONTHLY:
        return date.replace(day=1)

    elif budget.frequency == BudgetFrequency.YEARLY:
        return date.replace(month=1, day=1)

    else:
        raise ValueError(f"Unsupported frequency: {budget.frequency}")


def get_budget_period_end_date(budget: Budget, date: datetime) -> datetime:
    if budget.frequency == BudgetFrequency.WEEKLY:
        return date + timedelta(days=6 - date.weekday())

    elif budget.frequency == BudgetFrequency.MONTHLY:
        next_month = date.replace(day=1) + timedelta(days=31)
        return next_month.replace(day=1) - timedelta(days=1)

    elif budget.frequency == BudgetFrequency.YEARLY:
        return date.replace(month=12, day=31)

    else:
        raise ValueError(f"Unsupported frequency: {budget.frequency}")


def calculate_spent_amount(budget: Budget, start: datetime, end: datetime) -> float:
    query = Txn.query.filter(
        Txn.date >= start, Txn.date <= end, Txn.category_id == budget.category_id
    )
    if budget.subcategory_id:
        query = query.filter(Txn.subcategory_id == budget.subcategory_id)

    return float(sum(txn.amount for txn in query.all()))


def generate_budget_periods_for_budget(budget: Budget, start_date: datetime) -> list:
    periods = []
    today = datetime.today()

    current_start = get_budget_period_start_date(budget, start_date)
    current_end = get_budget_period_end_date(budget, current_start)

    while current_start <= today:
        spent_amount = calculate_spent_amount(budget, current_start, current_end)

        period = BudgetPeriod(
            start_date=current_start,
            end_date=current_end,
            budget=budget,
            category=budget.category,
            subcategory=budget.subcategory,
            spent_amount=spent_amount,
        )
        periods.append(period)

        # Advance to next period
        next_start = get_budget_period_end_date(budget, current_start) + timedelta(
            days=1
        )
        current_start = get_budget_period_start_date(budget, next_start)
        current_end = get_budget_period_end_date(budget, current_start)

    return periods
