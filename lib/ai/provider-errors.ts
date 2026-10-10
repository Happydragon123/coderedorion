// Classify upstream failures without reflecting provider text or credentials.
export function providerFailureMessage(status: number, payload: unknown) {
  const error = payload && typeof payload === 'object' && 'error' in payload ? payload.error : undefined;
  const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : '';
  const details = error && typeof error === 'object' && 'details' in error && Array.isArray(error.details) ? error.details : [];
  const invalidKey = /API key not valid/i.test(message) || details.some(detail => detail && typeof detail === 'object' && detail.reason === 'API_KEY_INVALID');
  if (invalidKey || status === 401) return 'Gemini rejected the server API key. Verify GEMINI_API_KEY in deployment settings.';
  if (status === 403) return 'Gemini denied access. Check the server key restrictions and account permissions.';
  if (status === 404) return 'The configured GEMINI_MODEL is unavailable for this key or generateContent. Verify the model identifier and access.';
  if (status === 400) return 'Gemini rejected the model or structured-output request (HTTP 400). Verify GEMINI_MODEL supports this request.';
  return 'Gemini is unavailable. Try again or use manual posting and standard filters.';
}
