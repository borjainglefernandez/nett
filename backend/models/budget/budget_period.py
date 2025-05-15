from datetime import datetime
from typing import Optional

from models.period.period import Period


class BudgetPeriod(Period):
    def __init__(
        self,
        start_date: datetime,
        end_date: datetime,
        budget,
        spent_amount: Optional[float] = 0.0,
    ):
        super().__init__(start_date, end_date, spent_amount)
        self._budget = budget
        self._category = budget.category
        self._subcategory = budget.subcategory

    def to_dict(self) -> dict:
        # Add category and subcategory-specific fields
        period_data = super().to_dict()
        period_data.update(
            {
                "category_name": self._category.name,
                "subcategory_name": (
                    self._subcategory.name if self._subcategory else None
                ),
                "limit_amount": self._budget.amount,
            }
        )
        return period_data
