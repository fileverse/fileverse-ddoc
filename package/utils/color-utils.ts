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
