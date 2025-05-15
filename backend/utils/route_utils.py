from functools import wraps
from http import HTTPStatus
from flask import jsonify

from utils.error_utils import error_response
from utils.model_utils import (
    create_model_instance_from_dict,
    update_model_instance_from_dict,
)
from utils.logger import get_logger
from models import db

logger = get_logger(__name__)


def safe_route(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            db.session.rollback()
            return error_response(
                HTTPStatus.INTERNAL_SERVER_ERROR.value,
                str(e),
            )

    return wrapper


def get_model_request(model, model_id):
    model_instance = db.session.get(model, model_id)
    if not model_instance:
        return error_response(
            HTTPStatus.NOT_FOUND.value, f"{model.__name__} {model_id} not found."
        )
    return jsonify(model_instance.to_dict()), HTTPStatus.OK.value



def create_model_request(model, request):
    data = request.get_json()
    data.pop("id", None)
    create_model_instance_from_dict(model, data)
    return jsonify({}), HTTPStatus.OK.value


def update_model_request(model, request):
    data = request.get_json()
    model_id = data["id"]
    model_instance = db.session.get(model, model_id)
    if not model_instance:
        return error_response(
            HTTPStatus.NOT_FOUND, f"{model.__name__} {model_id} not found."
        )
    update_model_instance_from_dict(model_instance, data)
    return jsonify({}), HTTPStatus.OK.value


def delete_model_request(model, model_id):
    model_instance = db.session.get(model, model_id)
    if not model_instance:
        return error_response(
            HTTPStatus.NOT_FOUND, f"{model.__name__} {model_id} not found."
        )
    db.session.delete(model_instance)
    db.session.commit()
    return jsonify({}), HTTPStatus.OK.value
