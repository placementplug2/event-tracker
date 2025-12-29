function buildQrPayload(eventId, studentId) {
  return `EVT:${eventId}:STU:${studentId}`;
}

function parseQrPayload(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== 'EVT' || parts[2] !== 'STU') {
    return null;
  }
  return { eventId: parts[1], studentId: parts[3] };
}

module.exports = {
  buildQrPayload,
  parseQrPayload,
};