"""
Evolution API WhatsApp Service
Each school connects their own WhatsApp number via a dedicated Evolution API instance.
"""
import requests
import logging
import time

logger = logging.getLogger(__name__)

_service_cache = {}


class EvolutionWhatsAppService:
    """
    Handles WhatsApp messaging for a single school using Evolution API.
    Each school has its own instance (= its own WhatsApp number).
    """

    def __init__(self, school_id=None):
        self.school_id = school_id
        self.api_url = None
        self.api_key = None
        self.instance_name = None
        if school_id:
            self._load_config()

    def _load_config(self):
        try:
            from app import db
            from app.models import School
            school = db.session.get(School, self.school_id)
            if school:
                # Load credentials regardless of enabled flag
                # enabled flag only controls auto-sending, not configuration
                self.api_url = (school.evolution_api_url or '').rstrip('/')
                self.api_key = school.evolution_api_key
                self.instance_name = school.evolution_instance_name
        except Exception as e:
            logger.error(f"EvolutionWhatsAppService: failed to load config for school {self.school_id}: {e}")

    @property
    def is_configured(self):
        return bool(self.api_url and self.api_key and self.instance_name)

    def _headers(self):
        return {
            "apikey": self.api_key,
            "Content-Type": "application/json",
        }

    def check_instance_status(self):
        """
        GET /instance/connectionState/{instance}
        Returns: { "success": bool, "state": "open"|"close"|"connecting"|"unknown" }
        """
        if not self.is_configured:
            return {"success": False, "state": "not_configured", "error": "Evolution API not configured"}
        try:
            url = f"{self.api_url}/instance/connectionState/{self.instance_name}"
            resp = requests.get(url, headers=self._headers(), timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                state = data.get("instance", {}).get("state", "unknown")
                return {"success": True, "state": state}
            return {"success": False, "state": "unknown", "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except requests.exceptions.ConnectionError:
            return {"success": False, "state": "unreachable", "error": "Cannot connect to Evolution API server"}
        except Exception as e:
            return {"success": False, "state": "error", "error": str(e)}

    def get_qr_code(self):
        """
        GET /instance/connect/{instance}
        Returns the QR code (base64) to connect a WhatsApp number.
        """
        if not self.is_configured:
            return {"success": False, "error": "Evolution API not configured"}
        try:
            url = f"{self.api_url}/instance/connect/{self.instance_name}"
            resp = requests.get(url, headers=self._headers(), timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                return {"success": True, "data": data}
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        except requests.exceptions.ConnectionError:
            return {"success": False, "error": "Cannot connect to Evolution API server"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_text_message(self, phone_number: str, message: str):
        """
        POST /message/sendText/{instance}
        phone_number: international format without + (e.g. 96891234567)
        """
        if not self.is_configured:
            return {"success": False, "error": "Evolution API not configured"}
        try:
            phone_number = self._normalize_phone(phone_number)
            url = f"{self.api_url}/message/sendText/{self.instance_name}"
            payload = {
                "number": phone_number,
                "text": message,
            }
            resp = requests.post(url, json=payload, headers=self._headers(), timeout=30)
            if resp.status_code in [200, 201]:
                return {"success": True, "data": resp.json()}
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:300]}"}
        except requests.exceptions.ConnectionError:
            return {"success": False, "error": "Cannot connect to Evolution API server"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def send_bulk_messages(self, recipients: list, message_fn, delay_seconds: float = 4.0):
        """
        Send messages to multiple recipients with a delay between each.
        Use 3–5+ seconds between messages to reduce WhatsApp blocking risk.
        recipients: list of dicts — each must have a 'phone_number' key
        message_fn: callable(recipient_dict) -> str
        Returns: { sent, failed, errors }
        """
        results = {"sent": 0, "failed": 0, "total": len(recipients), "errors": []}
        for recipient in recipients:
            phone = (recipient.get("phone_number") or "").strip()
            if not phone:
                results["failed"] += 1
                results["errors"].append({"phone": phone, "error": "Empty phone number"})
                continue
            msg = message_fn(recipient)
            result = self.send_text_message(phone, msg)
            if result["success"]:
                results["sent"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({"phone": phone, "error": result.get("error", "Unknown error")})
            if delay_seconds > 0:
                time.sleep(delay_seconds)
        return results

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Strip non-digits and ensure international format. Add Oman country code 968 if missing."""
        digits = ''.join(c for c in phone if c.isdigit())
        if digits.startswith('00'):
            digits = digits[2:]
        if not digits.startswith('968'):
            # Omani local numbers are 8 digits; prepend 968 if not present
            if len(digits) == 8:
                digits = '968' + digits
            elif len(digits) == 9 and digits.startswith('9'):
                # e.g. 998912168 -> 968 + 98912168 (drop leading 9, add country code)
                digits = '968' + digits[1:]
        return digits

    def create_instance(self, instance_name: str):
        """
        POST /instance/create  (Evolution API v2)
        integration field is required in v2.
        """
        if not (self.api_url and self.api_key):
            return {"success": False, "error": "API URL and key are required"}
        try:
            url = f"{self.api_url}/instance/create"
            payload = {
                "instanceName": instance_name,
                "integration": "WHATSAPP-BAILEYS",
                "qrcode": False,
            }
            resp = requests.post(url, json=payload, headers=self._headers(), timeout=20)
            if resp.status_code in [200, 201]:
                return {"success": True, "data": resp.json()}
            return {"success": False, "error": f"HTTP {resp.status_code}: {resp.text[:300]}"}
        except Exception as e:
            return {"success": False, "error": str(e)}


def get_evolution_service(school_id) -> EvolutionWhatsAppService:
    """Return a cached service instance for the given school."""
    global _service_cache
    if school_id not in _service_cache:
        _service_cache[school_id] = EvolutionWhatsAppService(school_id)
    return _service_cache[school_id]


def invalidate_service_cache(school_id):
    """Call this after updating a school's Evolution API config."""
    global _service_cache
    _service_cache.pop(school_id, None)
