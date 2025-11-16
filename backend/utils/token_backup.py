import os
import json
import boto3
from botocore.exceptions import ClientError
from utils.logger import get_logger

logger = get_logger(__name__)


class TokenBackupConfigurationError(Exception):
    """Raised when token backup is not properly configured."""

    pass


# S3 configuration
S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")


def get_s3_file_name(environment: str) -> str:
    """
    Get the S3 file name based on the environment.

    Args:
        environment: The Plaid environment (sandbox/production)

    Returns:
        str: Environment-specific filename
    """
    return f"access_tokens_backup_{environment}.json"


class TokenBackup:
    """Utility class for backing up and restoring Plaid access tokens to/from S3."""

    def __init__(self):
        self.s3_client = None
        self.bucket_name = S3_BUCKET_NAME

        # Initialize S3 client if credentials are available
        if not self.bucket_name:
            raise TokenBackupConfigurationError(
                "AWS_S3_BUCKET_NAME not configured. Token backup is required."
            )

        aws_access_key = os.getenv("AWS_ACCESS_KEY")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

        if not aws_access_key or not aws_secret_key:
            raise TokenBackupConfigurationError(
                "AWS_ACCESS_KEY and AWS_SECRET_ACCESS_KEY must be configured for token backup."
            )

        try:
            self.s3_client = boto3.client(
                "s3",
                region_name=AWS_REGION,
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
            )
            logger.info(
                f"✅ Token backup initialized with S3 bucket: {self.bucket_name}"
            )
        except Exception as e:
            logger.error(f"❌ Failed to initialize S3 client: {e}")
            raise TokenBackupConfigurationError(
                f"Failed to initialize S3 client: {str(e)}"
            ) from e

    def _read_from_s3(self, environment: str):
        """
        Read the backup file from S3. Returns empty dict if file doesn't exist.

        Args:
            environment: The Plaid environment (sandbox/production)
        """
        if not self.s3_client or not self.bucket_name:
            return {}

        file_name = get_s3_file_name(environment)
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=file_name)
            content = response["Body"].read().decode("utf-8")
            return json.loads(content)
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                # File doesn't exist yet, return empty dict
                logger.info(
                    f"📝 Backup file {file_name} doesn't exist yet, will create new one"
                )
                return {}
            else:
                logger.error(f"❌ Error reading from S3: {e}")
                raise
        except Exception as e:
            logger.error(f"❌ Unexpected error reading from S3: {e}")
            raise

    def _write_to_s3(self, data, environment: str):
        """
        Write the backup file to S3.

        Args:
            data: The data to write
            environment: The Plaid environment (sandbox/production)
        """
        if not self.s3_client or not self.bucket_name:
            return False

        file_name = get_s3_file_name(environment)
        try:
            json_data = json.dumps(data, indent=2)
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=json_data.encode("utf-8"),
            )
            return True
        except ClientError as e:
            logger.error(f"❌ Error writing to S3: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error writing to S3: {e}")
            return False

    def cleanup_backup_file(self, environment: str = "sandbox"):
        """
        Delete the backup file from S3. Used for test cleanup.
        Only cleans up the specified environment (defaults to sandbox for tests).

        Args:
            environment: The Plaid environment to cleanup (defaults to "sandbox")

        Returns:
            bool: True if deletion was successful or file didn't exist, False otherwise
        """
        if not self.s3_client or not self.bucket_name:
            logger.warning("⚠️ S3 backup not configured, cannot cleanup")
            return False

        file_name = get_s3_file_name(environment)
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_name,
            )
            logger.info(f"✅ Successfully deleted backup file {file_name} from S3")
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                # File doesn't exist, which is fine
                logger.info(
                    f"📝 Backup file {file_name} doesn't exist, nothing to cleanup"
                )
                return True
            else:
                logger.error(f"❌ Error deleting from S3: {e}")
                return False
        except Exception as e:
            logger.error(f"❌ Unexpected error deleting from S3: {e}")
            return False

    def backup_token(self, item_id, access_token, environment):
        """
        Backup or update an access token in S3.

        Args:
            item_id: The Plaid item ID
            access_token: The access token to backup
            environment: The Plaid environment (sandbox/production)

        Returns:
            bool: True if backup was successful, False otherwise

        Raises:
            TokenBackupConfigurationError: If S3 backup is not properly configured
        """
        if not self.s3_client or not self.bucket_name:
            raise TokenBackupConfigurationError(
                "S3 backup not properly configured. Cannot backup token."
            )

        try:
            # Read existing backup
            backup_data = self._read_from_s3(environment)

            # Update or add the token with metadata
            backup_data[item_id] = {
                "access_token": access_token,
                "environment": environment,
                "item_id": item_id,
            }

            # Write back to S3
            success = self._write_to_s3(backup_data, environment)
            if success:
                logger.info(f"✅ Successfully backed up token for item {item_id} to S3")
            else:
                logger.error(f"❌ Failed to backup token for item {item_id} to S3")
            return success

        except Exception as e:
            logger.error(
                f"❌ Error backing up token for item {item_id}: {e}", exc_info=True
            )
            return False

    def restore_token(self, item_id, environment: str = None):
        """
        Restore an access token from S3.

        Args:
            item_id: The Plaid item ID
            environment: The Plaid environment (sandbox/production).
                        If None, will try both environments.

        Returns:
            str: The access token if found, None otherwise
        """
        if not self.s3_client or not self.bucket_name:
            logger.warning("⚠️ S3 backup not configured, cannot restore token")
            return None

        try:
            # If environment not specified, try both
            environments_to_try = (
                [environment] if environment else ["sandbox", "production"]
            )

            for env in environments_to_try:
                backup_data = self._read_from_s3(env)
                if item_id in backup_data:
                    token_data = backup_data[item_id]
                    logger.info(
                        f"✅ Successfully restored token for item {item_id} from S3 ({env})"
                    )
                    return token_data.get("access_token")

            logger.warning(f"⚠️ Token for item {item_id} not found in S3 backup")
            return None

        except Exception as e:
            logger.error(
                f"❌ Error restoring token for item {item_id}: {e}", exc_info=True
            )
            return None

# Global instance
_token_backup = None


def get_token_backup():
    """Get or create the global TokenBackup instance."""
    global _token_backup
    if _token_backup is None:
        _token_backup = TokenBackup()
    return _token_backup
