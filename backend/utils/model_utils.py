from sqlite3 import IntegrityError
from sqlalchemy.inspection import inspect
from sqlalchemy.orm.attributes import InstrumentedAttribute
from pprint import pformat
from utils.logger import get_logger
from models import db

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


def create_model_instance_from_dict(
    model_class, data: dict, fail_on_duplicate: bool = True
):
    logger.info(f"📦 Creating instance of {model_class.__name__}")
    mapper = inspect(model_class)
    model_columns = {column.key: column for column in mapper.columns}
    relationships = {rel.key: rel.mapper.class_ for rel in mapper.relationships}

    logger.debug(f"📋 Model columns: {set(model_columns.keys())}")
    logger.debug(f"🔗 Model relationships: {list(relationships.keys())}")
    logger.debug(f"📨 Received data:\n{pformat(data)}")

    if not has_required_fields_for_model(data, model_class):
        required_msg = required_fields_for_model_str(model_class)
        logger.error(f"❌ Missing required fields: {required_msg}")
        raise ValueError(required_msg)

    init_kwargs = {}
    primary_key = mapper.primary_key[0].name

    # Check for exact primary key match
    if primary_key in data and data[primary_key] is not None:
        logger.info(
            f"🔍 Checking for existing {model_class.__name__} with {primary_key}={data[primary_key]}"
        )
        existing = db.session.get(model_class, data[primary_key])
        if existing:
            logger.debug(f"🔍 Existing instance: {existing}")
            if fail_on_duplicate:
                logger.error(
                    f"❌ Duplicate detected for {model_class.__name__} with {primary_key}={data[primary_key]}"
                )
                raise ValueError(
                    f"{model_class.__name__} with {primary_key}={data[primary_key]} already exists."
                )
            else:
                logger.warning(
                    f"⚠️ Duplicate found by primary key. Returning existing instance."
                )
                return existing

    # Check for unique constraint violations (e.g., name, original_name)
    if not fail_on_duplicate:
        unique_filter = {}
        for key, column in model_columns.items():
            if column.unique and key in data and data[key] is not None:
                unique_filter[key] = data[key]

        if unique_filter:
            existing_unique = (
                db.session.query(model_class).filter_by(**unique_filter).first()
            )
            if existing_unique:
                logger.warning(
                    f"⚠️ Duplicate found on unique fields {list(unique_filter.keys())}. Returning existing instance."
                )
                return existing_unique

    # Build init kwargs from columns and relationships
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
            if value is None:
                init_kwargs[key] = None
            elif isinstance(value, dict):
                related_model_class = relationships[key]
                related_id = value.get("id")
                related_instance = db.session.get(related_model_class, related_id)
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

    try:
        instance = model_class(**init_kwargs)
        db.session.add(instance)
        db.session.commit()
        logger.info(f"✅ {model_class.__name__} instance created and added to session.")
        return instance
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"❌ IntegrityError during creation: {e}")
        if not fail_on_duplicate:
            # Try to fetch based on the unique fields again
            unique_filter = {
                key: data[key]
                for key, column in model_columns.items()
                if column.unique and key in data
            }
            existing = (
                db.session.query(model_class).filter_by(**unique_filter).first()
                if unique_filter
                else None
            )
            if existing:
                logger.warning(
                    f"⚠️ IntegrityError but found existing instance with unique fields. Returning it."
                )
                return existing
        raise


def update_model_instance_from_dict(instance, data: dict):
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
            if value is None:
                setattr(instance, key, None)
            elif isinstance(value, dict):
                related_model_class = relationships[key]
                related_instance = db.session.get(related_model_class, value.get("id"))
                if related_instance:
                    setattr(instance, key, related_instance)
                    logger.debug(
                        f"🔗 Set relationship {key} to {related_model_class.__name__}({value.get('id')})"
                    )
                else:
                    logger.warning(
                        f"⚠️ Related {related_model_class.__name__} with id {value.get('id')} not found."
                    )

    db.session.commit()
    logger.info(f"✅ {instance.__class__.__name__} instance updated.")
    return instance


def list_instances_of_model(model_class):
    logger.info(f"📄 Listing all instances of {model_class.__name__}")
    instances = db.session.query(model_class).all()
    logger.debug(f"Found {len(instances)} instances.")
    return [instance.to_dict() for instance in instances]


def delete_model_instance(model_class, identifier):
    """
    Delete a model instance by primary key or instance.
    :param model_class: SQLAlchemy model class
    :param identifier: primary key value (e.g., id) or model instance
    :return: True if deleted, False otherwise
    """
    logger.info(f"🗑️ Deleting instance of {model_class.__name__}")

    try:
        # Case 1: identifier is already an instance
        if isinstance(identifier, model_class):
            instance = identifier
        else:
            # Case 2: assume it's a primary key
            primary_key = inspect(model_class).primary_key[0].name
            instance = db.session.get(model_class, identifier)

        if not instance:
            logger.warning(f"⚠️ No {model_class.__name__} found for {identifier}")
            return False

        logger.debug(f"🗑️ Found {model_class.__name__}: {instance}")
        db.session.delete(instance)
        db.session.commit()
        logger.info(f"✅ {model_class.__name__} deleted successfully.")
        return True

    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"❌ IntegrityError while deleting {model_class.__name__}: {e}")
        return False
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Unexpected error while deleting {model_class.__name__}: {e}")
        return False
