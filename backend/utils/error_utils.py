from flask import jsonify


def error_response(status_code: int, display_message: str):
    return (
        jsonify(
            {
                "status_code": status_code,
                "display_message": display_message,
            }
        ),
        status_code,
    )
