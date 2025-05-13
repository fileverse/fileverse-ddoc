export const isLikelyLatex = (input: string) => {
  // If it's empty or too short, it's not LaTeX
  if (!input || input.length < 5) return false;

  // Common LaTeX math commands or environments
  const latexPattern =
    /\\(frac|sum|int|bar|hat|vec|dot|zeta|theta|left|right|begin|end|cdot|sqrt|displaystyle|mathbb|mathcal|mathrm|overline|underline|text)/;

  // Balanced braces (basic check)
  const hasBalancedBraces =
    (input.match(/{/g) || []).length === (input.match(/}/g) || []).length;

  // Looks like math (variable = equation, or contains sub/superscript)
  const mathish =
    /[a-zA-Z]\s*=\s*[^=]+/.test(input) ||
    input.includes('^') ||
    input.includes('_');

  return latexPattern.test(input) && hasBalancedBraces && mathish;
};
