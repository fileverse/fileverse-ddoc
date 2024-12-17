export function isJSONString(str: unknown) {
  if (typeof str !== 'string') {
    return false;
  }

  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null;
  } catch (e) {
    console.log(e);
    return false;
  }
}
