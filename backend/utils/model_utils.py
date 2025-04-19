from sqlalchemy.inspection import inspect
from sqlalchemy.orm.attributes import InstrumentedAttribute
from pprint import pprint


def get_required_fields(model):
    mapper = inspect(model)
    required_fields = []

    for column in mapper.columns:
        has_default = column.default is not None or column.server_default is not None
        if not column.nullable and not has_default:
            required_fields.append(column.name)
        elif column.primary_key and not has_default:
            required_fields.append(column.name)

    return required_fields


def has_required_fields_for_model(data, model):
    required_fields = get_required_fields(model)
    missing = [
        field for field in required_fields if field not in data or data[field] is None
    ]
    return not missing


def required_fields_for_model_str(model):
    required_fields = get_required_fields(model)
    return f"Fields {', '.join(required_fields)} are required for {str(model)}"


def create_model_instance_from_dict(model_class, data: dict, session=None):
    """
    Creates a new SQLAlchemy model instance from a dictionary.
    Handles direct fields and relationships (if session is provided).
    """
    mapper = inspect(model_class)
    model_columns = {column.key for column in mapper.columns}
    relationships = {rel.key: rel.mapper.class_ for rel in mapper.relationships}

    init_kwargs = {}
    pprint(data)
    for key, value in data.items():
        if key in model_columns:
            # Type conversion for Decimal, datetime, etc.
            if isinstance(getattr(model_class, key, None), InstrumentedAttribute):
                col_type = getattr(model_class, key).property.columns[0].type
                if isinstance(col_type.python_type, type) and value is not None:
                    try:
                        value = col_type.python_type(value)
                    except Exception:
                        pass  # Leave as is if conversion fails

            init_kwargs[key] = value

        elif key in relationships:
            if session is None:
                raise ValueError(
                    f"Cannot resolve relationship '{key}' without a session"
                )
            if value is None:
                init_kwargs[key] = None
            elif isinstance(value, dict):
                related_model_class = relationships[key]
                related_instance = session.get(related_model_class, value.get("id"))
                if related_instance:
                    init_kwargs[key] = related_instance
                else:
                    print(
                        f"Warning: Related {related_model_class.__name__} with id {value.get('id')} not found."
                    )

    return model_class(**init_kwargs)


def update_model_instance_from_dict(instance, data: dict, session=None):
    """
    Updates a SQLAlchemy model instance with values from the given dictionary.
    Handles direct fields and relationships (if session is provided).
    """
    mapper = inspect(instance.__class__)
    model_columns = {column.key for column in mapper.columns}
    relationships = {rel.key: rel.mapper.class_ for rel in mapper.relationships}

    for key, value in data.items():
        if key in model_columns:
            # Type conversion for Decimal, datetime, etc.
            if isinstance(
                getattr(instance.__class__, key, None), InstrumentedAttribute
            ):
                col_type = getattr(instance.__class__, key).property.columns[0].type
                if isinstance(col_type.python_type, type) and value is not None:
                    try:
                        value = col_type.python_type(value)
                    except Exception:
                        pass  # Leave as is if conversion fails

            setattr(instance, key, value)

        elif key in relationships:
            if session is None:
                raise ValueError(
                    f"Cannot resolve relationship '{key}' without a session"
                )
            if value is None:
                setattr(instance, key, None)
            elif isinstance(value, dict):
                related_model_class = relationships[key]
                related_instance = session.get(related_model_class, value.get("id"))
                if related_instance:
                    setattr(instance, key, related_instance)
                else:
                    print(
                        f"Warning: Related {related_model_class.__name__} with id {value.get('id')} not found."
                    )
