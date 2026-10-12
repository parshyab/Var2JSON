export type ExportTokenType =
  | "color"
  | "spacing"
  | "sizing"
  | "fontSize"
  | "fontFamily"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "paragraphSpacing"
  | "paragraphIndent"
  | "borderWidth"
  | "opacity"
  | "duration"
  | "textCase"
  | "textDecoration"
  | "number"
  | "string"
  | "boolean";

export interface TokenLeaf {
  value: string | number | boolean | null;
  type: ExportTokenType;
}

export interface TokenNode {
  [key: string]: TokenNode | TokenLeaf;
}

export function isTokenLeaf(node: unknown): node is TokenLeaf {
  return (
    typeof node === "object" &&
    node !== null &&
    "value" in node &&
    "type" in node &&
    Object.keys(node).length === 2
  );
}

export interface CollectionInfo {
  id: string;
  name: string;
  modes: ModeInfo[];
  defaultModeId: string;
}

export interface ModeInfo {
  modeId: string;
  name: string;
}

export interface ExportedVariable {
  path: string[];
  value: string | number | boolean | null;
  type: ExportTokenType;
}

export interface ExportDiagnostic {
  variableName: string;
  message: string;
  severity: "error" | "warning";
}

export interface ExportResult {
  tokenTree: TokenNode;
  jsonString: string;
  variableCount: number;
  diagnostics: ExportDiagnostic[];
  typeFilterOptions: string[];
}

export type MessageToUI =
  | {
      type: "collections-loaded";
      collections: CollectionInfo[];
    }
  | {
      type: "export-result";
      result: {
        jsonString: string;
        variableCount: number;
        diagnostics: ExportDiagnostic[];
        typeFilterOptions: string[];
      };
    }
  | {
      type: "loading";
      loading: boolean;
    }
  | {
      type: "error";
      message: string;
    };

export type MessageToController =
  | {
      type: "init";
    }
  | {
      type: "refresh";
    }
  | {
      type: "select-collection";
      collectionId: string;
    }
  | {
      type: "select-mode";
      modeId: string;
    }
  | {
      type: "select-type-filter";
      typeFilter: string;
    }
  | {
      type: "close";
    };
