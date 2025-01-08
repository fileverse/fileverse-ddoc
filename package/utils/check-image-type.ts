export const validateImageExtension = (
  file: File,
  onError?: (message: string) => void,
) => {
  if (file.type.includes('image')) {
    if (!file.type.includes('image/png') && !file.type.includes('image/jpeg')) {
      if (onError && typeof onError === 'function') {
        onError('Invalid image type. Try PNG or JPEG.');
      }
      return false;
    }
  }
  return true;
};
