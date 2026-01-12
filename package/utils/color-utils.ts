export const isBlackOrWhiteShade = (color: string) => {
  // Handle rgb format
  if (color.startsWith('rgb')) {
    const rgbValues = color.match(/\d+/g);
    if (rgbValues && rgbValues.length === 3) {
      const [r, g, b] = rgbValues.map(Number);

      // Check if all RGB values are equal (indicating a gray shade)
      if (r === g && g === b) {
        // Consider it a black/white shade if:
        // - Very dark (close to black): all values < 30
        // - Very light (close to white): all values > 240
        // - Gray shades: all values between 60-180
        return r < 30 || r > 240 || (r >= 60 && r <= 180);
      }
    }
    return false;
  }

  // Handle hex colors
  color = color.toLowerCase();
  const blackShades = ['#000000', '#434343', '#666666', '#999999'].map((c) =>
    c.toLowerCase(),
  );
  const whiteShades = [
    '#ffffff',
    '#f3f3f3',
    '#efefef',
    '#d9d9d9',
    '#cccccc',
    '#b7b7b7',
  ].map((c) => c.toLowerCase());

  return blackShades.includes(color) || whiteShades.includes(color);
};

/**
 * Converts a hex color string to HSL.
 * @param hex - The hex string (e.g., "#ffffff" or "fff")
 * @returns An object containing h, s, and l values.
 */
export const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
  // 1. Remove the hash and expand shorthand hex (e.g. "03f" -> "0033ff")
  let r = 0,
    g = 0,
    b = 0;
  hex = hex.replace(/^#/, '');

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }

  // 2. Normalize RGB to [0, 1]
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  // 3. Calculate Hue and Saturation
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        h = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      case b:
        h = (r - g) / delta + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};
