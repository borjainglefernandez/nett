from datetime import datetime, timedelta
from backend.models.budget.budget import Budget
from backend.models.budget.budget_frequency import BudgetFrequency


def get_budget_start_date(budget: Budget, date: datetime) -> datetime:
    if budget.frequency == BudgetFrequency.WEEKLY:
        return date - timedelta(days=date.weekday())

    elif budget.frequency == BudgetFrequency.MONTHLY:
        return date.replace(day=1)

    elif budget.frequency == BudgetFrequency.YEARLY:
        return date.replace(month=1, day=1)

    else:
        raise ValueError(f"Unsupported frequency: {budget.frequency}")

def get_budget_end_date(budget: Budget, date: datetime) -> datetime:
    if budget.frequency == BudgetFrequency.WEEKLY:
        return date + timedelta(days=6 - date.weekday())

    elif budget.frequency == BudgetFrequency.MONTHLY:
        next_month = date.replace(day=1) + timedelta(days=31)
        return next_month.replace(day=1) - timedelta(days=1)

    elif budget.frequency == BudgetFrequency.YEARLY:
        return date.replace(month=12, day=31)

    else:
        raise ValueError(f"Unsupported frequency: {budget.frequency}")
    
