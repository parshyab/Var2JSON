import type {
  TokenNode,
  TokenLeaf,
  ExportedVariable,
  ExportDiagnostic,
  ExportResult,
  ExportTokenType,
} from "./types";
import { isTokenLeaf } from "./types";
import {
  resolveTokenTypeFromCollection,
  resolveFilterCategory,
  DEFAULT_VALUE_FORMAT,
  type ValueFormatConfig,
} from "./config";

export function variableNameToPath(name: string): string[] {
  return name.split("/").filter((s) => s.length > 0);
}

export function pathToAliasReference(path: string[]): string {
  return `{${path.join(".")}}`;
}

interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function isRGBAColor(value: unknown): value is RGBAColor {
  if (typeof value !== "object" || value === null) return false;
  return "r" in value && "g" in value && "b" in value;
}

function toSafeRGBA(value: unknown): RGBAColor | null {
  if (typeof value !== "object" || value === null) return null;
  const obj = value as Record<string, unknown>;
  const r = typeof obj.r === "number" ? obj.r : 0;
  const g = typeof obj.g === "number" ? obj.g : 0;
  const b = typeof obj.b === "number" ? obj.b : 0;
  const a = typeof obj.a === "number" ? obj.a : 1;
  return { r, g, b, a };
}

function colorToString(color: RGBAColor, format: "hex" | "hex8" | "rgba"): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a;

  if (format === "rgba") {
    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return `rgba(${r}, ${g}, ${b}, 1)`;
  }

  const hexR = r.toString(16).padStart(2, "0");
  const hexG = g.toString(16).padStart(2, "0");
  const hexB = b.toString(16).padStart(2, "0");

  if (a < 1) {
    const hexA = Math.round(a * 255).toString(16).padStart(2, "0");
    return `#${hexR}${hexG}${hexB}${hexA}`.toLowerCase();
  }

  return `#${hexR}${hexG}${hexB}`.toLowerCase();
}

function numberToUnitString(value: number, unit: "rem" | "px" | "none", rootFontSize: number): string | number {
  if (value === 0) return "0";
  if (unit === "rem") return `${value / rootFontSize}rem`;
  if (unit === "px") return `${value}px`;
  return value;
}

export function formatValue(
  rawValue: unknown,
  tokenType: ExportTokenType,
  config: ValueFormatConfig = DEFAULT_VALUE_FORMAT
): string | number | boolean {
  if (rawValue === null || rawValue === undefined) return 0;

  // Color objects (Figma {r, g, b, a} — `a` may be missing)
  if (typeof rawValue === "object" && rawValue !== null) {
    const rgba = toSafeRGBA(rawValue);
    if (rgba) {
      return colorToString(rgba, config.colorFormat);
    }
    // Fallback: stringify any other object
    return JSON.stringify(rawValue);
  }

  if (typeof rawValue === "boolean") return rawValue;
  if (typeof rawValue === "string") return rawValue;

  if (typeof rawValue === "number") {
    switch (tokenType) {
      case "color":
        return rawValue;
      case "fontWeight":
        return config.fontWeightFormat === "string" ? String(rawValue) : rawValue;
      case "opacity":
        return config.opacityScale === "0-1" ? rawValue : rawValue * 100;
      case "fontSize":
        return numberToUnitString(rawValue, config.fontSizeUnit, config.rootFontSize);
      case "lineHeight":
        return numberToUnitString(rawValue, config.lineHeightUnit, config.rootFontSize);
      case "letterSpacing":
        return config.letterSpacingFormat === "string" ? String(rawValue) : rawValue;
      case "spacing":
        return numberToUnitString(rawValue, config.spacingUnit, config.rootFontSize);
      case "sizing":
        return numberToUnitString(rawValue, config.spacingUnit, config.rootFontSize);
      case "duration":
        if (config.durationUnit === "s") return `${rawValue / 1000}s`;
        return `${rawValue}ms`;
      case "borderWidth":
        return rawValue;
      case "paragraphSpacing":
      case "paragraphIndent":
        return rawValue;
      case "zIndex":
        return rawValue;
      default:
        return rawValue;
    }
  }

  // Fallback: coerce to string
  return String(rawValue);
}

export function buildTokenTree(variables: ExportedVariable[]): TokenNode {
  const root: TokenNode = {};

  for (const variable of variables) {
    let current: TokenNode = root;
    const path = variable.path;

    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (!(segment in current)) {
        current[segment] = {};
      } else if (isTokenLeaf(current[segment])) {
        break;
      }
      current = current[segment] as TokenNode;
    }

    const leafKey = path[path.length - 1];
    current[leafKey] = {
      value: variable.value,
      type: variable.type,
    } as TokenLeaf;
  }

  return root;
}

export function filterByType(
  variables: ExportedVariable[],
  typeFilter: string
): ExportedVariable[] {
  if (typeFilter === "All") return variables;
  return variables.filter((v) => v.filterCategory === typeFilter);
}

export function collectTypeFilterOptions(variables: ExportedVariable[]): string[] {
  const categories = new Set<string>();
  for (const v of variables) {
    categories.add(v.filterCategory);
  }
  return Array.from(categories).sort();
}

