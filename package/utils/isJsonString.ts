export function isJSONString(str: unknown): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  try {
    const parsed = JSON.parse(str);
    return (
      (typeof parsed === 'object' && parsed !== null) || Array.isArray(parsed)
    );
  } catch {
    return false;
  }
}
