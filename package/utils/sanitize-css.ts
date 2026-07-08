/**
 * Sanitize + scope + validate author-supplied custom CSS before it is injected
 * into the document.
 *
 * Authors write **normal, full-page CSS** — `body { … }`, `html body h1 { … }`,
 * `h1 { … }`, `* { … }` — the way they'd style any web page. We transparently
 * scope every rule to the document so it can't leak into the app, AND we map the
 * page-root selectors (`html`, `body`, `:root`) onto the document root so that
 * `body { background: … }` styles the doc surface and `html body h1 { … }`
 * styles the doc's headings. No `.ProseMirror` prefix, no learning curve.
 *
 * Because the raw string reaches VIEWERS of a published doc, it is untrusted.
 * Every selector is force-scoped (so a `}` breakout is neutralised — the escaped
 * rule is simply scoped too), and dangerous declarations are stripped:
 *  - external resource loads / exfiltration: `url(…)`, `@import`;
 *  - clickjacking / UI redressing: `position: fixed | sticky`;
 *  - legacy script vectors: `expression()`, `-moz-binding`, `behavior:`.
 *
 * We parse with the browser's own CSS engine (no dependency), rewrite each
 * selector, strip dangerous declarations at every nesting level, and let the
 * engine re-serialise — so the output is always a valid, balanced stylesheet.
 *
 * The sanitizer knows exactly what it removed, so it returns non-blocking
 * `diagnostics`; the editing UI surfaces them (CSS is forgiving — we warn,
 * never block).
 */

export interface CssDiagnostic {
  level: 'warning' | 'error';
  message: string;
}

export interface CssValidationResult {
  /** Sanitized, scoped CSS, safe to inject. '' when nothing survives. */
  css: string;
  /** What was stripped/ignored, deduped. Empty when the CSS was fully clean. */
  diagnostics: CssDiagnostic[];
}

