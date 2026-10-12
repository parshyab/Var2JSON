import type {
  CollectionInfo,
  MessageToUI,
  MessageToController,
  ExportDiagnostic,
} from "./types";

const collectionSelect = document.getElementById("collectionSelect") as HTMLSelectElement;
const modeSelect = document.getElementById("modeSelect") as HTMLSelectElement;
const typeFilterSelect = document.getElementById("typeFilterSelect") as HTMLSelectElement;
const copyBtn = document.getElementById("copyBtn") as HTMLButtonElement;
const downloadBtn = document.getElementById("downloadBtn") as HTMLButtonElement;
const refreshBtn = document.getElementById("refreshBtn") as HTMLButtonElement;
const closeBtn = document.getElementById("closeBtn") as HTMLButtonElement;
const jsonPreview = document.getElementById("jsonContent") as HTMLPreElement;
const emptyState = document.getElementById("emptyState") as HTMLDivElement;
const varCount = document.getElementById("varCount") as HTMLDivElement;
const diagnosticsPanel = document.getElementById("diagnosticsPanel") as HTMLDivElement;
const loadingOverlay = document.getElementById("loadingOverlay") as HTMLDivElement;
const toast = document.getElementById("toast") as HTMLDivElement;

let collections: CollectionInfo[] = [];
let currentJsonString = "";
let isLoading = false;

function postMessage(msg: MessageToController) {
  parent.postMessage({ pluginMessage: msg }, "*");
}

function showToast(message: string) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

function setLoading(loading: boolean) {
  isLoading = loading;
  loadingOverlay.classList.toggle("visible", loading);
  collectionSelect.disabled = loading || collections.length === 0;
  modeSelect.disabled = loading || collections.length === 0;
  typeFilterSelect.disabled = loading || collections.length === 0;
  copyBtn.disabled = loading || !currentJsonString;
  downloadBtn.disabled = loading || !currentJsonString;
}

function updateCollectionDropdown() {
  collectionSelect.innerHTML = "";
  for (const c of collections) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    collectionSelect.appendChild(opt);
  }
  collectionSelect.disabled = collections.length === 0;
}

function updateModeDropdown(collectionId: string) {
  const collection = collections.find((c) => c.id === collectionId);
  modeSelect.innerHTML = "";
  if (!collection) {
    modeSelect.disabled = true;
    return;
  }

  for (const m of collection.modes) {
    const opt = document.createElement("option");
    opt.value = m.modeId;
    opt.textContent = m.name;
    modeSelect.appendChild(opt);
  }

  modeSelect.value = collection.defaultModeId;
  modeSelect.disabled = collection.modes.length <= 1;
}

function updateTypeFilter(options: string[], preserveSelection: boolean) {
  const previousValue = typeFilterSelect.value;
  typeFilterSelect.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "All";
  allOpt.textContent = "All";
  typeFilterSelect.appendChild(allOpt);

  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt;
    el.textContent = opt;
    typeFilterSelect.appendChild(el);
  }

  if (preserveSelection && options.includes(previousValue)) {
    typeFilterSelect.value = previousValue;
  } else {
    typeFilterSelect.value = "All";
  }

  typeFilterSelect.disabled = options.length === 0;
}

function renderDiagnostics(diagnostics: ExportDiagnostic[]) {
  if (diagnostics.length === 0) {
    diagnosticsPanel.style.display = "none";
    return;
  }
  diagnosticsPanel.style.display = "block";
  diagnosticsPanel.innerHTML = diagnostics
    .map(
      (d) =>
        `<div class="diag-item ${d.severity}">${d.severity === "error" ? "✖" : "⚠"} <strong>${escapeHtml(d.variableName)}</strong>: ${escapeHtml(d.message)}</div>`
    )
    .join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderJson(jsonString: string, count: number) {
  currentJsonString = jsonString;

  if (count === 0 && jsonString.trim() === "{}\n") {
    jsonPreview.style.display = "none";
    emptyState.style.display = "flex";
    emptyState.textContent = "No variables match the current filter.";
    varCount.innerHTML = `Found <strong>0</strong> variables`;
  } else {
    jsonPreview.style.display = "block";
    emptyState.style.display = "none";
    jsonPreview.textContent = jsonString;
    varCount.innerHTML = `Found <strong>${count}</strong> variables`;
  }

  copyBtn.disabled = !currentJsonString || isLoading;
  downloadBtn.disabled = !currentJsonString || isLoading;
}

function getFilename(): string {
  const collectionName = collectionSelect.options[collectionSelect.selectedIndex]?.textContent || "export";
  const modeName = modeSelect.options[modeSelect.selectedIndex]?.textContent || "";

  const sanitize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const parts = ["lumi", sanitize(collectionName)];
  if (modeName) parts.push(sanitize(modeName));

  return parts.filter(Boolean).join("-") + ".json";
}

// Event listeners
collectionSelect.addEventListener("change", () => {
  const collectionId = collectionSelect.value;
  updateModeDropdown(collectionId);
  postMessage({ type: "select-collection", collectionId });
});

modeSelect.addEventListener("change", () => {
  postMessage({ type: "select-mode", modeId: modeSelect.value });
});

typeFilterSelect.addEventListener("change", () => {
  postMessage({ type: "select-type-filter", typeFilter: typeFilterSelect.value });
});

copyBtn.addEventListener("click", () => {
  if (!currentJsonString) return;

  const textarea = document.createElement("textarea");
  textarea.value = currentJsonString;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
    showToast("Copied to clipboard");
  } catch {
    // Fallback: try navigator.clipboard
    navigator.clipboard.writeText(currentJsonString).then(
      () => showToast("Copied to clipboard"),
      () => showToast("Copy failed")
    );
  } finally {
    document.body.removeChild(textarea);
  }
});

downloadBtn.addEventListener("click", () => {
  if (!currentJsonString) return;

  const blob = new Blob([currentJsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = getFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Downloaded ${a.download}`);
});

refreshBtn.addEventListener("click", () => {
  postMessage({ type: "refresh" });
});

closeBtn.addEventListener("click", () => {
  postMessage({ type: "close" });
});

// Message handler
window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as MessageToUI;
  if (!msg) return;

  switch (msg.type) {
    case "collections-loaded": {
      collections = msg.collections;
      updateCollectionDropdown();
      if (collections.length > 0) {
        updateModeDropdown(collections[0].id);
      } else {
        modeSelect.innerHTML = "";
        modeSelect.disabled = true;
        jsonPreview.style.display = "none";
        emptyState.style.display = "flex";
        emptyState.textContent = "No variable collections found in this file.";
        varCount.innerHTML = `Found <strong>0</strong> variables`;
      }
      break;
    }

    case "export-result": {
      const { jsonString, variableCount, diagnostics, typeFilterOptions } = msg.result;
      updateTypeFilter(typeFilterOptions, true);
      renderJson(jsonString, variableCount);
      renderDiagnostics(diagnostics);
      break;
    }

    case "loading":
      setLoading(msg.loading);
      break;

    case "error":
      showToast(msg.message);
      break;
  }
};

// Initialize
postMessage({ type: "init" });
