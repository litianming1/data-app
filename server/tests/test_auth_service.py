from datetime import UTC, datetime, timedelta
from unittest import TestCase

from app.services.auth_service import AuthService


class AuthServiceTest(TestCase):
    def test_password_hash_verification_round_trip(self) -> None:
        service = AuthService(secret_key="test-secret", token_expire_minutes=15)

        password_hash = service.hash_password("correct horse battery staple")

        self.assertNotEqual(password_hash, "correct horse battery staple")
        self.assertTrue(
            service.verify_password("correct horse battery staple", password_hash)
        )
        self.assertFalse(service.verify_password("wrong password", password_hash))

    def test_access_token_contains_subject_and_expiration(self) -> None:
        service = AuthService(secret_key="test-secret", token_expire_minutes=15)

        token = service.create_access_token(subject="user-123")
        payload = service.decode_access_token(token)

        self.assertEqual(payload.subject, "user-123")
        self.assertGreater(
            payload.expires_at, datetime.now(UTC) + timedelta(minutes=10)
        )
