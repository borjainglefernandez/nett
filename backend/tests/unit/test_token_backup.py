import pytest
import os
import json
from unittest.mock import Mock, patch, MagicMock
from botocore.exceptions import ClientError
from utils.token_backup import (
    TokenBackup,
    TokenBackupConfigurationError,
    get_s3_file_name,
    get_token_backup,
)


@pytest.mark.unit
class TestTokenBackup:
    """Unit tests for TokenBackup utility class."""

    @pytest.fixture
    def mock_s3_client(self):
        """Create a mock S3 client."""
        return Mock()

    @pytest.fixture
    def mock_env_vars(self):
        """Set up mock environment variables."""
        with patch.dict(
            os.environ,
            {
                "AWS_S3_BUCKET_NAME": "test-bucket",
                "AWS_ACCESS_KEY": "test-access-key",
                "AWS_SECRET_ACCESS_KEY": "test-secret-key",
                "AWS_REGION": "us-east-1",
            },
        ):
            yield

    @pytest.fixture
    def token_backup(self, mock_env_vars):
        """Create a TokenBackup instance with mocked S3 client."""
        with patch("utils.token_backup.boto3.client") as mock_boto3:
            mock_client = Mock()
            mock_boto3.return_value = mock_client
            backup = TokenBackup()
            backup.s3_client = mock_client
            # Use the bucket name from mock_env_vars
            backup.bucket_name = "test-bucket"
            return backup

    def test_get_s3_file_name(self):
        """Test get_s3_file_name function."""
        assert get_s3_file_name("sandbox") == "access_tokens_backup_sandbox.json"
        assert get_s3_file_name("production") == "access_tokens_backup_production.json"

    def test_init_missing_bucket_name(self):
        """Test TokenBackup initialization fails when bucket name is missing."""
        with patch.dict(os.environ, {}, clear=True):
            # Need to patch the module-level variable since it's evaluated at import time
            with patch("utils.token_backup.S3_BUCKET_NAME", None):
                with pytest.raises(TokenBackupConfigurationError) as exc_info:
                    TokenBackup()
                assert "AWS_S3_BUCKET_NAME not configured" in str(exc_info.value)

    def test_init_missing_access_key(self, mock_env_vars):
        """Test TokenBackup initialization fails when access key is missing."""
        with patch.dict(os.environ, {"AWS_ACCESS_KEY": ""}):
            with pytest.raises(TokenBackupConfigurationError) as exc_info:
                TokenBackup()
            assert "AWS_ACCESS_KEY and AWS_SECRET_ACCESS_KEY" in str(exc_info.value)

    def test_init_missing_secret_key(self, mock_env_vars):
        """Test TokenBackup initialization fails when secret key is missing."""
        with patch.dict(os.environ, {"AWS_SECRET_ACCESS_KEY": ""}):
            with pytest.raises(TokenBackupConfigurationError) as exc_info:
                TokenBackup()
            assert "AWS_ACCESS_KEY and AWS_SECRET_ACCESS_KEY" in str(exc_info.value)

    def test_init_s3_client_error(self, mock_env_vars):
        """Test TokenBackup initialization fails when S3 client creation fails."""
        with patch("utils.token_backup.boto3.client") as mock_boto3:
            mock_boto3.side_effect = Exception("Connection failed")
            with pytest.raises(TokenBackupConfigurationError) as exc_info:
                TokenBackup()
            assert "Failed to initialize S3 client" in str(exc_info.value)

    def test_read_from_s3_no_client(self, token_backup):
        """Test _read_from_s3 returns empty dict when client is None."""
        token_backup.s3_client = None
        result = token_backup._read_from_s3("sandbox")
        assert result == {}

    def test_read_from_s3_no_bucket(self, token_backup):
        """Test _read_from_s3 returns empty dict when bucket is None."""
        token_backup.bucket_name = None
        result = token_backup._read_from_s3("sandbox")
        assert result == {}

    def test_read_from_s3_success(self, token_backup):
        """Test _read_from_s3 successfully reads from S3."""
        test_data = {"item1": {"access_token": "token1", "environment": "sandbox"}}
        mock_body = Mock()
        mock_body.read.return_value = json.dumps(test_data).encode("utf-8")
        mock_response = {"Body": mock_body}
        token_backup.s3_client.get_object.return_value = mock_response

        result = token_backup._read_from_s3("sandbox")
        assert result == test_data
        # Check that get_object was called with correct bucket and key
        token_backup.s3_client.get_object.assert_called_once()
        call_kwargs = token_backup.s3_client.get_object.call_args[1]
        assert call_kwargs["Bucket"] == "test-bucket"
        assert call_kwargs["Key"] == "access_tokens_backup_sandbox.json"

    def test_read_from_s3_file_not_found(self, token_backup):
        """Test _read_from_s3 handles NoSuchKey error."""
        error = ClientError(
            {"Error": {"Code": "NoSuchKey", "Message": "Not found"}}, "GetObject"
        )
        token_backup.s3_client.get_object.side_effect = error

        result = token_backup._read_from_s3("sandbox")
        assert result == {}

    def test_read_from_s3_client_error(self, token_backup):
        """Test _read_from_s3 raises error for non-NoSuchKey ClientError."""
        error = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access denied"}}, "GetObject"
        )
        token_backup.s3_client.get_object.side_effect = error

        with pytest.raises(ClientError):
            token_backup._read_from_s3("sandbox")

    def test_read_from_s3_unexpected_error(self, token_backup):
        """Test _read_from_s3 raises unexpected errors."""
        token_backup.s3_client.get_object.side_effect = ValueError("Unexpected error")

        with pytest.raises(ValueError):
            token_backup._read_from_s3("sandbox")

    def test_write_to_s3_no_client(self, token_backup):
        """Test _write_to_s3 returns False when client is None."""
        token_backup.s3_client = None
        result = token_backup._write_to_s3({"test": "data"}, "sandbox")
        assert result is False

    def test_write_to_s3_no_bucket(self, token_backup):
        """Test _write_to_s3 returns False when bucket is None."""
        token_backup.bucket_name = None
        result = token_backup._write_to_s3({"test": "data"}, "sandbox")
        assert result is False

    def test_write_to_s3_success(self, token_backup):
        """Test _write_to_s3 successfully writes to S3."""
        test_data = {"item1": {"access_token": "token1"}}
        result = token_backup._write_to_s3(test_data, "sandbox")

        assert result is True
        token_backup.s3_client.put_object.assert_called_once()
        call_kwargs = token_backup.s3_client.put_object.call_args[1]
        assert call_kwargs["Bucket"] == "test-bucket"
        assert call_kwargs["Key"] == "access_tokens_backup_sandbox.json"
        # Verify the body contains the JSON data
        assert json.loads(call_kwargs["Body"].decode("utf-8")) == test_data

    def test_write_to_s3_client_error(self, token_backup):
        """Test _write_to_s3 handles ClientError."""
        error = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access denied"}}, "PutObject"
        )
        token_backup.s3_client.put_object.side_effect = error

        result = token_backup._write_to_s3({"test": "data"}, "sandbox")
        assert result is False

    def test_write_to_s3_unexpected_error(self, token_backup):
        """Test _write_to_s3 handles unexpected errors."""
        token_backup.s3_client.put_object.side_effect = ValueError("Unexpected error")

        result = token_backup._write_to_s3({"test": "data"}, "sandbox")
        assert result is False

    def test_cleanup_backup_file_no_client(self, token_backup):
        """Test cleanup_backup_file returns False when client is None."""
        token_backup.s3_client = None
        result = token_backup.cleanup_backup_file("sandbox")
        assert result is False

    def test_cleanup_backup_file_no_bucket(self, token_backup):
        """Test cleanup_backup_file returns False when bucket is None."""
        token_backup.bucket_name = None
        result = token_backup.cleanup_backup_file("sandbox")
        assert result is False

    def test_cleanup_backup_file_success(self, token_backup):
        """Test cleanup_backup_file successfully deletes from S3."""
        result = token_backup.cleanup_backup_file("sandbox")

        assert result is True
        token_backup.s3_client.delete_object.assert_called_once_with(
            Bucket="test-bucket", Key="access_tokens_backup_sandbox.json"
        )

    def test_cleanup_backup_file_not_found(self, token_backup):
        """Test cleanup_backup_file handles NoSuchKey error."""
        error = ClientError(
            {"Error": {"Code": "NoSuchKey", "Message": "Not found"}}, "DeleteObject"
        )
        token_backup.s3_client.delete_object.side_effect = error

        result = token_backup.cleanup_backup_file("sandbox")
        assert result is True  # Should return True even if file doesn't exist

    def test_cleanup_backup_file_client_error(self, token_backup):
        """Test cleanup_backup_file handles non-NoSuchKey ClientError."""
        error = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access denied"}},
            "DeleteObject",
        )
        token_backup.s3_client.delete_object.side_effect = error

        result = token_backup.cleanup_backup_file("sandbox")
        assert result is False

    def test_cleanup_backup_file_unexpected_error(self, token_backup):
        """Test cleanup_backup_file handles unexpected errors."""
        token_backup.s3_client.delete_object.side_effect = ValueError(
            "Unexpected error"
        )

        result = token_backup.cleanup_backup_file("sandbox")
        assert result is False

    def test_backup_token_configuration_error(self, token_backup):
        """Test backup_token raises error when not configured."""
        token_backup.s3_client = None
        with pytest.raises(TokenBackupConfigurationError) as exc_info:
            token_backup.backup_token("item1", "token1", "sandbox")
        assert "S3 backup not properly configured" in str(exc_info.value)

    def test_backup_token_success(self, token_backup):
        """Test backup_token successfully backs up token."""
        # Mock _read_from_s3 to return existing data
        token_backup._read_from_s3 = Mock(return_value={})
        token_backup._write_to_s3 = Mock(return_value=True)

        result = token_backup.backup_token("item1", "token1", "sandbox")

        assert result is True
        token_backup._read_from_s3.assert_called_once_with("sandbox")
        token_backup._write_to_s3.assert_called_once()
        call_args = token_backup._write_to_s3.call_args
        assert call_args[0][0]["item1"]["access_token"] == "token1"
        assert call_args[0][0]["item1"]["environment"] == "sandbox"
        assert call_args[0][0]["item1"]["item_id"] == "item1"
        assert call_args[0][1] == "sandbox"

    def test_backup_token_write_failure(self, token_backup):
        """Test backup_token handles write failure."""
        token_backup._read_from_s3 = Mock(return_value={})
        token_backup._write_to_s3 = Mock(return_value=False)

        result = token_backup.backup_token("item1", "token1", "sandbox")

        assert result is False

    def test_backup_token_exception(self, token_backup):
        """Test backup_token handles exceptions."""
        token_backup._read_from_s3 = Mock(side_effect=Exception("Read error"))

        result = token_backup.backup_token("item1", "token1", "sandbox")
        assert result is False

    def test_restore_token_no_client(self, token_backup):
        """Test restore_token returns None when client is None."""
        token_backup.s3_client = None
        result = token_backup.restore_token("item1")
        assert result is None

    def test_restore_token_no_bucket(self, token_backup):
        """Test restore_token returns None when bucket is None."""
        token_backup.bucket_name = None
        result = token_backup.restore_token("item1")
        assert result is None

    def test_restore_token_success_with_environment(self, token_backup):
        """Test restore_token successfully restores token with specified environment."""
        test_data = {
            "item1": {
                "access_token": "token1",
                "environment": "sandbox",
                "item_id": "item1",
            }
        }
        token_backup._read_from_s3 = Mock(return_value=test_data)

        result = token_backup.restore_token("item1", "sandbox")

        assert result == "token1"
        token_backup._read_from_s3.assert_called_once_with("sandbox")

    def test_restore_token_success_no_environment(self, token_backup):
        """Test restore_token successfully restores token without specifying environment."""
        test_data_sandbox = {
            "item1": {
                "access_token": "token1",
                "environment": "sandbox",
                "item_id": "item1",
            }
        }
        token_backup._read_from_s3 = Mock(side_effect=[{}, test_data_sandbox])

        result = token_backup.restore_token("item1")

        assert result == "token1"
        assert token_backup._read_from_s3.call_count == 2
        token_backup._read_from_s3.assert_any_call("sandbox")
        token_backup._read_from_s3.assert_any_call("production")

    def test_restore_token_not_found(self, token_backup):
        """Test restore_token returns None when token not found."""
        token_backup._read_from_s3 = Mock(return_value={})

        result = token_backup.restore_token("item1", "sandbox")

        assert result is None

    def test_restore_token_exception(self, token_backup):
        """Test restore_token handles exceptions."""
        token_backup._read_from_s3 = Mock(side_effect=Exception("Read error"))

        result = token_backup.restore_token("item1", "sandbox")
        assert result is None

    def test_restore_token_tries_both_environments(self, token_backup):
        """Test restore_token tries both environments when not specified."""
        token_backup._read_from_s3 = Mock(side_effect=[{}, {}])

        result = token_backup.restore_token("item1")

        assert result is None
        assert token_backup._read_from_s3.call_count == 2
        token_backup._read_from_s3.assert_any_call("sandbox")
        token_backup._read_from_s3.assert_any_call("production")

    def test_get_token_backup_singleton(self, mock_env_vars):
        """Test get_token_backup returns singleton instance."""
        with patch("utils.token_backup.boto3.client") as mock_boto3:
            mock_client = Mock()
            mock_boto3.return_value = mock_client

            # Clear the global instance
            import utils.token_backup

            utils.token_backup._token_backup = None

            instance1 = get_token_backup()
            instance2 = get_token_backup()

            assert instance1 is instance2