// Any url(...) reference — we allow none (document images come through the
// content pipeline, not CSS), so even data: URIs are dropped for simplicity.
const URL_REF = /url\(/i;
// Legacy/script-ish value vectors.
const DANGEROUS_VALUE = /expression\(|-moz-binding|behavior\s*:/i;
// A leading document-root chain that we map onto the doc scope so full-page
// CSS "just works": the page roots (html / body / :root) and `.markdown-body`
// — the github-markdown content wrapper many blogs (incl. Vitalik's) use as
// their content root, equivalent to our `.ProseMirror`. Only matches a
// "complete" token (followed by whitespace, a combinator, or end) so
// `body.dark` / `.markdown-body-foo` aren't mistaken for the root token.
const ROOT_LEAD =
  /^\s*(?:(?:html|body|:root|\.markdown-body)(?=$|[\s>~+])\s*[>~+]?\s*)+/i;

const MSG = {
  url: "url() and external resources aren't allowed, so they were removed.",
  position:
    "position: fixed and position: sticky aren't allowed, so they were removed.",
  legacy: "expression() and behavior aren't allowed, so they were removed.",
  atImport: "@import isn't allowed, so it was removed.",
  unparseable: "Couldn't parse this CSS. Check for a typo or unbalanced { }.",
};

// Split a comma-separated selector list at top level, respecting () and [].
const splitSelectorList = (list: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
};

// Scope a single selector to `scope`, mapping a leading html/body/:root chain
// onto the scope itself (so `body` → scope, `body h1` → `scope h1`).
const scopeSelector = (selector: string, scope: string): string => {
  const trimmed = selector.trim();
  if (!trimmed) return '';
  const remainder = trimmed.replace(ROOT_LEAD, '').trim();
  if (!remainder) return scope; // `body`, `html body`, `:root` → the doc root
  return `${scope} ${remainder}`;
};

const scopeSelectorList = (selectorText: string, scope: string): string =>
  splitSelectorList(selectorText)
    .map((s) => scopeSelector(s, scope))
    .filter(Boolean)
    .join(', ');

const stripDeclarations = (
  style: CSSStyleDeclaration,
  reasons: Set<string>,
): void => {
  // Iterate a snapshot — removeProperty mutates the live collection.
  for (const prop of Array.from(style)) {
    const name = prop.toLowerCase();
    const value = style.getPropertyValue(prop);
    if (URL_REF.test(value)) {
      style.removeProperty(prop);
      reasons.add(MSG.url);
    } else if (name === 'position' && /\b(fixed|sticky)\b/i.test(value)) {
      style.removeProperty(prop);
      reasons.add(MSG.position);
    } else if (
      DANGEROUS_VALUE.test(value) ||
      name === 'behavior' ||
      name === '-moz-binding'
    ) {
      style.removeProperty(prop);
      reasons.add(MSG.legacy);
    }
  }
};

// Recursively strip dangerous declarations from a rule and everything nested in
// it. Author-nested rules (`h1 { & span { … } }`) stay relative to their parent
// — we don't re-scope them, only strip their declarations.
const stripRule = (rule: CSSRule, reasons: Set<string>): void => {
  const anyRule = rule as CSSRule & {
    style?: CSSStyleDeclaration;
    cssRules?: CSSRuleList;
  };
  if (anyRule.style) stripDeclarations(anyRule.style, reasons);
  if (anyRule.cssRules) {
    for (const child of Array.from(anyRule.cssRules)) stripRule(child, reasons);
  }
};

const isStyleRule = (rule: CSSRule): boolean =>
  typeof CSSStyleRule !== 'undefined' && rule instanceof CSSStyleRule;

// @media / @supports — conditional groups that can wrap (and nest) style rules.
const isGroupingRule = (rule: CSSRule): boolean =>
  (typeof CSSMediaRule !== 'undefined' && rule instanceof CSSMediaRule) ||
  (typeof CSSSupportsRule !== 'undefined' && rule instanceof CSSSupportsRule);

// Sanitize a rule tree in place, returning true if the rule should be KEPT.
//  - style rule: scope its selector (DROP if unscopable — never keep an
//    unscoped selector) and strip dangerous declarations (this rule + its
//    author-nested, relative rules).
//  - grouping rule (@media / @supports, at ANY nesting depth): recurse and
//    delete any child that must be dropped, so nested rules can't escape
//    scoping or smuggle url()/@import/position:fixed past the sanitizer.
//  - anything else (@import, @font-face, @keyframes, @layer, @container, …):
//    drop. Keeping only known-safe rules is the security-critical default.
const sanitizeRule = (
  rule: CSSRule,
  scope: string,
  reasons: Set<string>,
): boolean => {
  if (isStyleRule(rule)) {
    const styleRule = rule as CSSStyleRule;
    const scoped = scopeSelectorList(styleRule.selectorText, scope);
    if (!scoped) return false;
    try {
      styleRule.selectorText = scoped;
    } catch {
      return false;
    }
    stripRule(styleRule, reasons);
    return true;
  }
  if (isGroupingRule(rule)) {
    const group = rule as CSSGroupingRule;
    // Iterate backwards so deleteRule() doesn't shift the indices ahead of us.
    for (let i = group.cssRules.length - 1; i >= 0; i -= 1) {
      if (!sanitizeRule(group.cssRules[i], scope, reasons)) {
        try {
          group.deleteRule(i);
        } catch {
          /* ignore */
        }
      }
    }
    return true;
  }
  return false;
};

/**
 * Sanitize + scope AND report. Use this from the editing UI for diagnostics.
 */
export const validateCustomCss = (
  raw: string | undefined | null,
  scope = '.ProseMirror',
): CssValidationResult => {
  if (!raw || !raw.trim() || typeof document === 'undefined') {
    return { css: '', diagnostics: [] };
  }

  const reasons = new Set<string>();

  let sheet: CSSStyleSheet | null = null;
  try {
    // Parse in a detached document so nothing applies to the live page.
    const doc = document.implementation.createHTMLDocument('');
    const styleEl = doc.createElement('style');
    styleEl.textContent = raw;
    doc.head.appendChild(styleEl);
    sheet = styleEl.sheet;
  } catch {
    return {
      css: '',
      diagnostics: [{ level: 'error', message: MSG.unparseable }],
    };
  }
  if (!sheet) {
    return {
      css: '',
      diagnostics: [{ level: 'error', message: MSG.unparseable }],
    };
  }

  if (/@import\b/i.test(raw)) reasons.add(MSG.atImport);

  const kept: string[] = [];
  for (const rule of Array.from(sheet.cssRules)) {
    if (sanitizeRule(rule, scope, reasons)) kept.push(rule.cssText);
  }

  const css = kept.join('\n');
  const diagnostics: CssDiagnostic[] = Array.from(reasons).map((message) => ({
    level: 'warning',
    message,
  }));
  // Non-empty input that produced nothing, with no other explanation → syntax.
  if (!css && reasons.size === 0) {
    diagnostics.push({ level: 'error', message: MSG.unparseable });
  }

  return { css, diagnostics };
};

/**
 * Sanitized + scoped CSS only — used at injection/export sinks that just need
 * the safe string. Diagnostics are surfaced separately via validateCustomCss.
 */
export const sanitizeCustomCss = (
  raw: string | undefined | null,
  scope = '.ProseMirror',
): string => validateCustomCss(raw, scope).css;
