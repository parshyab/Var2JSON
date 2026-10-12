import {
  variableNameToPath,
  pathToAliasReference,
  formatValue,
  buildTokenTree,
  filterByType,
  collectTypeFilterOptions,
  processVariables,
  tokenTreeToJson,
  sortTokenTree,
  validateTreeForConflicts,
  type VariableData,
  type ProcessVariablesInput,
} from "../src/export";
import type { ExportedVariable, ExportTokenType } from "../src/types";
import { DEFAULT_VALUE_FORMAT } from "../src/config";

describe("variableNameToPath", () => {
  it("splits slash-delimited names", () => {
    expect(variableNameToPath("color/pink/600")).toEqual(["color", "pink", "600"]);
  });

  it("handles single segment", () => {
    expect(variableNameToPath("opacity")).toEqual(["opacity"]);
  });

  it("filters empty segments", () => {
    expect(variableNameToPath("color//pink")).toEqual(["color", "pink"]);
  });
});

describe("pathToAliasReference", () => {
  it("converts path to dot-separated reference", () => {
    expect(pathToAliasReference(["color", "ash", "0"])).toBe("{color.ash.0}");
    expect(pathToAliasReference(["size", "200"])).toBe("{size.200}");
    expect(pathToAliasReference(["typography", "fontSize", "scaleZero"])).toBe(
      "{typography.fontSize.scaleZero}"
    );
  });
});