export function sortTokenTree(node: TokenNode): TokenNode {
  const sorted: TokenNode = {};
  const keys = Object.keys(node).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const child = node[key];
    if (isTokenLeaf(child)) {
      sorted[key] = child;
    } else {
      sorted[key] = sortTokenTree(child as TokenNode);
    }
  }
  return sorted;
}

export function tokenTreeToJson(tree: TokenNode): string {
  return JSON.stringify(tree, null, 2) + "\n";
}

export interface VariableData {
  id: string;
  name: string;
  resolvedType: string;
  valuesByMode: Record<string, unknown>;
}

export interface AliasInfo {
  type: "VARIABLE_ALIAS";
  id: string;
}

function isVariableAlias(value: unknown): value is AliasInfo {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as AliasInfo).type === "VARIABLE_ALIAS" &&
    "id" in value
  );
}

export interface ProcessVariablesInput {
  variables: VariableData[];
  selectedModeId: string;
  collectionName: string;
  typeFilter: string;
  allVariablesById: Map<string, VariableData>;
  pathOverrides?: Map<string, ExportTokenType>;
  valueConfig?: ValueFormatConfig;
}

export function processVariables(input: ProcessVariablesInput): ExportResult {
  const {
    variables,
    selectedModeId,
    collectionName,
    typeFilter,
    allVariablesById,
    pathOverrides,
    valueConfig = DEFAULT_VALUE_FORMAT,
  } = input;

  const exportedVariables: ExportedVariable[] = [];
  const diagnostics: ExportDiagnostic[] = [];
  const seenPaths = new Map<string, string>();

  for (const variable of variables) {
    const path = variableNameToPath(variable.name);

    if (path.length === 0 || path.some((s) => s.length === 0)) {
      diagnostics.push({
        variableName: variable.name,
        message: "Empty path segment in variable name",
        severity: "error",
      });
      continue;
    }

    const pathKey = path.join("/");
    if (seenPaths.has(pathKey)) {
      diagnostics.push({
        variableName: variable.name,
        message: `Duplicate path "${pathKey}" (conflicts with "${seenPaths.get(pathKey)}")`,
        severity: "error",
      });
      continue;
    }
    seenPaths.set(pathKey, variable.name);

    const tokenType = resolveTokenTypeFromCollection(
      path,
      variable.resolvedType,
      collectionName,
      pathOverrides
    );

    if (!tokenType) {
      diagnostics.push({
        variableName: variable.name,
        message: `Unresolved token type for "${variable.name}" (Figma type: ${variable.resolvedType}). Add a mapping in advanced settings.`,
        severity: "warning",
      });
      continue;
    }

    const rawValue = variable.valuesByMode[selectedModeId];

    if (rawValue === undefined) {
      diagnostics.push({
        variableName: variable.name,
        message: `No value for selected mode`,
        severity: "error",
      });
      continue;
    }

    const filterCategory = resolveFilterCategory(path, tokenType);

    if (isVariableAlias(rawValue)) {
      const targetVariable = allVariablesById.get(rawValue.id);
      if (!targetVariable) {
        diagnostics.push({
          variableName: variable.name,
          message: `Alias target not found (ID: ${rawValue.id})`,
          severity: "error",
        });
        continue;
      }

      const targetPath = variableNameToPath(targetVariable.name);
      const aliasReference = pathToAliasReference(targetPath);

      exportedVariables.push({
        path,
        value: aliasReference,
        type: tokenType,
        filterCategory,
      });
    } else {
      const formattedValue = formatValue(rawValue, tokenType, valueConfig);

      exportedVariables.push({
        path,
        value: formattedValue,
        type: tokenType,
        filterCategory,
      });
    }
  }

  const allTypeOptions = collectTypeFilterOptions(exportedVariables);
  const filtered = filterByType(exportedVariables, typeFilter);
  const tree = sortTokenTree(buildTokenTree(filtered));
  const jsonString = tokenTreeToJson(tree);

  return {
    tokenTree: tree,
    jsonString,
    variableCount: filtered.length,
    diagnostics,
    typeFilterOptions: allTypeOptions,
  };
}

export function validateTreeForConflicts(
  variables: ExportedVariable[]
): ExportDiagnostic[] {
  const diagnostics: ExportDiagnostic[] = [];
  const registered = new Set<string>();

  for (const variable of variables) {
    const pathStr = variable.path.join("/");

    for (let i = 1; i < variable.path.length; i++) {
      const parentPath = variable.path.slice(0, i).join("/");
      if (registered.has(parentPath)) {
        diagnostics.push({
          variableName: pathStr,
          message: `Path conflicts with existing leaf token "${parentPath}"`,
          severity: "error",
        });
      }
    }

    if (registered.has(pathStr)) {
      diagnostics.push({
        variableName: pathStr,
        message: `Duplicate path "${pathStr}"`,
        severity: "error",
      });
    }

    registered.add(pathStr);
  }

  return diagnostics;
}
