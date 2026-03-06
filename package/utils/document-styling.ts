import { DocumentStylingValue, ThemeVariantValue } from '../types';

export const isThemeVariantValue = (
  value: DocumentStylingValue | undefined,
): value is ThemeVariantValue =>
  typeof value === 'object' &&
  value !== null &&
  typeof value.light === 'string' &&
  typeof value.dark === 'string';

export const getThemeStyle = (
  value?: DocumentStylingValue,
  theme: 'light' | 'dark' = 'light',
): string | undefined => {
  if (!value) return;

  if (typeof value === 'string') {
    return value;
  }

  if (theme === 'dark') {
    return value.dark || value.light;
  }

  return value.light || value.dark;
};