describe("formatValue", () => {
  it("formats RGBA color as hex", () => {
    const result = formatValue({ r: 1, g: 0, b: 0, a: 1 }, "color");
    expect(result).toBe("#ff0000");
  });

  it("formats transparent color as rgba", () => {
    const result = formatValue({ r: 1, g: 0, b: 0, a: 0.5 }, "color");
    expect(result).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("preserves alpha zero", () => {
    const result = formatValue({ r: 0, g: 0, b: 0, a: 0 }, "color");
    expect(result).toBe("rgba(0, 0, 0, 0)");
  });

  it("returns fontWeight as plain number", () => {
    expect(formatValue(600, "fontWeight")).toBe(600);
  });

  it("returns spacing as number by default", () => {
    expect(formatValue(16, "spacing")).toBe(16);
  });

  it("returns spacing as px when configured", () => {
    const config = { ...DEFAULT_VALUE_FORMAT, usePxForSpacing: true };
    expect(formatValue(16, "spacing", config)).toBe("16px");
  });

  it("converts fontSize to rem when configured", () => {
    const config = { ...DEFAULT_VALUE_FORMAT, useRemForFontSize: true, rootFontSize: 16 };
    expect(formatValue(15, "fontSize", config)).toBe("0.9375rem");
  });

  it("returns fontSize as number by default", () => {
    expect(formatValue(15, "fontSize")).toBe(15);
  });

  it("returns opacity in 0-1 scale by default", () => {
    expect(formatValue(0.5, "opacity")).toBe(0.5);
  });

  it("returns opacity in 0-100 scale when configured", () => {
    const config = { ...DEFAULT_VALUE_FORMAT, opacityScale: "0-100" as const };
    expect(formatValue(0.5, "opacity", config)).toBe(50);
  });

  it("returns duration in ms by default", () => {
    expect(formatValue(200, "duration")).toBe("200ms");
  });

  it("returns duration in seconds when configured", () => {
    const config = { ...DEFAULT_VALUE_FORMAT, durationUnit: "s" as const };
    expect(formatValue(200, "duration", config)).toBe("0.2s");
  });

  it("returns null for null input", () => {
    expect(formatValue(null, "color")).toBeNull();
  });

  it("passes through booleans", () => {
    expect(formatValue(true, "boolean")).toBe(true);
  });

  it("passes through strings", () => {
    expect(formatValue("Inter", "fontFamily")).toBe("Inter");
  });
});

describe("buildTokenTree", () => {
  it("builds nested structure from paths", () => {
    const vars: ExportedVariable[] = [
      { path: ["color", "pink", "600"], value: "#da016a", type: "color" },
      { path: ["color", "ash", "0"], value: "#ffffff", type: "color" },
    ];
    const tree = buildTokenTree(vars);
    expect(tree).toEqual({
      color: {
        pink: { "600": { value: "#da016a", type: "color" } },
        ash: { "0": { value: "#ffffff", type: "color" } },
      },
    });
  });

  it("handles single-segment paths", () => {
    const vars: ExportedVariable[] = [
      { path: ["opacity"], value: 0.5, type: "opacity" },
    ];
    const tree = buildTokenTree(vars);
    expect(tree).toEqual({
      opacity: { value: 0.5, type: "opacity" },
    });
  });
});

describe("filterByType", () => {
  const vars: ExportedVariable[] = [
    { path: ["color", "red"], value: "#ff0000", type: "color" },
    { path: ["spacing", "sm"], value: 8, type: "spacing" },
    { path: ["cornerRadius", "md"], value: 12, type: "spacing" },
  ];

  it("returns all when filter is All", () => {
    expect(filterByType(vars, "All")).toHaveLength(3);
  });

  it("filters by specific type", () => {
    const result = filterByType(vars, "spacing");
    expect(result).toHaveLength(2);
    expect(result.every((v) => v.type === "spacing")).toBe(true);
  });

  it("spacing filter includes cornerRadius tokens", () => {
    const result = filterByType(vars, "spacing");
    expect(result.some((v) => v.path[0] === "cornerRadius")).toBe(true);
  });
});

describe("collectTypeFilterOptions", () => {
  it("returns sorted unique types", () => {
    const vars: ExportedVariable[] = [
      { path: ["a"], value: 1, type: "spacing" },
      { path: ["b"], value: 2, type: "color" },
      { path: ["c"], value: 3, type: "spacing" },
      { path: ["d"], value: 4, type: "fontSize" },
    ];
    expect(collectTypeFilterOptions(vars)).toEqual(["color", "fontSize", "spacing"]);
  });
});

describe("processVariables", () => {
  function makeVariable(
    name: string,
    resolvedType: string,
    value: unknown,
    modeId: string = "mode1"
  ): VariableData {
    return {
      id: `id-${name}`,
      name,
      resolvedType,
      valuesByMode: { [modeId]: value },
    };
  }

  function makeAlias(targetId: string): { type: "VARIABLE_ALIAS"; id: string } {
    return { type: "VARIABLE_ALIAS", id: targetId };
  }

  it("exports colour tokens as color type", () => {
    const vars = [makeVariable("color/pink/600", "COLOR", { r: 0.855, g: 0.004, b: 0.416, a: 1 })];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    expect(result.variableCount).toBe(1);
    const parsed = JSON.parse(result.jsonString);
    expect(parsed.color.pink["600"].type).toBe("color");
  });

  it("exports spacing tokens as spacing type", () => {
    const vars = [makeVariable("spacing/small", "FLOAT", 8)];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.spacing.small.type).toBe("spacing");
  });

  it("exports cornerRadius as spacing type", () => {
    const vars = [makeVariable("cornerRadius/brand", "FLOAT", 8)];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.cornerRadius.brand.type).toBe("spacing");
  });

  it("exports borderRadius as spacing type", () => {
    const vars = [makeVariable("borderRadius/large", "FLOAT", 16)];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.borderRadius.large.type).toBe("spacing");
  });

  it("exports radius as spacing type", () => {
    const vars = [makeVariable("component/card/radius/default", "FLOAT", 12)];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.component.card.radius.default.type).toBe("spacing");
  });

  it("preserves alias references with originating token type", () => {
    const sizeVar = makeVariable("size/200", "FLOAT", 8);
    const radiusVar = makeVariable("cornerRadius/brand", "FLOAT", makeAlias(sizeVar.id));

    const allById = new Map([
      [sizeVar.id, sizeVar],
      [radiusVar.id, radiusVar],
    ]);

    const result = processVariables({
      variables: [radiusVar],
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.cornerRadius.brand.value).toBe("{size.200}");
    expect(parsed.cornerRadius.brand.type).toBe("spacing");
  });

  it("preserves color alias references", () => {
    const pinkVar = makeVariable("color/pink/600", "COLOR", { r: 0.855, g: 0.004, b: 0.416, a: 1 });
    const brandVar = makeVariable("color/icon/brand", "COLOR", makeAlias(pinkVar.id));

    const allById = new Map([
      [pinkVar.id, pinkVar],
      [brandVar.id, brandVar],
    ]);

    const result = processVariables({
      variables: [brandVar],
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.color.icon.brand.value).toBe("{color.pink.600}");
    expect(parsed.color.icon.brand.type).toBe("color");
  });

  it("handles mixed token collections", () => {
    const vars = [
      makeVariable("color/primary", "COLOR", { r: 0, g: 0, b: 1, a: 1 }),
      makeVariable("spacing/md", "FLOAT", 16),
      makeVariable("cornerRadius/sm", "FLOAT", 4),
      makeVariable("fontSize/base", "FLOAT", 14),
    ];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Mixed",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.color.primary.type).toBe("color");
    expect(parsed.spacing.md.type).toBe("spacing");
    expect(parsed.cornerRadius.sm.type).toBe("spacing");
    expect(parsed.fontSize.base.type).toBe("fontSize");
    expect(result.typeFilterOptions).toContain("color");
    expect(result.typeFilterOptions).toContain("spacing");
    expect(result.typeFilterOptions).toContain("fontSize");
  });

  it("handles typography values", () => {
    const vars = [
      makeVariable("typography/fontFamily", "STRING", "Inter"),
      makeVariable("typography/fontWeight/semiBold", "FLOAT", 600),
      makeVariable("typography/lineHeight/normal", "FLOAT", 1.5),
      makeVariable("typography/letterSpacing/tight", "FLOAT", -0.02),
    ];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Typography",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.typography.fontFamily.type).toBe("fontFamily");
    expect(parsed.typography.fontFamily.value).toBe("Inter");
    expect(parsed.typography.fontWeight.semiBold.type).toBe("fontWeight");
    expect(parsed.typography.fontWeight.semiBold.value).toBe(600);
    expect(parsed.typography.lineHeight.normal.type).toBe("lineHeight");
    expect(parsed.typography.letterSpacing.tight.type).toBe("letterSpacing");
  });

  it("reports diagnostics for broken aliases", () => {
    const vars = [
      makeVariable("color/broken", "COLOR", { type: "VARIABLE_ALIAS", id: "nonexistent" }),
    ];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].severity).toBe("error");
    expect(result.diagnostics[0].message).toContain("Alias target not found");
  });

  it("reports diagnostics for unresolved types", () => {
    const vars = [makeVariable("unknownThing", "FLOAT", 42)];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Custom",
      typeFilter: "All",
      allVariablesById: allById,
    });

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].severity).toBe("warning");
    expect(result.diagnostics[0].message).toContain("Unresolved token type");
  });

  it("handles mode switching", () => {
    const v: VariableData = {
      id: "id-1",
      name: "color/primary",
      resolvedType: "COLOR",
      valuesByMode: {
        beauty: { r: 1, g: 0, b: 0, a: 1 },
        fashion: { r: 0, g: 0, b: 1, a: 1 },
      },
    };
    const allById = new Map([[v.id, v]]);

    const beautyResult = processVariables({
      variables: [v],
      selectedModeId: "beauty",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const fashionResult = processVariables({
      variables: [v],
      selectedModeId: "fashion",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    expect(JSON.parse(beautyResult.jsonString).color.primary.value).toBe("#ff0000");
    expect(JSON.parse(fashionResult.jsonString).color.primary.value).toBe("#0000ff");
  });

  it("cross-collection alias uses target name for reference", () => {
    const externalVar: VariableData = {
      id: "ext-1",
      name: "size/200",
      resolvedType: "FLOAT",
      valuesByMode: { mode1: 8 },
    };

    const localVar = makeVariable("spacing/small", "FLOAT", makeAlias("ext-1"));

    const allById = new Map([
      [externalVar.id, externalVar],
      [localVar.id, localVar],
    ]);

    const result = processVariables({
      variables: [localVar],
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.spacing.small.value).toBe("{size.200}");
    expect(parsed.spacing.small.type).toBe("spacing");
  });

  it("reports missing mode values", () => {
    const vars = [makeVariable("color/test", "COLOR", { r: 1, g: 0, b: 0, a: 1 }, "other-mode")];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toContain("No value for selected mode");
  });

  it("detects duplicate paths", () => {
    const vars = [
      makeVariable("color/primary", "COLOR", { r: 1, g: 0, b: 0, a: 1 }),
      { ...makeVariable("color/primary", "COLOR", { r: 0, g: 1, b: 0, a: 1 }), id: "id-dup" },
    ];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    expect(result.diagnostics.some((d) => d.message.includes("Duplicate path"))).toBe(true);
  });
});

describe("tokenTreeToJson", () => {
  it("produces identical output for preview, copy, and download", () => {
    const vars: ExportedVariable[] = [
      { path: ["color", "red"], value: "#ff0000", type: "color" },
      { path: ["spacing", "sm"], value: 4, type: "spacing" },
    ];
    const tree = sortTokenTree(buildTokenTree(vars));
    const json = tokenTreeToJson(tree);

    // Calling again must produce identical string
    const json2 = tokenTreeToJson(tree);
    expect(json).toBe(json2);

    // Verify format: 2-space indent, trailing newline
    expect(json).toMatch(/^\{/);
    expect(json).toMatch(/\n$/);
    expect(json).toContain("  ");
    expect(json).not.toContain("\t");
  });
});

describe("sortTokenTree", () => {
  it("sorts keys alphabetically", () => {
    const tree = buildTokenTree([
      { path: ["z", "b"], value: 1, type: "spacing" },
      { path: ["a", "c"], value: 2, type: "spacing" },
    ]);
    const sorted = sortTokenTree(tree);
    const keys = Object.keys(sorted);
    expect(keys).toEqual(["a", "z"]);
  });
});

describe("validateTreeForConflicts", () => {
  it("detects leaf/group conflict", () => {
    const vars: ExportedVariable[] = [
      { path: ["color"], value: "#fff", type: "color" },
      { path: ["color", "red"], value: "#f00", type: "color" },
    ];
    const diagnostics = validateTreeForConflicts(vars);
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it("passes for clean tree", () => {
    const vars: ExportedVariable[] = [
      { path: ["color", "red"], value: "#f00", type: "color" },
      { path: ["color", "blue"], value: "#00f", type: "color" },
    ];
    const diagnostics = validateTreeForConflicts(vars);
    expect(diagnostics).toHaveLength(0);
  });
});
