import type {
  CollectionInfo,
  ModeInfo,
  MessageToUI,
  MessageToController,
  ExportTokenType,
} from "./types";
import {
  processVariables,
  type VariableData,
} from "./export";

let currentCollectionId: string | null = null;
let currentModeId: string | null = null;
let currentTypeFilter = "All";
let allCollections: CollectionInfo[] = [];
let cachedVariables: VariableData[] = [];
let allVariablesById = new Map<string, VariableData>();
let currentCollectionName = "";
let requestGeneration = 0;

function sendToUI(message: MessageToUI) {
  figma.ui.postMessage(message);
}

async function loadCollections(): Promise<CollectionInfo[]> {
  const rawCollections = await figma.variables.getLocalVariableCollectionsAsync();
  return rawCollections.map((c) => ({
    id: c.id,
    name: c.name,
    modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
    defaultModeId: c.defaultModeId,
  }));
}

async function loadVariablesForCollection(
  collectionId: string
): Promise<{ variables: VariableData[]; allById: Map<string, VariableData> }> {
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) return { variables: [], allById: new Map() };

  const variables: VariableData[] = [];
  const allById = new Map<string, VariableData>();

  for (const varId of collection.variableIds) {
    const variable = await figma.variables.getVariableByIdAsync(varId);
    if (!variable) continue;

    const data: VariableData = {
      id: variable.id,
      name: variable.name,
      resolvedType: variable.resolvedType,
      valuesByMode: variable.valuesByMode as Record<string, unknown>,
    };

    variables.push(data);
    allById.set(variable.id, data);
  }

  // Also load alias targets from other collections
  const aliasTargetIds = new Set<string>();
  for (const v of variables) {
    for (const modeValue of Object.values(v.valuesByMode)) {
      if (
        typeof modeValue === "object" &&
        modeValue !== null &&
        "type" in modeValue &&
        (modeValue as { type: string }).type === "VARIABLE_ALIAS" &&
        "id" in modeValue
      ) {
        const aliasId = (modeValue as { id: string }).id;
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
        valuesByMode: targetVar.valuesByMode as Record<string, unknown>,
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
      allVariablesById: allVariablesById,
    });

    if (thisGeneration !== requestGeneration) return;

    sendToUI({
      type: "export-result",
      result: {
        jsonString: result.jsonString,
        variableCount: result.variableCount,
        diagnostics: result.diagnostics,
        typeFilterOptions: result.typeFilterOptions,
      },
    });
  } catch (error) {
    if (thisGeneration !== requestGeneration) return;
    sendToUI({
      type: "error",
      message: `Export error: ${error instanceof Error ? error.message : String(error)}`,
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
      message: `Initialization error: ${error instanceof Error ? error.message : String(error)}`,
    });
    sendToUI({ type: "loading", loading: false });
  }
}

async function selectCollection(collectionId: string) {
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
      message: `Refresh error: ${error instanceof Error ? error.message : String(error)}`,
    });
  } finally {
    sendToUI({ type: "loading", loading: false });
  }
}

figma.showUI(__html__, { width: 560, height: 640, themeColors: true });

figma.ui.onmessage = async (msg: MessageToController) => {
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
