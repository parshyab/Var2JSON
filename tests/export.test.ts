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
} from "../src/export";
import type { ExportedVariable } from "../src/types";
import { DEFAULT_VALUE_FORMAT, type ValueFormatConfig } from "../src/config";

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

describe("formatValue — Crayons-aligned defaults", () => {
  it("formats opaque color as 6-digit lowercase hex", () => {
    expect(formatValue({ r: 0.855, g: 0.004, b: 0.416, a: 1 }, "color")).toBe("#da016a");
  });

  it("formats transparent color as 8-digit hex", () => {
    expect(formatValue({ r: 1, g: 1, b: 1, a: 0 }, "color")).toBe("#ffffff00");
  });

  it("formats partial alpha as 8-digit hex", () => {
    const result = formatValue({ r: 0.102, g: 0.125, b: 0.2, a: 0.6 }, "color");
    expect(result).toBe("#1a203399");
  });

  it("preserves alpha zero", () => {
    expect(formatValue({ r: 0, g: 0, b: 0, a: 0 }, "color")).toBe("#00000000");
  });

  it("formats spacing as rem string (Crayons size pattern)", () => {
    expect(formatValue(8, "spacing")).toBe("0.5rem");
    expect(formatValue(16, "spacing")).toBe("1rem");
    expect(formatValue(4, "spacing")).toBe("0.25rem");
  });

  it("formats spacing zero as string '0'", () => {
    expect(formatValue(0, "spacing")).toBe("0");
  });

  it("formats fontSize as rem string", () => {
    expect(formatValue(15, "fontSize")).toBe("0.9375rem");
    expect(formatValue(10, "fontSize")).toBe("0.625rem");
  });

  it("formats lineHeight as rem string", () => {
    expect(formatValue(16, "lineHeight")).toBe("1rem");
    expect(formatValue(24, "lineHeight")).toBe("1.5rem");
  });

  it("formats fontWeight as string number", () => {
    expect(formatValue(600, "fontWeight")).toBe("600");
    expect(formatValue(400, "fontWeight")).toBe("400");
  });

  it("formats letterSpacing as string number", () => {
    expect(formatValue(-0.4, "letterSpacing")).toBe("-0.4");
    expect(formatValue(1, "letterSpacing")).toBe("1");
  });

  it("returns zIndex as raw number", () => {
    expect(formatValue(4, "zIndex")).toBe(4);
    expect(formatValue(5, "zIndex")).toBe(5);
  });

  it("returns opacity in 0-1 scale by default", () => {
    expect(formatValue(0.5, "opacity")).toBe(0.5);
  });

  it("returns duration in ms by default", () => {
    expect(formatValue(200, "duration")).toBe("200ms");
  });

  it("returns null for null input", () => {
    expect(formatValue(null, "color")).toBeNull();
  });

  it("passes through booleans", () => {
    expect(formatValue(true, "boolean")).toBe(true);
  });

  it("passes through strings (fontFamily)", () => {
    expect(formatValue("Inter", "fontFamily")).toBe("Inter");
  });
});

