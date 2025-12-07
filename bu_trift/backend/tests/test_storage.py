# backend/tests/test_storage.py

import os
import pytest

import storage  # type: ignore


# ============================================================
# Tests for configure_cloudinary()
# ============================================================

def test_configure_cloudinary_success(monkeypatch):
    """
    When all CLOUDINARY_* env vars are set, configure_cloudinary()
    should call cloudinary.config() with the correct values.
    """
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "demo-cloud")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "demo-key")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "demo-secret")

    called = {}

    def fake_config(**kwargs):
        called.update(kwargs)

    monkeypatch.setattr(storage.cloudinary, "config", fake_config)

    # Call the function directly (module import already tried it)
    storage.configure_cloudinary()

    assert called["cloud_name"] == "demo-cloud"
    assert called["api_key"] == "demo-key"
    assert called["api_secret"] == "demo-secret"
    assert called["secure"] is True


def test_configure_cloudinary_missing_cloud_name(monkeypatch):
    """
    If CLOUDINARY_CLOUD_NAME is missing, configure_cloudinary()
    should raise ValueError with the correct message.
    """
    monkeypatch.delenv("CLOUDINARY_CLOUD_NAME", raising=False)
    monkeypatch.setenv("CLOUDINARY_API_KEY", "demo-key")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "demo-secret")

    with pytest.raises(ValueError) as exc:
        storage.configure_cloudinary()

    assert "CLOUDINARY_CLOUD_NAME environment variable is required" in str(exc.value)


def test_configure_cloudinary_missing_api_key(monkeypatch):
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "demo-cloud")
    monkeypatch.delenv("CLOUDINARY_API_KEY", raising=False)
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "demo-secret")

    with pytest.raises(ValueError) as exc:
        storage.configure_cloudinary()

    assert "CLOUDINARY_API_KEY environment variable is required" in str(exc.value)


def test_configure_cloudinary_missing_api_secret(monkeypatch):
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "demo-cloud")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "demo-key")
    monkeypatch.delenv("CLOUDINARY_API_SECRET", raising=False)

    with pytest.raises(ValueError) as exc:
        storage.configure_cloudinary()

    assert "CLOUDINARY_API_SECRET environment variable is required" in str(exc.value)


# ============================================================
# Tests for upload_file_to_cloudinary()
# ============================================================

def test_upload_file_to_cloudinary_success(monkeypatch):
    """
    Happy path: upload_file_to_cloudinary should return secure_url
    from cloudinary.uploader.upload().
    """
    def fake_upload(file_content, **kwargs):
        assert file_content == b"image-bytes"
        assert kwargs["folder"] == "butrift/uploads"
        assert kwargs["public_id"] == "test-image.jpg"
        assert kwargs["resource_type"] == "image"
        assert kwargs["overwrite"] is False
        assert kwargs["invalidate"] is True
        return {"secure_url": "https://example.com/test-image.jpg"}

    monkeypatch.setattr(storage.cloudinary.uploader, "upload", fake_upload)

    url = storage.upload_file_to_cloudinary(
        b"image-bytes",
        "test-image.jpg",
        folder="butrift/uploads",
    )
    assert url == "https://example.com/test-image.jpg"


def test_upload_file_to_cloudinary_failure(monkeypatch):
    """
    If cloudinary.uploader.upload raises, upload_file_to_cloudinary
    should raise Exception with 'Failed to upload image:' in message.
    """
    def fake_upload(file_content, **kwargs):
        raise Exception("Cloudinary down")

    monkeypatch.setattr(storage.cloudinary.uploader, "upload", fake_upload)

    with pytest.raises(Exception) as exc:
        storage.upload_file_to_cloudinary(
            b"image-bytes",
            "test-image.jpg",
            folder="butrift/uploads",
        )

    msg = str(exc.value)
    assert "Failed to upload image" in msg
    assert "Cloudinary down" in msg


# ============================================================
# Tests for delete_file_from_cloudinary()
# ============================================================

def test_delete_file_from_cloudinary_success(monkeypatch):
    """
    If destroy() returns {'result': 'ok'}, helper should return True.
    """
    def fake_destroy(public_id, **kwargs):
        assert public_id == "butrift/uploads/test-image.jpg"
        assert kwargs["resource_type"] == "image"
        assert kwargs["invalidate"] is True
        return {"result": "ok"}

    monkeypatch.setattr(storage.cloudinary.uploader, "destroy", fake_destroy)

    ok = storage.delete_file_from_cloudinary("butrift/uploads/test-image.jpg")
    assert ok is True


def test_delete_file_from_cloudinary_not_ok(monkeypatch):
    """
    If destroy() returns something other than 'ok', helper should return False.
    """
    def fake_destroy(public_id, **kwargs):
        return {"result": "not_found"}

    monkeypatch.setattr(storage.cloudinary.uploader, "destroy", fake_destroy)

    ok = storage.delete_file_from_cloudinary("butrift/uploads/missing.jpg")
    assert ok is False


def test_delete_file_from_cloudinary_exception(monkeypatch):
    """
    If destroy() raises, helper should catch and return False.
    """
    def fake_destroy(public_id, **kwargs):
        raise Exception("network error")

    monkeypatch.setattr(storage.cloudinary.uploader, "destroy", fake_destroy)

    ok = storage.delete_file_from_cloudinary("butrift/uploads/error.jpg")
    assert ok is False
