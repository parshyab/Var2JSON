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

  // Sizing
  it("resolves size/* as sizing", () => {
    expect(resolveTokenType(["size", "200"], "FLOAT")).toBe("sizing");
  });

  it("resolves sizing/* as sizing", () => {
    expect(resolveTokenType(["sizing", "icon"], "FLOAT")).toBe("sizing");
  });

  // Typography
  it("resolves typography/fontSize/* as fontSize", () => {
    expect(resolveTokenType(["typography", "fontSize", "scale0"], "FLOAT")).toBe("fontSize");
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

  it("resolves letterSpacing/* as letterSpacing", () => {
    expect(resolveTokenType(["letterSpacing", "tight"], "FLOAT")).toBe("letterSpacing");
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

  it("returns null for ambiguous FLOAT", () => {
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
