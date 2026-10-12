import { resolveTokenType, resolveTokenTypeFromCollection } from "../src/config";

describe("resolveTokenType", () => {
  // Mandatory: colour → color
  it("resolves color/* as color", () => {
    expect(resolveTokenType(["color", "pink", "600"], "COLOR")).toBe("color");
  });

  it("resolves colour/* as color", () => {
    expect(resolveTokenType(["colour", "primary"], "COLOR")).toBe("color");
  });

  // Mandatory: spacing → spacing
  it("resolves spacing/* as spacing", () => {
    expect(resolveTokenType(["spacing", "small"], "FLOAT")).toBe("spacing");
  });

  it("resolves gap/* as spacing", () => {
    expect(resolveTokenType(["gap", "md"], "FLOAT")).toBe("spacing");
  });

  it("resolves padding/* as spacing", () => {
    expect(resolveTokenType(["padding", "lg"], "FLOAT")).toBe("spacing");
  });

  it("resolves margin/* as spacing", () => {
    expect(resolveTokenType(["margin", "top"], "FLOAT")).toBe("spacing");
  });

  // Mandatory: radius → spacing
  it("resolves cornerRadius/* as spacing", () => {
    expect(resolveTokenType(["cornerRadius", "brand"], "FLOAT")).toBe("spacing");
  });

  it("resolves borderRadius/* as spacing", () => {
    expect(resolveTokenType(["borderRadius", "large"], "FLOAT")).toBe("spacing");
  });

  it("resolves radius/* as spacing", () => {
    expect(resolveTokenType(["radius", "pill"], "FLOAT")).toBe("spacing");
  });

  it("resolves nested radius as spacing", () => {
    expect(resolveTokenType(["component", "card", "cornerRadius", "default"], "FLOAT")).toBe("spacing");
  });

  // Space-separated Figma variable names (e.g. "corner radius/small")
  it("resolves 'corner radius' (with space) as spacing", () => {
    expect(resolveTokenType(["corner radius", "small"], "FLOAT")).toBe("spacing");
    expect(resolveTokenType(["corner radius", "medium"], "FLOAT")).toBe("spacing");
    expect(resolveTokenType(["corner radius", "large"], "FLOAT")).toBe("spacing");
  });

  it("resolves 'border radius' (with space) as spacing", () => {
    expect(resolveTokenType(["border radius", "lg"], "FLOAT")).toBe("spacing");
  });

  // Hyphenated Figma variable names
  it("resolves hyphenated 'corner-radius' as spacing", () => {
    expect(resolveTokenType(["corner-radius", "sm"], "FLOAT")).toBe("spacing");
  });

  it("resolves underscore 'corner_radius' as spacing", () => {
    expect(resolveTokenType(["corner_radius", "md"], "FLOAT")).toBe("spacing");
  });

  // Size → spacing (Crayons pattern: size/* has type "spacing")
  it("resolves size/* as spacing (Crayons pattern)", () => {
    expect(resolveTokenType(["size", "200"], "FLOAT")).toBe("spacing");
    expect(resolveTokenType(["size", "max"], "FLOAT")).toBe("spacing");
    expect(resolveTokenType(["size", "0"], "FLOAT")).toBe("spacing");
  });

  // Sizing (explicit sizing prefix)
  it("resolves sizing/* as sizing", () => {
    expect(resolveTokenType(["sizing", "icon"], "FLOAT")).toBe("sizing");
  });

  // Typography
  it("resolves typography/fontSize/* as fontSize", () => {
    expect(resolveTokenType(["typography", "fontSize", "scaleZero"], "FLOAT")).toBe("fontSize");
  });

  it("resolves fontSize/* as fontSize", () => {
    expect(resolveTokenType(["fontSize", "base"], "FLOAT")).toBe("fontSize");
  });

  it("resolves typography/fontFamily/* as fontFamily", () => {
    expect(resolveTokenType(["typography", "fontFamily"], "STRING")).toBe("fontFamily");
  });

  it("resolves fontWeight/* as fontWeight", () => {
    expect(resolveTokenType(["fontWeight", "bold"], "FLOAT")).toBe("fontWeight");
  });

  it("resolves typography/fontWeight/* as fontWeight", () => {
    expect(resolveTokenType(["typography", "fontWeight", "semiBold"], "FLOAT")).toBe("fontWeight");
  });

  it("resolves lineHeight/* as lineHeight", () => {
    expect(resolveTokenType(["lineHeight", "normal"], "FLOAT")).toBe("lineHeight");
  });

  it("resolves typography/lineHeight/* as lineHeight", () => {
    expect(resolveTokenType(["typography", "lineHeight", "lhOne"], "FLOAT")).toBe("lineHeight");
  });

  it("resolves letterSpacing/* as letterSpacing", () => {
    expect(resolveTokenType(["letterSpacing", "tight"], "FLOAT")).toBe("letterSpacing");
  });

  it("resolves typography/letterSpacing/* as letterSpacing", () => {
    expect(resolveTokenType(["typography", "letterSpacing", "lsNegthree"], "FLOAT")).toBe("letterSpacing");
  });

  // Multi-segment font/size, font/weight, font/height (Figma split paths)
  it("resolves font/size/* as fontSize (two segments)", () => {
    expect(resolveTokenType(["font", "size", "scale 6 (28)"], "FLOAT")).toBe("fontSize");
    expect(resolveTokenType(["font", "size", "scale 5 (25)"], "FLOAT")).toBe("fontSize");
  });

  it("resolves font/weight/* as fontWeight (two segments)", () => {
    expect(resolveTokenType(["font", "weight", "bold"], "FLOAT")).toBe("fontWeight");
  });

  it("resolves font/height/* as lineHeight (two segments)", () => {
    expect(resolveTokenType(["font", "height", "normal"], "FLOAT")).toBe("lineHeight");
  });

  it("resolves font/family/* as fontFamily (two segments)", () => {
    expect(resolveTokenType(["font", "family", "inter"], "STRING")).toBe("fontFamily");
  });

  // Hyphenated typography names
  it("resolves typography/font-size as fontSize", () => {
    expect(resolveTokenType(["typography", "font-size"], "FLOAT")).toBe("fontSize");
  });

  it("resolves typography/font-weight as fontWeight", () => {
    expect(resolveTokenType(["typography", "font-weight"], "FLOAT")).toBe("fontWeight");
  });

  it("resolves typography/font-height as lineHeight", () => {
    expect(resolveTokenType(["typography", "font-height"], "FLOAT")).toBe("lineHeight");
  });

  it("resolves typography/line-height as lineHeight", () => {
    expect(resolveTokenType(["typography", "line-height"], "FLOAT")).toBe("lineHeight");
  });

  it("resolves typography/letter-spacing as letterSpacing", () => {
    expect(resolveTokenType(["typography", "letter-spacing"], "FLOAT")).toBe("letterSpacing");
  });

  // zIndex
  it("resolves zIndex/* as zIndex", () => {
    expect(resolveTokenType(["zIndex", "modal"], "FLOAT")).toBe("zIndex");
    expect(resolveTokenType(["zIndex", "blanket"], "FLOAT")).toBe("zIndex");
  });

  // Other types
  it("resolves borderWidth/* as borderWidth", () => {
    expect(resolveTokenType(["borderWidth", "thin"], "FLOAT")).toBe("borderWidth");
  });

  it("resolves opacity/* as opacity", () => {
    expect(resolveTokenType(["opacity", "half"], "FLOAT")).toBe("opacity");
  });

  it("resolves duration/* as duration", () => {
    expect(resolveTokenType(["duration", "fast"], "FLOAT")).toBe("duration");
  });

  // Semantic typography paths (heading/section/fontSize etc.)
  it("resolves deeply nested typography leaf segments", () => {
    expect(resolveTokenType(["typography", "heading", "section", "fontSize"], "FLOAT")).toBe("fontSize");
    expect(resolveTokenType(["typography", "heading", "section", "fontWeight"], "FLOAT")).toBe("fontWeight");
    expect(resolveTokenType(["typography", "heading", "section", "lineHeight"], "FLOAT")).toBe("lineHeight");
    expect(resolveTokenType(["typography", "heading", "section", "letterSpacing"], "FLOAT")).toBe("letterSpacing");
  });

  // Fallback to Figma types
  it("falls back to color for COLOR resolved type", () => {
    expect(resolveTokenType(["unknownColorThing"], "COLOR")).toBe("color");
  });

  it("falls back to boolean for BOOLEAN resolved type", () => {
    expect(resolveTokenType(["multiLineText"], "BOOLEAN")).toBe("boolean");
  });

  it("falls back to string for STRING resolved type", () => {
    expect(resolveTokenType(["description"], "STRING")).toBe("string");
  });

  it("returns null for ambiguous FLOAT from resolveTokenType (path-only)", () => {
    expect(resolveTokenType(["unknownThing"], "FLOAT")).toBeNull();
  });

  // Path overrides
  it("uses explicit path override over all rules", () => {
    const overrides = new Map<string, "number">();
    overrides.set("custom/value", "number");
    expect(resolveTokenType(["custom", "value"], "FLOAT", overrides)).toBe("number");
  });

  // Case insensitive
  it("matches case-insensitively", () => {
    expect(resolveTokenType(["CornerRadius", "Brand"], "FLOAT")).toBe("spacing");
    expect(resolveTokenType(["COLOR", "PRIMARY"], "COLOR")).toBe("color");
  });
});

describe("resolveTokenTypeFromCollection — FLOAT fallback", () => {
  it("resolves unknown FLOAT as number (never null)", () => {
    expect(resolveTokenTypeFromCollection(["unknownThing"], "FLOAT", "Custom")).toBe("number");
  });

  it("resolves unknown FLOAT in typography collection as number", () => {
    expect(resolveTokenTypeFromCollection(["customProp"], "FLOAT", "Typography")).toBe("number");
  });
});

describe("resolveTokenTypeFromCollection", () => {
  it("uses collection name as fallback for FLOAT", () => {
    expect(resolveTokenTypeFromCollection(["base"], "FLOAT", "_Spacing")).toBe("spacing");
  });

  it("uses breakpoint collection as sizing", () => {
    expect(resolveTokenTypeFromCollection(["mobile"], "FLOAT", "_Breakpoint")).toBe("sizing");
  });

  it("prefers path rules over collection name", () => {
    expect(resolveTokenTypeFromCollection(["cornerRadius", "sm"], "FLOAT", "_Sizing")).toBe("spacing");
  });
});
