# app/qr_payload.py
"""
QR code payload encoding/decoding for student identity.
Only the system (bus scanner, parent login) can resolve the payload to a username.
Plain QR scanners see an encoded string, not the username.
"""
import base64
import logging

logger = logging.getLogger(__name__)

QR_PREFIX = "TATUBU-"


def decode_student_qr_payload(scanned: str):
    """
    Decode a scanned QR payload to student username.
    Accepts either encoded format (TATUBU-<base64>) or legacy plain username.
    Returns the username string, or None if invalid.
    """
    if not scanned or not isinstance(scanned, str):
        return None
    scanned = scanned.strip()
    if not scanned:
        return None
    if scanned.startswith(QR_PREFIX):
        try:
            b64 = scanned[len(QR_PREFIX):]
            decoded = base64.b64decode(b64).decode("utf-8")
            return decoded if decoded else None
        except Exception as e:
            logger.warning("QR payload decode failed: %s", e)
            return None
    return scanned
