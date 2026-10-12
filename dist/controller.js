"use strict";
(() => {
  // src/types.ts
  function isTokenLeaf(node) {
    return typeof node === "object" && node !== null && "value" in node && "type" in node && Object.keys(node).length === 2;
  }

  // src/config.ts
  var MANDATORY_RULES = [
    { segments: ["cornerradius"], matchPosition: "any", type: "spacing" },
    { segments: ["borderradius"], matchPosition: "any", type: "spacing" },
    { segments: ["radius"], matchPosition: "any", type: "spacing" }
  ];
  var SEMANTIC_RULES = [
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
    { segments: ["font", "size"], matchPosition: "any", type: "fontSize" },
    { segments: ["typography", "fontFamily"], matchPosition: "prefix", type: "fontFamily" },
    { segments: ["fontFamily"], matchPosition: "any", type: "fontFamily" },
    { segments: ["font", "family"], matchPosition: "any", type: "fontFamily" },
    { segments: ["typography", "fontWeight"], matchPosition: "prefix", type: "fontWeight" },
    { segments: ["fontWeight"], matchPosition: "any", type: "fontWeight" },
    { segments: ["font", "weight"], matchPosition: "any", type: "fontWeight" },
    { segments: ["typography", "lineHeight"], matchPosition: "prefix", type: "lineHeight" },
    { segments: ["lineHeight"], matchPosition: "any", type: "lineHeight" },
    { segments: ["line", "height"], matchPosition: "any", type: "lineHeight" },
    { segments: ["fontheight"], matchPosition: "any", type: "lineHeight" },
    { segments: ["font", "height"], matchPosition: "any", type: "lineHeight" },
    { segments: ["typography", "letterSpacing"], matchPosition: "prefix", type: "letterSpacing" },
    { segments: ["letterSpacing"], matchPosition: "any", type: "letterSpacing" },
    { segments: ["letter", "spacing"], matchPosition: "any", type: "letterSpacing" },
    { segments: ["typography", "paragraphSpacing"], matchPosition: "prefix", type: "paragraphSpacing" },
    { segments: ["paragraphSpacing"], matchPosition: "any", type: "paragraphSpacing" },
    { segments: ["paragraph", "spacing"], matchPosition: "any", type: "paragraphSpacing" },
    { segments: ["typography", "paragraphIndent"], matchPosition: "prefix", type: "paragraphIndent" },
    { segments: ["paragraphIndent"], matchPosition: "any", type: "paragraphIndent" },
    { segments: ["paragraph", "indent"], matchPosition: "any", type: "paragraphIndent" },
    { segments: ["borderWidth"], matchPosition: "any", type: "borderWidth" },
    { segments: ["strokeWidth"], matchPosition: "any", type: "borderWidth" },
    { segments: ["opacity"], matchPosition: "any", type: "opacity" },
    { segments: ["duration"], matchPosition: "any", type: "duration" },
    { segments: ["motion", "duration"], matchPosition: "prefix", type: "duration" },
    { segments: ["textCase"], matchPosition: "any", type: "textCase" },
    { segments: ["textDecoration"], matchPosition: "any", type: "textDecoration" }
  ];
  function normalizeSegment(s) {
    return s.toLowerCase().replace(/[\s\-_]+/g, "");
  }
  function matchesRule(pathSegments, rule) {
    const lowerPath = pathSegments.map(normalizeSegment);
    const lowerRule = rule.segments.map(normalizeSegment);
    if (rule.matchPosition === "prefix") {
      if (lowerPath.length < lowerRule.length) return false;
      return lowerRule.every((seg, i) => lowerPath[i] === seg);
    }
    if (rule.matchPosition === "leaf") {
      return lowerRule.some((seg) => lowerPath[lowerPath.length - 1] === seg);
    }
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
  function resolveTokenType(pathSegments, figmaResolvedType, pathOverrides) {
    const fullPath = pathSegments.join("/");
    if (pathOverrides) {
      const override = pathOverrides.get(fullPath);
      if (override) return override;
    }
    for (const rule of MANDATORY_RULES) {
      if (matchesRule(pathSegments, rule)) return rule.type;
    }
    for (const rule of SEMANTIC_RULES) {
      if (matchesRule(pathSegments, rule)) return rule.type;
    }
    if (figmaResolvedType === "COLOR") return "color";
    if (figmaResolvedType === "BOOLEAN") return "boolean";
    if (figmaResolvedType === "STRING") return "string";
    return null;
  }
  function resolveTokenTypeFromCollection(pathSegments, figmaResolvedType, collectionName, pathOverrides) {
    const pathResult = resolveTokenType(pathSegments, figmaResolvedType, pathOverrides);
    if (pathResult) return pathResult;
    if (figmaResolvedType === "FLOAT") {
      const lowerCollection = normalizeSegment(collectionName);
      if (lowerCollection.includes("spacing") || lowerCollection === "spacing") return "spacing";
      if (lowerCollection.includes("size") || lowerCollection.includes("sizing")) return "sizing";
      if (lowerCollection.includes("breakpoint")) return "sizing";
      if (lowerCollection.includes("radius")) return "spacing";
      if (lowerCollection.includes("opacity")) return "opacity";
      if (lowerCollection.includes("border")) return "borderWidth";
      if (lowerCollection.includes("duration") || lowerCollection.includes("motion")) return "duration";
      if (lowerCollection.includes("typography")) return "number";
    }
    if (figmaResolvedType === "FLOAT") return "number";
    return null;
  }
  var CORNER_RADIUS_SEGMENTS = ["cornerradius", "borderradius", "radius"];
  function resolveFilterCategory(pathSegments, exportType) {
    const normalized = pathSegments.map(normalizeSegment);
    for (const seg of normalized) {
      if (CORNER_RADIUS_SEGMENTS.includes(seg)) {
        return "cornerRadius";
      }
    }
    return exportType;
  }
  var DEFAULT_VALUE_FORMAT = {
    rootFontSize: 16,
    spacingUnit: "rem",
    fontSizeUnit: "rem",
    lineHeightUnit: "rem",
    fontWeightFormat: "string",
    letterSpacingFormat: "string",
    opacityScale: "0-1",
    durationUnit: "ms",
    colorFormat: "hex"
  };

  // src/export.ts
  function variableNameToPath(name) {
    return name.split("/").filter((s) => s.length > 0);
  }
  function pathToAliasReference(path) {
    return `{${path.join(".")}}`;
  }
  function toSafeRGBA(value) {
    if (typeof value !== "object" || value === null) return null;
    const obj = value;
    const r = typeof obj.r === "number" ? obj.r : 0;
    const g = typeof obj.g === "number" ? obj.g : 0;
    const b = typeof obj.b === "number" ? obj.b : 0;
    const a = typeof obj.a === "number" ? obj.a : 1;
    return { r, g, b, a };
  }
  function colorToString(color, format) {
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
  function numberToUnitString(value, unit, rootFontSize) {
    if (value === 0) return "0";
    if (unit === "rem") return `${value / rootFontSize}rem`;
    if (unit === "px") return `${value}px`;
    return value;
  }
  function formatValue(rawValue, tokenType, config = DEFAULT_VALUE_FORMAT) {
    if (rawValue === null || rawValue === void 0) return 0;
    if (typeof rawValue === "object" && rawValue !== null) {
      const rgba = toSafeRGBA(rawValue);
      if (rgba) {
        return colorToString(rgba, config.colorFormat);
      }
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
          if (config.durationUnit === "s") return `${rawValue / 1e3}s`;
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
    return String(rawValue);
  }
  function buildTokenTree(variables) {
    const root = {};
    for (const variable of variables) {
      let current = root;
      const path = variable.path;
      for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        if (!(segment in current)) {
          current[segment] = {};
        } else if (isTokenLeaf(current[segment])) {
          break;
        }
        current = current[segment];
      }
      const leafKey = path[path.length - 1];
      current[leafKey] = {
        value: variable.value,
        type: variable.type
      };
    }
    return root;
  }
  function filterByType(variables, typeFilter) {
    if (typeFilter === "All") return variables;
    return variables.filter((v) => v.filterCategory === typeFilter);
  }
  function collectTypeFilterOptions(variables) {
    const categories = /* @__PURE__ */ new Set();
    for (const v of variables) {
      categories.add(v.filterCategory);
    }
    return Array.from(categories).sort();
  }
  function sortTokenTree(node) {
    const sorted = {};
    const keys = Object.keys(node).sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
      const child = node[key];
      if (isTokenLeaf(child)) {
        sorted[key] = child;
      } else {
        sorted[key] = sortTokenTree(child);
      }
    }
    return sorted;
  }
  function tokenTreeToJson(tree) {
    return JSON.stringify(tree, null, 2) + "\n";
  }
  function isVariableAlias(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "VARIABLE_ALIAS" && "id" in value;
  }
  function processVariables(input) {
    const {
      variables,
      selectedModeId,
      collectionName,
      typeFilter,
      allVariablesById: allVariablesById2,
      pathOverrides,
      valueConfig = DEFAULT_VALUE_FORMAT
    } = input;
    const exportedVariables = [];
    const diagnostics = [];
    const seenPaths = /* @__PURE__ */ new Map();
    for (const variable of variables) {
      const path = variableNameToPath(variable.name);
      if (path.length === 0 || path.some((s) => s.length === 0)) {
        diagnostics.push({
          variableName: variable.name,
          message: "Empty path segment in variable name",
          severity: "error"
        });
        continue;
      }
      const pathKey = path.join("/");
      if (seenPaths.has(pathKey)) {
        diagnostics.push({
          variableName: variable.name,
          message: `Duplicate path "${pathKey}" (conflicts with "${seenPaths.get(pathKey)}")`,
          severity: "error"
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
          severity: "warning"
        });
        continue;
      }
      const rawValue = variable.valuesByMode[selectedModeId];
      if (rawValue === void 0) {
        diagnostics.push({
          variableName: variable.name,
          message: `No value for selected mode`,
          severity: "error"
        });
        continue;
      }
      const filterCategory = resolveFilterCategory(path, tokenType);
      if (isVariableAlias(rawValue)) {
        const targetVariable = allVariablesById2.get(rawValue.id);
        if (!targetVariable) {
          diagnostics.push({
            variableName: variable.name,
            message: `Alias target not found (ID: ${rawValue.id})`,
            severity: "error"
          });
          continue;
        }
        const targetPath = variableNameToPath(targetVariable.name);
        const aliasReference = pathToAliasReference(targetPath);
        exportedVariables.push({
          path,
          value: aliasReference,
          type: tokenType,
          filterCategory
        });
      } else {
        const formattedValue = formatValue(rawValue, tokenType, valueConfig);
        exportedVariables.push({
          path,
          value: formattedValue,
          type: tokenType,
          filterCategory
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
      typeFilterOptions: allTypeOptions
    };
  }

  // src/controller.ts
  var currentCollectionId = null;
  var currentModeId = null;
  var currentTypeFilter = "All";
  var allCollections = [];
  var cachedVariables = [];
  var allVariablesById = /* @__PURE__ */ new Map();
  var currentCollectionName = "";
  var requestGeneration = 0;
  function sendToUI(message) {
    figma.ui.postMessage(message);
  }
  async function loadCollections() {
    const rawCollections = await figma.variables.getLocalVariableCollectionsAsync();
    return rawCollections.map((c) => ({
      id: c.id,
      name: c.name,
      modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
      defaultModeId: c.defaultModeId
    }));
  }
  async function loadVariablesForCollection(collectionId) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) return { variables: [], allById: /* @__PURE__ */ new Map() };
    const variables = [];
    const allById = /* @__PURE__ */ new Map();
    for (const varId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(varId);
      if (!variable) continue;
      const data = {
        id: variable.id,
        name: variable.name,
        resolvedType: variable.resolvedType,
        valuesByMode: variable.valuesByMode
      };
      variables.push(data);
      allById.set(variable.id, data);
    }
    const aliasTargetIds = /* @__PURE__ */ new Set();
    for (const v of variables) {
      for (const modeValue of Object.values(v.valuesByMode)) {
        if (typeof modeValue === "object" && modeValue !== null && "type" in modeValue && modeValue.type === "VARIABLE_ALIAS" && "id" in modeValue) {
          const aliasId = modeValue.id;
          if (!allById.has(aliasId)) {
            aliasTargetIds.add(aliasId);
          }
        }
      }
    }
    for (const targetId of aliasTargetIds) {
      const targetVar = await figma.variables.getVariableByIdAsync(targetId);
      if (targetVar) {
        allById.set(targetId, {
          id: targetVar.id,
          name: targetVar.name,
          resolvedType: targetVar.resolvedType,
          valuesByMode: targetVar.valuesByMode
        });
      }
    }
    return { variables, allById };
  }
  async function generateExport() {
    if (!currentCollectionId || !currentModeId) return;
    requestGeneration++;
    const thisGeneration = requestGeneration;
    sendToUI({ type: "loading", loading: true });
    try {
      const result = processVariables({
        variables: cachedVariables,
        selectedModeId: currentModeId,
        collectionName: currentCollectionName,
        typeFilter: currentTypeFilter,
        allVariablesById
      });
      if (thisGeneration !== requestGeneration) return;
      sendToUI({
        type: "export-result",
        result: {
          jsonString: result.jsonString,
          variableCount: result.variableCount,
          diagnostics: result.diagnostics,
          typeFilterOptions: result.typeFilterOptions
        }
      });
    } catch (error) {
      if (thisGeneration !== requestGeneration) return;
      sendToUI({
        type: "error",
        message: `Export error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      if (thisGeneration === requestGeneration) {
        sendToUI({ type: "loading", loading: false });
      }
    }
  }
  async function initialize() {
    sendToUI({ type: "loading", loading: true });
    try {
      allCollections = await loadCollections();
      if (allCollections.length === 0) {
        sendToUI({ type: "collections-loaded", collections: [] });
        sendToUI({ type: "loading", loading: false });
        return;
      }
      sendToUI({ type: "collections-loaded", collections: allCollections });
      const firstCollection = allCollections[0];
      await selectCollection(firstCollection.id);
    } catch (error) {
      sendToUI({
        type: "error",
        message: `Initialization error: ${error instanceof Error ? error.message : String(error)}`
      });
      sendToUI({ type: "loading", loading: false });
    }
  }
  async function selectCollection(collectionId) {
    const collection = allCollections.find((c) => c.id === collectionId);
    if (!collection) return;
    currentCollectionId = collectionId;
    currentCollectionName = collection.name;
    currentTypeFilter = "All";
    currentModeId = collection.defaultModeId;
    const { variables, allById } = await loadVariablesForCollection(collectionId);
    cachedVariables = variables;
    allVariablesById = allById;
    await generateExport();
  }
  async function refresh() {
    sendToUI({ type: "loading", loading: true });
    try {
      allCollections = await loadCollections();
      sendToUI({ type: "collections-loaded", collections: allCollections });
      if (currentCollectionId) {
        const stillExists = allCollections.find((c) => c.id === currentCollectionId);
        if (stillExists) {
          const { variables, allById } = await loadVariablesForCollection(currentCollectionId);
          cachedVariables = variables;
          allVariablesById = allById;
          const modeStillValid = stillExists.modes.some((m) => m.modeId === currentModeId);
          if (!modeStillValid) {
            currentModeId = stillExists.defaultModeId;
          }
          await generateExport();
        } else if (allCollections.length > 0) {
          await selectCollection(allCollections[0].id);
        }
      }
    } catch (error) {
      sendToUI({
        type: "error",
        message: `Refresh error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      sendToUI({ type: "loading", loading: false });
    }
  }
  figma.showUI(__html__, { width: 560, height: 640, themeColors: true });
  figma.ui.onmessage = async (msg) => {
    switch (msg.type) {
      case "init":
        await initialize();
        break;
      case "refresh":
        await refresh();
        break;
      case "select-collection":
        await selectCollection(msg.collectionId);
        break;
      case "select-mode":
        currentModeId = msg.modeId;
        await generateExport();
        break;
      case "select-type-filter":
        currentTypeFilter = msg.typeFilter;
        await generateExport();
        break;
      case "close":
        figma.closePlugin();
        break;
    }
  };
})();
