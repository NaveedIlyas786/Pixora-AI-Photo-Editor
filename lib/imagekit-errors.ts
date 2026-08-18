const EXTENSION_LIMIT_PATTERN =
  /extensions?\s+(limit|quota)\s+exceeded/i;

export function extractImageKitErrorMessage(body: string): string | undefined {
  const trimmed = body.trim();
  if (!trimmed) return undefined;

  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    const message =
      (typeof json.message === "string" && json.message) ||
      (typeof json.error === "string" && json.error) ||
      undefined;
    if (message) return message;
  } catch {
    // ImageKit sometimes returns plain text or HTML instead of JSON
  }

  if (EXTENSION_LIMIT_PATTERN.test(trimmed)) {
    return "Extensions limit exceeded";
  }

  if (!trimmed.startsWith("<") && trimmed.length <= 280) {
    return trimmed;
  }

  return undefined;
}

export function getFriendlyImageKitError(
  rawMessage?: string,
  httpStatus?: number
): string {
  const message = (rawMessage ?? "").trim();

  if (EXTENSION_LIMIT_PATTERN.test(message)) {
    return "ImageKit AI quota reached. Try again after the monthly limit resets.";
  }

  if (httpStatus === 403) {
    return message
      ? `ImageKit blocked this request: ${message}`
      : "ImageKit blocked this request. Please try again later.";
  }

  if (httpStatus === 400) {
    return message
      ? `This transformation failed: ${message}`
      : "This transformation isn't valid for this image. Try another tool or a simpler prompt.";
  }

  if (message) return message;

  return "Processing failed. Try another tool or a simpler prompt.";
}
