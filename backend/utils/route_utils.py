from http import HTTPStatus
from flask import jsonify

from utils.error_utils import error_response
from utils.model_utils import (
    create_model_instance_from_dict,
    update_model_instance_from_dict,
)


def create_model_request(model, request, session):
    try:
        data = request.get_json()
        data.pop("id", None)
        create_model_instance_from_dict(model, data, session)
        return jsonify({}), HTTPStatus.OK.value

    except Exception as e:
        session.rollback()
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            str(e),
        )


def update_model_request(model, request, session):
    try:
        data = request.get_json()
        model_id = data["id"]
        model_instance = session.get(model, model_id)
        if not model_instance:
            return error_response(
                HTTPStatus.NOT_FOUND, f"{model.__name__} {model_id} not found."
            )
        update_model_instance_from_dict(model_instance, data, session)
        return jsonify({}), HTTPStatus.OK.value

    except Exception as e:
        session.rollback()
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            str(e),
        )


def delete_model_request(model, model_id, session):
    try:
        model_instance = session.get(model, model_id)
        if not model_instance:
            return error_response(
                HTTPStatus.NOT_FOUND, f"{model.__name__} {model_id} not found."
            )
        session.delete(model_instance)
        session.commit()
        return jsonify({}), HTTPStatus.OK.value

    except Exception as e:
        session.rollback()
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            str(e),
        )
