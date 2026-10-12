import type { ExportTokenType } from "./types";

export interface TokenTypeRule {
  segments: string[];
  matchPosition: "any" | "prefix" | "leaf";
  type: ExportTokenType;
}

const MANDATORY_RULES: TokenTypeRule[] = [
  { segments: ["cornerradius"], matchPosition: "any", type: "spacing" },
  { segments: ["borderradius"], matchPosition: "any", type: "spacing" },
  { segments: ["radius"], matchPosition: "any", type: "spacing" },
];

const SEMANTIC_RULES: TokenTypeRule[] = [
  { segments: ["color"], matchPosition: "prefix", type: "color" },
  { segments: ["colour"], matchPosition: "prefix", type: "color" },

  { segments: ["spacing"], matchPosition: "any", type: "spacing" },
  { segments: ["space"], matchPosition: "any", type: "spacing" },
  { segments: ["gap"], matchPosition: "any", type: "spacing" },
  { segments: ["padding"], matchPosition: "any", type: "spacing" },
  { segments: ["margin"], matchPosition: "any", type: "spacing" },

  { segments: ["size"], matchPosition: "prefix", type: "spacing" },
  { segments: ["sizing"], matchPosition: "prefix", type: "sizing" },
  { segments: ["width"], matchPosition: "leaf", type: "sizing" },
  { segments: ["height"], matchPosition: "leaf", type: "sizing" },
  { segments: ["dimensions"], matchPosition: "any", type: "sizing" },

  { segments: ["zIndex"], matchPosition: "prefix", type: "zIndex" },

  { segments: ["typography", "fontSize"], matchPosition: "prefix", type: "fontSize" },
  { segments: ["fontSize"], matchPosition: "any", type: "fontSize" },

  { segments: ["typography", "fontFamily"], matchPosition: "prefix", type: "fontFamily" },
  { segments: ["fontFamily"], matchPosition: "any", type: "fontFamily" },

  { segments: ["typography", "fontWeight"], matchPosition: "prefix", type: "fontWeight" },
  { segments: ["fontWeight"], matchPosition: "any", type: "fontWeight" },

  { segments: ["typography", "lineHeight"], matchPosition: "prefix", type: "lineHeight" },
  { segments: ["lineHeight"], matchPosition: "any", type: "lineHeight" },

  { segments: ["typography", "letterSpacing"], matchPosition: "prefix", type: "letterSpacing" },
  { segments: ["letterSpacing"], matchPosition: "any", type: "letterSpacing" },

  { segments: ["typography", "paragraphSpacing"], matchPosition: "prefix", type: "paragraphSpacing" },
  { segments: ["paragraphSpacing"], matchPosition: "any", type: "paragraphSpacing" },

  { segments: ["typography", "paragraphIndent"], matchPosition: "prefix", type: "paragraphIndent" },
  { segments: ["paragraphIndent"], matchPosition: "any", type: "paragraphIndent" },

  { segments: ["borderWidth"], matchPosition: "any", type: "borderWidth" },
  { segments: ["strokeWidth"], matchPosition: "any", type: "borderWidth" },

  { segments: ["opacity"], matchPosition: "any", type: "opacity" },

  { segments: ["duration"], matchPosition: "any", type: "duration" },
  { segments: ["motion", "duration"], matchPosition: "prefix", type: "duration" },

  { segments: ["textCase"], matchPosition: "any", type: "textCase" },
  { segments: ["textDecoration"], matchPosition: "any", type: "textDecoration" },
];

