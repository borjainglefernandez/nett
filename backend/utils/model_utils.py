from sqlalchemy.inspection import inspect
from sqlalchemy.orm.attributes import InstrumentedAttribute
from pprint import pformat
from utils.logger import get_logger

logger = get_logger(__name__)


def get_required_fields(model):
    mapper = inspect(model)
    required_fields = []

    for column in mapper.columns:
        has_default = column.default is not None or column.server_default is not None
        if not column.nullable and not has_default:
            required_fields.append(column.name)
        elif column.primary_key and not has_default:
            required_fields.append(column.name)

    logger.debug(f"Required fields for {model.__name__}: {required_fields}")
    return required_fields


def has_required_fields_for_model(data, model):
    required_fields = get_required_fields(model)
    missing = [
        field for field in required_fields if field not in data or data[field] is None
    ]
    if missing:
        logger.warning(f"Missing required fields for {model.__name__}: {missing}")
    return not missing


def required_fields_for_model_str(model):
    required_fields = get_required_fields(model)
    return f"Fields {', '.join(required_fields)} are required for {str(model)}"


def create_model_instance_from_dict(model_class, data: dict, session):
    logger.info(f"📦 Creating instance of {model_class.__name__}")
    mapper = inspect(model_class)
    model_columns = {column.key for column in mapper.columns}
    relationships = {rel.key: rel.mapper.class_ for rel in mapper.relationships}

    logger.debug(f"📋 Model columns: {model_columns}")
    logger.debug(f"🔗 Model relationships: {list(relationships.keys())}")
    logger.debug(f"📨 Received data:\n{pformat(data)}")

    if not has_required_fields_for_model(data, model_class):
        required_msg = required_fields_for_model_str(model_class)
        logger.error(f"❌ Missing required fields: {required_msg}")
        raise ValueError(required_msg)

    init_kwargs = {}

    primary_key = mapper.primary_key[0].name
    if primary_key in data and data[primary_key] is not None:
        logger.info(
            f"🔍 Checking for existing {model_class.__name__} with {primary_key}={data[primary_key]}"
        )
        existing = session.get(model_class, data[primary_key])
        logger.debug(f"🔍 Existing instance: {existing}")
        if existing:
            logger.error(
                f"❌ Duplicate detected for {model_class.__name__} with {primary_key}={data[primary_key]}"
            )
            raise ValueError(
                f"{model_class.__name__} with {primary_key}={data[primary_key]} already exists."
            )

    for key, value in data.items():
        if key in model_columns:
            logger.debug(f"✅ Processing column field: {key} = {value}")
            try:
                if isinstance(getattr(model_class, key, None), InstrumentedAttribute):
                    col_type = getattr(model_class, key).property.columns[0].type
                    if isinstance(col_type.python_type, type) and value is not None:
                        value = col_type.python_type(value)
            except Exception as e:
                logger.warning(f"⚠️ Type conversion failed for '{key}': {e}")

            init_kwargs[key] = value

        elif key in relationships:
            logger.debug(f"🔄 Resolving relationship: {key}")
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
                    logger.debug(
                        f"✅ Found related {related_model_class.__name__} with id {related_id}"
                    )
                    init_kwargs[key] = related_instance
                else:
                    logger.warning(
                        f"⚠️ Related {related_model_class.__name__} with id {related_id} not found."
                    )
        else:
            logger.warning(
                f"⚠️ Unexpected key '{key}' not in {model_class.__name__}. Ignored."
            )

    logger.debug(f"🛠 Init kwargs for {model_class.__name__}:\n{pformat(init_kwargs)}")

    instance = model_class(**init_kwargs)
    session.add(instance)
    session.commit()
    logger.info(f"✅ {model_class.__name__} instance created and added to session.")
    return instance


def update_model_instance_from_dict(instance, data: dict, session=None):
    if instance is None:
        raise ValueError("Cannot update a non-existent instance (instance is None).")

    logger.info(f"🔄 Updating instance of {instance.__class__.__name__}")
    mapper = inspect(instance.__class__)
    model_columns = {column.key for column in mapper.columns}
    relationships = {rel.key: rel.mapper.class_ for rel in mapper.relationships}

    for key, value in data.items():
        if key in model_columns:
            try:
                if isinstance(
                    getattr(instance.__class__, key, None), InstrumentedAttribute
                ):
                    col_type = getattr(instance.__class__, key).property.columns[0].type
                    if isinstance(col_type.python_type, type) and value is not None:
                        value = col_type.python_type(value)
            except Exception as e:
                logger.warning(f"⚠️ Type conversion failed for '{key}': {e}")
            setattr(instance, key, value)
            logger.debug(f"📝 Set {key} = {value}")

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
                    logger.debug(
                        f"🔗 Set relationship {key} to {related_model_class.__name__}({value.get('id')})"
                    )
                else:
                    logger.warning(
                        f"⚠️ Related {related_model_class.__name__} with id {value.get('id')} not found."
                    )

    session.commit()
    logger.info(f"✅ {instance.__class__.__name__} instance updated.")
    return instance


def list_instances_of_model(model_class, session):
    logger.info(f"📄 Listing all instances of {model_class.__name__}")
    instances = session.query(model_class).all()
    logger.debug(f"Found {len(instances)} instances.")
    return [instance.to_dict() for instance in instances]
