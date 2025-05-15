from datetime import datetime
from typing import Optional


class Period:
    def __init__(
        self,
        start_date: datetime,
        end_date: datetime,
        spent_amount: Optional[float] = 0.0,
    ):
        self.start_date = start_date
        self.end_date = end_date
        self._spent_amount = spent_amount

    def to_dict(self) -> dict:
        return {
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "spent_amount": self._spent_amount,
        }
