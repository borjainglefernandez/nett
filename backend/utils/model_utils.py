from sqlalchemy.inspection import inspect
from sqlalchemy.orm.attributes import InstrumentedAttribute
from pprint import pprint


def get_required_fields(model):
    mapper = inspect(model)
    required_fields = []

    for column in mapper.columns:
        # Primary keys are usually required even if nullable=True
        if not column.nullable or column.primary_key:
            required_fields.append(column.name)

    return required_fields


def validate_required_fields_for_model(data, model):
    required_fields = get_required_fields(model)
    print(required_fields)
    print(data)
    missing = [
        field for field in required_fields if field not in data or data[field] is None
    ]
    return missing


def required_fields_for_model_str(model):
    required_fields = get_required_fields(model)
    return f"Fields {', '.join(required_fields)} are required for {str(model)}"


def update_model_instance_from_dict(instance, data: dict, session=None):
    """
    Updates a SQLAlchemy model instance with values from the given dictionary.
    Handles direct fields and relationships (if session is provided).
    """
    mapper = inspect(instance.__class__)
    model_columns = {column.key for column in mapper.columns}
    relationships = {rel.key: rel.mapper.class_ for rel in mapper.relationships}

    print("\nBefore update:")
    pprint(instance)

    for key, value in data.items():
        if key in model_columns:
            # Type conversion for Decimal, datetime, etc. (optional, depending on your data format)
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

        elif key in relationships and isinstance(value, dict):
            # Fetch related model by ID from the database
            related_model_class = relationships[key]
            if session is None:
                raise ValueError(
                    f"Cannot resolve relationship '{key}' without a session"
                )

            related_instance = session.get(related_model_class, value.get("id"))
            if related_instance:
                setattr(instance, key, related_instance)
            else:
                print(
                    f"Warning: Related {related_model_class.__name__} with id {value.get('id')} not found."
                )

    print("\nAfter update:")
    pprint(instance)
