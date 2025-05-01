from datetime import datetime
from typing import Optional


class BudgetPeriod:
    def __init__(
        self,
        start_date: datetime,
        end_date: datetime,
        budget,
        category,
        subcategory: Optional[object] = None,
        spent_amount: Optional[float] = 0.0,
    ):
        self.start_date = start_date
        self.end_date = end_date
        self._budget = budget
        self._category = category
        self._subcategory = subcategory
        self._spent_amount = spent_amount

    def to_dict(self) -> dict:
        return {
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "category_name": self._category.name,
            "subcategory_name": self._subcategory.name if self._subcategory else None,
            "limit_amount": self._budget.amount,
            "spent_amount": self._spent_amount,
        }