describe("formatValue — alternative configs", () => {
  it("formats spacing as px when configured", () => {
    const config: ValueFormatConfig = { ...DEFAULT_VALUE_FORMAT, spacingUnit: "px" };
    expect(formatValue(16, "spacing", config)).toBe("16px");
  });

  it("formats spacing as raw number when none", () => {
    const config: ValueFormatConfig = { ...DEFAULT_VALUE_FORMAT, spacingUnit: "none" };
    expect(formatValue(16, "spacing", config)).toBe(16);
  });

  it("formats fontWeight as number when configured", () => {
    const config: ValueFormatConfig = { ...DEFAULT_VALUE_FORMAT, fontWeightFormat: "number" };
    expect(formatValue(600, "fontWeight", config)).toBe(600);
  });

  it("formats letterSpacing as number when configured", () => {
    const config: ValueFormatConfig = { ...DEFAULT_VALUE_FORMAT, letterSpacingFormat: "number" };
    expect(formatValue(-0.4, "letterSpacing", config)).toBe(-0.4);
  });

  it("formats color as rgba when configured", () => {
    const config: ValueFormatConfig = { ...DEFAULT_VALUE_FORMAT, colorFormat: "rgba" };
    expect(formatValue({ r: 1, g: 0, b: 0, a: 0.5 }, "color", config)).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("formats duration in seconds when configured", () => {
    const config: ValueFormatConfig = { ...DEFAULT_VALUE_FORMAT, durationUnit: "s" };
    expect(formatValue(200, "duration", config)).toBe("0.2s");
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
    { path: ["spacing", "sm"], value: "0.5rem", type: "spacing" },
    { path: ["cornerRadius", "md"], value: "{size.400}", type: "spacing" },
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
      { path: ["a"], value: "0.5rem", type: "spacing" },
      { path: ["b"], value: "#f00", type: "color" },
      { path: ["c"], value: "0.5rem", type: "spacing" },
      { path: ["d"], value: "0.9375rem", type: "fontSize" },
    ];
    expect(collectTypeFilterOptions(vars)).toEqual(["color", "fontSize", "spacing"]);
  });
});

describe("processVariables — Crayons patterns", () => {
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

  it("exports colour tokens with lowercase hex", () => {
    const vars = [makeVariable("color/pink/600", "COLOR", { r: 0.855, g: 0.004, b: 0.416, a: 1 })];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.color.pink["600"].type).toBe("color");
    expect(parsed.color.pink["600"].value).toBe("#da016a");
  });

  it("exports transparent color with 8-digit hex", () => {
    const vars = [makeVariable("color/ash/opacity0", "COLOR", { r: 1, g: 1, b: 1, a: 0 })];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "_Primitives",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.color.ash.opacity0.value).toBe("#ffffff00");
  });

  it("exports size/* tokens as spacing type with rem values", () => {
    const vars = [
      makeVariable("size/200", "FLOAT", 8),
      makeVariable("size/400", "FLOAT", 16),
      makeVariable("size/0", "FLOAT", 0),
    ];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "_Primitives",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.size["200"].value).toBe("0.5rem");
    expect(parsed.size["200"].type).toBe("spacing");
    expect(parsed.size["400"].value).toBe("1rem");
    expect(parsed.size["0"].value).toBe("0");
  });

  it("exports spacing tokens as spacing type", () => {
    const vars = [makeVariable("spacing/padding/sm", "FLOAT", makeAlias("id-size/200"))];
    const sizeVar = makeVariable("size/200", "FLOAT", 8);
    const allById = new Map([
      [vars[0].id, vars[0]],
      [sizeVar.id, sizeVar],
    ]);

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Style",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.spacing.padding.sm.value).toBe("{size.200}");
    expect(parsed.spacing.padding.sm.type).toBe("spacing");
  });

  it("exports cornerRadius as spacing type with size alias", () => {
    const sizeVar = makeVariable("size/max", "FLOAT", 10000);
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
    expect(parsed.cornerRadius.brand.value).toBe("{size.max}");
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

  it("exports nested radius path as spacing type", () => {
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

  it("preserves alias references — color semantic tokens", () => {
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
      makeVariable("spacing/padding/md", "FLOAT", 16),
      makeVariable("cornerRadius/sm", "FLOAT", 4),
      makeVariable("typography/fontSize/scaleZero", "FLOAT", 15),
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
    expect(parsed.spacing.padding.md.type).toBe("spacing");
    expect(parsed.spacing.padding.md.value).toBe("1rem");
    expect(parsed.cornerRadius.sm.type).toBe("spacing");
    expect(parsed.cornerRadius.sm.value).toBe("0.25rem");
    expect(parsed.typography.fontSize.scaleZero.type).toBe("fontSize");
    expect(parsed.typography.fontSize.scaleZero.value).toBe("0.9375rem");
  });

  it("handles typography primitives matching Crayons format", () => {
    const vars = [
      makeVariable("typography/fontFamily/inter", "STRING", "Inter"),
      makeVariable("typography/fontWeight/semiBold", "FLOAT", 600),
      makeVariable("typography/lineHeight/lhOne", "FLOAT", 24),
      makeVariable("typography/letterSpacing/lsNegthree", "FLOAT", -0.4),
      makeVariable("typography/fontSize/scaleZero", "FLOAT", 15),
    ];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "_Primitives",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.typography.fontFamily.inter.value).toBe("Inter");
    expect(parsed.typography.fontFamily.inter.type).toBe("fontFamily");
    expect(parsed.typography.fontWeight.semiBold.value).toBe("600");
    expect(parsed.typography.fontWeight.semiBold.type).toBe("fontWeight");
    expect(parsed.typography.lineHeight.lhOne.value).toBe("1.5rem");
    expect(parsed.typography.lineHeight.lhOne.type).toBe("lineHeight");
    expect(parsed.typography.letterSpacing.lsNegthree.value).toBe("-0.4");
    expect(parsed.typography.letterSpacing.lsNegthree.type).toBe("letterSpacing");
    expect(parsed.typography.fontSize.scaleZero.value).toBe("0.9375rem");
    expect(parsed.typography.fontSize.scaleZero.type).toBe("fontSize");
  });

  it("handles typography semantic tokens with aliases", () => {
    const fontWeightVar = makeVariable("typography/fontWeight/semiBold", "FLOAT", 600);
    const fontSizeVar = makeVariable("typography/fontSize/scaleZero", "FLOAT", 15);

    const headingFontWeight = makeVariable(
      "typography/heading/subSection/fontWeight", "FLOAT",
      makeAlias(fontWeightVar.id)
    );
    const headingFontSize = makeVariable(
      "typography/heading/subSection/fontSize", "FLOAT",
      makeAlias(fontSizeVar.id)
    );

    const allById = new Map([
      [fontWeightVar.id, fontWeightVar],
      [fontSizeVar.id, fontSizeVar],
      [headingFontWeight.id, headingFontWeight],
      [headingFontSize.id, headingFontSize],
    ]);

    const result = processVariables({
      variables: [headingFontWeight, headingFontSize],
      selectedModeId: "mode1",
      collectionName: "Typography",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.typography.heading.subSection.fontWeight.value).toBe("{typography.fontWeight.semiBold}");
    expect(parsed.typography.heading.subSection.fontWeight.type).toBe("fontWeight");
    expect(parsed.typography.heading.subSection.fontSize.value).toBe("{typography.fontSize.scaleZero}");
    expect(parsed.typography.heading.subSection.fontSize.type).toBe("fontSize");
  });

  it("exports zIndex tokens matching Crayons format", () => {
    const vars = [
      makeVariable("zIndex/blanket", "FLOAT", 4),
      makeVariable("zIndex/modal", "FLOAT", 5),
      makeVariable("zIndex/toast", "FLOAT", 6),
    ];
    const allById = new Map(vars.map((v) => [v.id, v]));

    const result = processVariables({
      variables: vars,
      selectedModeId: "mode1",
      collectionName: "Misc",
      typeFilter: "All",
      allVariablesById: allById,
    });

    const parsed = JSON.parse(result.jsonString);
    expect(parsed.zIndex.blanket.value).toBe(4);
    expect(parsed.zIndex.blanket.type).toBe("zIndex");
    expect(parsed.zIndex.modal.value).toBe(5);
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

  it("cross-collection alias preserves originating type", () => {
    const externalVar: VariableData = {
      id: "ext-1",
      name: "size/200",
      resolvedType: "FLOAT",
      valuesByMode: { mode1: 8 },
    };

    const localVar = makeVariable("spacing/padding/sm", "FLOAT", makeAlias("ext-1"));

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
    expect(parsed.spacing.padding.sm.value).toBe("{size.200}");
    expect(parsed.spacing.padding.sm.type).toBe("spacing");
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
      { path: ["spacing", "sm"], value: "0.25rem", type: "spacing" },
    ];
    const tree = sortTokenTree(buildTokenTree(vars));
    const json = tokenTreeToJson(tree);
    const json2 = tokenTreeToJson(tree);
    expect(json).toBe(json2);
    expect(json).toMatch(/^\{/);
    expect(json).toMatch(/\n$/);
    expect(json).toContain("  ");
    expect(json).not.toContain("\t");
  });
});

describe("sortTokenTree", () => {
  it("sorts keys alphabetically", () => {
    const tree = buildTokenTree([
      { path: ["z", "b"], value: "0.5rem", type: "spacing" },
      { path: ["a", "c"], value: "1rem", type: "spacing" },
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
