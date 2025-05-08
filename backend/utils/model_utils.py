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


def create_model_instance_from_dict(model_class, data: dict, session):
    """
    Creates a new SQLAlchemy model instance from a dictionary.
    Handles direct fields and relationships (if session is provided).
    """
    print(f"\n📦 Creating instance of {model_class.__name__}")
    mapper = inspect(model_class)
    model_columns = {column.key for column in mapper.columns}
    relationships = {rel.key: rel.mapper.class_ for rel in mapper.relationships}

    print(f"📋 Model columns: {model_columns}")
    print(f"🔗 Model relationships: {list(relationships.keys())}")
    print("📨 Received data:")
    pprint(data)

    # ✅ Check required fields
    if not has_required_fields_for_model(data, model_class):
        required_msg = required_fields_for_model_str(model_class)
        print(f"❌ Missing required fields: {required_msg}")
        raise ValueError(required_msg)

    init_kwargs = {}

    # ❗ Check for existing instance by primary key (typically 'id')
    primary_key = mapper.primary_key[0].name
    if primary_key in data and data[primary_key] is not None:
        print(
            f"🔍 Checking for existing {model_class.__name__} with {primary_key}={data[primary_key]}"
        )
        existing = session.get(model_class, data[primary_key])
        print(f"🔍 Existing instance: {existing}")
        if existing:
            print(
                f"❌ Duplicate detected for {model_class.__name__} with {primary_key}={data[primary_key]}"
            )
            raise ValueError(
                f"{model_class.__name__} with {primary_key}={data[primary_key]} already exists."
            )

    print(data.items())
    for key, value in data.items():
        if key in model_columns:
            print(f"✅ Processing column field: {key} = {value}")
            # Type conversion for Decimal, datetime, etc.
            if isinstance(getattr(model_class, key, None), InstrumentedAttribute):
                try:
                    col_type = getattr(model_class, key).property.columns[0].type
                    if isinstance(col_type.python_type, type) and value is not None:
                        value = col_type.python_type(value)
                except Exception as e:
                    print(f"⚠️ Type conversion failed for '{key}': {e}")

            init_kwargs[key] = value

        elif key in relationships:
            print(f"🔄 Resolving relationship: {key}")
            if session is None:
                raise ValueError(
                    f"Cannot resolve relationship '{key}' without a session"
                )
            if value is None:
                init_kwargs[key] = None
            elif isinstance(value, dict):
                related_model_class = relationships[key]
                related_id = value.get("id")
                related_instance = session.get(related_model_class, related_id)
                if related_instance:
                    print(
                        f"✅ Found related {related_model_class.__name__} with id {related_id}"
                    )
                    init_kwargs[key] = related_instance
                else:
                    print(
                        f"⚠️ Related {related_model_class.__name__} with id {related_id} not found."
                    )
        else:
            print(
                f"⚠️ Warning: Unexpected key '{key}' not in {model_class.__name__}. Ignored."
            )

    print(f"🛠 Init kwargs for {model_class.__name__}:")
    pprint(init_kwargs)

    instance = model_class(**init_kwargs)
    session.add(instance)
    session.commit()
    print(f"✅ {model_class.__name__} instance created and added to session.\n")
    return instance


def update_model_instance_from_dict(instance, data: dict, session=None):
    """
    Updates a SQLAlchemy model instance with values from the given dictionary.
    Handles direct fields and relationships (if session is provided).
    """
    if instance is None:
        raise ValueError("Cannot update a non-existent instance (instance is None).")

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
    session.commit()
    return instance


def list_instances_of_model(model_class, session):
    instances = session.query(model_class).all()
    return [instance.to_dict() for instance in instances]