function normalizeSegment(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

function matchesRule(pathSegments: string[], rule: TokenTypeRule): boolean {
  const lowerPath = pathSegments.map(normalizeSegment);
  const lowerRule = rule.segments.map(normalizeSegment);

  if (rule.matchPosition === "prefix") {
    if (lowerPath.length < lowerRule.length) return false;
    return lowerRule.every((seg, i) => lowerPath[i] === seg);
  }

  if (rule.matchPosition === "leaf") {
    return lowerRule.some((seg) => lowerPath[lowerPath.length - 1] === seg);
  }

  // "any" — contiguous subsequence match
  if (lowerRule.length === 1) {
    return lowerPath.some((seg) => seg === lowerRule[0]);
  }
  for (let i = 0; i <= lowerPath.length - lowerRule.length; i++) {
    let found = true;
    for (let j = 0; j < lowerRule.length; j++) {
      if (lowerPath[i + j] !== lowerRule[j]) {
        found = false;
        break;
      }
    }
    if (found) return true;
  }
  return false;
}

export function resolveTokenType(
  pathSegments: string[],
  figmaResolvedType: string,
  pathOverrides?: Map<string, ExportTokenType>
): ExportTokenType | null {
  const fullPath = pathSegments.join("/");

  // 1. Explicit path overrides
  if (pathOverrides) {
    const override = pathOverrides.get(fullPath);
    if (override) return override;
  }

  // 2. Mandatory rules (colour, spacing, radius)
  for (const rule of MANDATORY_RULES) {
    if (matchesRule(pathSegments, rule)) return rule.type;
  }

  // 3. Semantic path rules
  for (const rule of SEMANTIC_RULES) {
    if (matchesRule(pathSegments, rule)) return rule.type;
  }

  // 4. Figma resolved type fallback
  if (figmaResolvedType === "COLOR") return "color";
  if (figmaResolvedType === "BOOLEAN") return "boolean";
  if (figmaResolvedType === "STRING") return "string";

  // FLOAT with no semantic match is ambiguous
  return null;
}

export function resolveTokenTypeFromCollection(
  pathSegments: string[],
  figmaResolvedType: string,
  collectionName: string,
  pathOverrides?: Map<string, ExportTokenType>
): ExportTokenType | null {
  // Try path-based resolution first
  const pathResult = resolveTokenType(pathSegments, figmaResolvedType, pathOverrides);
  if (pathResult) return pathResult;

  // Collection name heuristic for FLOAT types
  if (figmaResolvedType === "FLOAT") {
    const lowerCollection = collectionName.toLowerCase();
    if (lowerCollection.includes("spacing") || lowerCollection === "_spacing") return "spacing";
    if (lowerCollection.includes("size") || lowerCollection.includes("sizing")) return "sizing";
    if (lowerCollection.includes("breakpoint")) return "sizing";
    if (lowerCollection.includes("radius")) return "spacing";
    if (lowerCollection.includes("opacity")) return "opacity";
    if (lowerCollection.includes("border")) return "borderWidth";
    if (lowerCollection.includes("duration") || lowerCollection.includes("motion")) return "duration";
  }

  return null;
}

const CORNER_RADIUS_SEGMENTS = ["cornerradius", "borderradius", "radius"];

export function resolveFilterCategory(
  pathSegments: string[],
  exportType: ExportTokenType
): string {
  const normalized = pathSegments.map(normalizeSegment);
  for (const seg of normalized) {
    if (CORNER_RADIUS_SEGMENTS.includes(seg)) {
      return "cornerRadius";
    }
  }
  return exportType;
}

export interface ValueFormatConfig {
  rootFontSize: number;
  spacingUnit: "rem" | "px" | "none";
  fontSizeUnit: "rem" | "px" | "none";
  lineHeightUnit: "rem" | "px" | "none";
  fontWeightFormat: "string" | "number";
  letterSpacingFormat: "string" | "number";
  opacityScale: "0-1" | "0-100";
  durationUnit: "ms" | "s";
  colorFormat: "hex" | "hex8" | "rgba";
}

export const DEFAULT_VALUE_FORMAT: ValueFormatConfig = {
  rootFontSize: 16,
  spacingUnit: "rem",
  fontSizeUnit: "rem",
  lineHeightUnit: "rem",
  fontWeightFormat: "string",
  letterSpacingFormat: "string",
  opacityScale: "0-1",
  durationUnit: "ms",
  colorFormat: "hex",
};
