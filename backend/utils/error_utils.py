from flask import jsonify
from utils.logger import get_logger

logger = get_logger(__name__)


def error_response(status_code: int, display_message: str):
    logger.error(f"Error {status_code}: {display_message}")
    return (
        jsonify(
            {
                "status_code": status_code,
                "display_message": display_message,
            }
        ),
        status_code,
    )
