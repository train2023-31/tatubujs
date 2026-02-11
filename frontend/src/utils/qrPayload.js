/**
 * Encode student username for QR code payload.
 * Only the system (bus scanner, parent login) decodes this on the backend.
 * Plain QR scanners see an encoded string, not the username.
 */
const QR_PREFIX = 'TATUBU-';

export function encodeStudentQRPayload(username) {
  if (username == null || username === '') return '';
  try {
    const encoded = typeof username === 'string' ? username : String(username);
    const base64 = btoa(unescape(encodeURIComponent(encoded)));
    return QR_PREFIX + base64;
  } catch {
    return QR_PREFIX + btoa(String(username));
  }
}
