import { irisData, spiralData, pca_plot, hclust_plot, heatmap_plot, umap_plot, tsne_plot, scatter_plot, pairs_plot, distance_plot } from "./dist/sdk.mjs"; // adjust path

// ======== EMBEDDED CONSOLE ========
const consoleOut = document.getElementById("consoleOut");

// Save original console methods
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
};

// Function to display messages in custom console
function displayInConsole(args, type = "log") {
  if (!consoleOut) return;
  
  const line = document.createElement("div");
  line.className = `c-line c-${type}`;
  
  const text = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
  
  line.textContent = text;
  consoleOut.appendChild(line);
  consoleOut.scrollTop = consoleOut.scrollHeight;
}

// ======== AUTOCOMPLETE (for console input) ========
const consoleCmdEl = document.getElementById("consoleCmd");
const acState = {
  el: null,
  visible: false,
  items: [],
  index: -1,
  anchorRect: null
};

function ensureACEl() {
  if (acState.el) return acState.el;
  const el = document.createElement("div");
  el.id = "console-autocomplete";
  el.style.position = "absolute";
  el.style.background = "#1e1e1e";
  el.style.border = "1px solid #444";
  el.style.fontFamily = "monospace";
  el.style.fontSize = "12px";
  el.style.color = "#ddd";
  el.style.zIndex = "9999";
  el.style.maxHeight = "200px";
  el.style.overflowY = "auto";
  el.style.minWidth = "180px";
  el.style.display = "none";
  document.body.appendChild(el);
  acState.el = el;
  return el;
}

function hideAC() {
  const el = ensureACEl();
  el.style.display = "none";
  acState.visible = false;
  acState.items = [];
  acState.index = -1;
}

function renderAC() {
  const el = ensureACEl();
  el.innerHTML = "";
  acState.items.forEach((name, i) => {
    const item = document.createElement("div");
    item.textContent = name;
    item.style.padding = "4px 8px";
    item.style.cursor = "pointer";
    item.style.background = i === acState.index ? "#2b2b2b" : "transparent";
    item.addEventListener("mouseenter", () => {
      acState.index = i;
      renderAC();
    });
    item.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      applyACSelection();
    });
    el.appendChild(item);
  });
}

function showAC(items, anchorRect) {
  const el = ensureACEl();
  acState.items = items;
  acState.index = 0;
  acState.visible = true;
  acState.anchorRect = anchorRect;
  renderAC();
  const top = window.scrollY + anchorRect.bottom + 4;
  const left = window.scrollX + anchorRect.left;
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
  el.style.display = "block";
}

function getAllPropertyNames(obj, maxDepth = 5) {
  const set = new Set();
  let cur = obj; let depth = 0;
  try {
    while (cur && depth < maxDepth) {
      for (const k of Object.getOwnPropertyNames(cur)) set.add(k);
      cur = Object.getPrototypeOf(cur);
      depth++;
    }
  } catch {}
  return Array.from(set);
}

function getCompletionsFor(text, caret) {
  const before = text.slice(0, caret);
  const m = before.match(/([A-Za-z_$][\w$]*)\.([A-Za-z_$\w$]*)?$/);
  if (!m) return null;
  const objName = m[1];
  const prefix = m[2] || "";
  const obj = globalThis[objName];
  if (!obj) return null;
  const keys = getAllPropertyNames(obj)
    .filter(k => !prefix || k.toLowerCase().startsWith(prefix.toLowerCase()))
    .sort((a,b)=>a.localeCompare(b));
  return { objName, prefix, start: caret - prefix.length, keys };
}

function applyACSelection() {
  if (!consoleCmdEl || !acState.visible || acState.index < 0) return;
  const value = consoleCmdEl.value;
  const caret = consoleCmdEl.selectionStart || value.length;
  const info = getCompletionsFor(value, caret);
  if (!info) return hideAC();
  const chosen = acState.items[acState.index];
  const insertFrom = info.start;
  const newValue = value.slice(0, insertFrom) + chosen + value.slice(caret);
  consoleCmdEl.value = newValue;
  const newCaret = insertFrom + chosen.length;
  consoleCmdEl.setSelectionRange(newCaret, newCaret);
  hideAC();
  consoleCmdEl.focus();
}

// Update suggestions on input
consoleCmdEl?.addEventListener("input", () => {
  if (!consoleCmdEl) return;
  const caret = consoleCmdEl.selectionStart || 0;
  const value = consoleCmdEl.value;
  const info = getCompletionsFor(value, caret);
  if (!info || info.keys.length === 0) return hideAC();
  const rect = consoleCmdEl.getBoundingClientRect();
  showAC(info.keys, rect);
});

// Hide on blur/click elsewhere
document.addEventListener("click", (e) => {
  if (!acState.el || !consoleCmdEl) return;
  if (e.target === acState.el || acState.el.contains(e.target)) return;
  if (e.target === consoleCmdEl) return;
  hideAC();
});

// Override console methods
// console.log = (...args) => {
//   originalConsole.log(...args);
//   displayInConsole(args, 'log');
// };

// console.warn = (...args) => {
//   originalConsole.warn(...args);
//   displayInConsole(args, 'warn');
// };

// console.error = (...args) => {
//   originalConsole.error(...args);
//   displayInConsole(args, 'err');
// };

// Console controls
document.getElementById("btnClearConsole")?.addEventListener("click", () => {
  if (consoleOut) consoleOut.innerHTML = "";
});

document.getElementById("btnCopyConsole")?.addEventListener("click", () => {
  if (consoleOut) {
    navigator.clipboard.writeText(consoleOut.textContent)
      .then(() => displayInConsole(['📋 Copied to clipboard'], 'meta'))
      .catch(() => displayInConsole(['Failed to copy'], 'err'));
  }
});

// Console command input with AsyncFunction support
document.getElementById("consoleCmd")?.addEventListener("keydown", async (e) => {
  // If autocomplete is visible, handle navigation/selection
  if (acState.visible) {
    if (e.key === "ArrowDown") { e.preventDefault(); acState.index = Math.min(acState.index + 1, acState.items.length - 1); renderAC(); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); acState.index = Math.max(acState.index - 1, 0); renderAC(); return; }
    if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); applyACSelection(); return; }
    if (e.key === "Escape") { e.preventDefault(); hideAC(); return; }
  }
  if (e.key === "Enter") {
    const cmd = e.target.value.trim();
    if (!cmd) return;

    displayInConsole([`> ${cmd}`], 'meta');

    try {
      // Build an async wrapper so top-level await works
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const isDeclaration = /^\s*(const|let|var|function|class)\s/.test(cmd);

      // Persist declarations to globalThis so they survive across commands
      let body;
      const declAssignMatch = cmd.match(/^\s*(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/);
      const declNoInitMatch = cmd.match(/^\s*(const|let|var)\s+([A-Za-z_$][\w$]*)\s*;?$/);
      const funcMatch = cmd.match(/^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/);
      const classMatch = cmd.match(/^\s*class\s+([A-Za-z_$][\w$]*)\s*/);

      if (declAssignMatch) {
        const name = declAssignMatch[2];
        const rhs = declAssignMatch[3];
        // Assign to global and do not echo the value
        body = `globalThis.${name} = (${rhs}); return undefined;`;
      } else if (declNoInitMatch) {
        const name = declNoInitMatch[2];
        body = `globalThis.${name} = undefined; return undefined;`;
      } else if (funcMatch) {
        const name = funcMatch[1];
        body = `${cmd}; globalThis.${name} = ${name}; return undefined;`;
      } else if (classMatch) {
        const name = classMatch[1];
        body = `${cmd}; globalThis.${name} = ${name}; return undefined;`;
      } else if (isDeclaration) {
        // Fallback for unusual declarations
        body = `${cmd}; return undefined;`;
      } else {
        // Treat as expression and return its value
        body = `return (${cmd});`;
      }
      const wrapped = `return (async () => { ${body} })()`;

      // Create and execute the async function
      const asyncFn = new AsyncFunction(wrapped);
      const result = await asyncFn();

      if (result !== undefined) {
        console.log(result);
      }
    } catch (err) {
      console.error(err?.stack || err?.message || String(err));
    }

    e.target.value = "";
  }
});

// ======== APP STATE (GUI controls update this) ========
const appState = {
  data: null,         // array of objects (rows)
  source: null,       // "file" | "builtin"
  name: null,         // filename or dataset name
  fileOriginalData: null, // snapshot of originally loaded file data
  fileIsTransposed: false,
  selectedColumns: [], // columns selected by user
  selectionMode: "normal", // "normal" | "scatter" (for 2-column limit)
  hclustClusterRows: true,  // toggle for hclust row clustering
  hclustClusterCols: true,  // toggle for hclust column clustering
  distanceRows: true,       // toggle for distance matrix on rows
  distanceCols: true,       // toggle for distance matrix on columns
  currentTool: null         // last clicked tool button id (drives the R comparison panel)
};

const plotContainerIds = ["myPCA", "myHclust", "myHeatmap", "myUMAP", "myTSNE", "myScatter", "myPairs", "myDistanceRows", "myDistanceCols", "myPlots"];
const defaultPlotHeight = 410;
const defaultPairsHeight = 900;

function resetAllPlots() {
  plotContainerIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    el.classList.remove("has-plot");
  });
}

function clearMyPlots() {
  const el = document.getElementById("myPlots");
  if (!el) return;
  el.innerHTML = "";
  el.classList.remove("has-plot");
}

function showPlotLoading(el, label = "Loading...") {
  if (!el) return;
  const isLoading = /^Loading/i.test(label);
  const spinner = isLoading
    ? `<div class="spinner-border text-primary mb-3" role="status" aria-hidden="true"></div>`
    : "";
  el.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center text-center text-muted p-4">${spinner}<div>${label}</div></div>`;
  el.classList.add("has-plot");
}

function getNumericColumnCount(data) {
  if (!Array.isArray(data) || data.length === 0) return 0;
  const sample = data[0] || {};
  return Object.keys(sample).filter(key => typeof sample[key] === "number" && Number.isFinite(sample[key])).length;
}

function getSlowMatrixWarningLabel(data, baseLabel = "Loading...") {
  const numericColumnCount = getNumericColumnCount(data);
  if (numericColumnCount > 50) {
    return `${baseLabel}<div class="small text-danger mt-2">Warning: ${numericColumnCount} columns selected; this may be too slow due to a large covariance matrix.</div>`;
  }
  return baseLabel;
}

function resetDatasetUiState() {
  appState.selectionMode = "normal";
  appState.hclustClusterRows = true;
  appState.hclustClusterCols = true;
  appState.distanceRows = true;
  appState.distanceCols = true;

  const hclustControls = document.getElementById("hclustControls");
  if (hclustControls) hclustControls.style.display = "none";

  const distanceControls = document.getElementById("distanceControls");
  if (distanceControls) distanceControls.style.display = "none";

  const btnRows = document.getElementById("btnHclustRows");
  if (btnRows) {
    btnRows.textContent = "Cluster Rows: ON";
    btnRows.className = "btn btn-sm btn-primary me-2";
  }

  const btnCols = document.getElementById("btnHclustCols");
  if (btnCols) {
    btnCols.textContent = "Cluster Cols: ON";
    btnCols.className = "btn btn-sm btn-primary";
  }

  const btnDistRows = document.getElementById("btnDistRows");
  if (btnDistRows) {
    btnDistRows.textContent = "Distance Rows: ON";
    btnDistRows.className = "btn btn-sm btn-primary me-2";
  }

  const btnDistCols = document.getElementById("btnDistCols");
  if (btnDistCols) {
    btnDistCols.textContent = "Distance Cols: ON";
    btnDistCols.className = "btn btn-sm btn-primary";
  }

  // Reset the webR comparison output (stale plots belong to the previous dataset)
  const rPlotOut = document.getElementById("rPlotOut");
  if (rPlotOut) rPlotOut.innerHTML = "";
  const rStatus = document.getElementById("rStatus");
  if (rStatus) rStatus.textContent = "";

  updateRCode();
}

// ======== IRIS (your built-in sample) ========
// const irisData = await fetch("./src/data/iris.json").then(r => r.json());

// ======== RIGHT PANEL TABLE RENDER ========
function renderTableRight(data, title = "Dataset Preview") {
  const container = document.getElementById("rightData");
  if (!container) return;

  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="text-muted">No data to display.</div>`;
    return;
  }

  const cols = Object.keys(data[0]);
  const sample = data[0] || {};
  const numericCols = cols.filter(col => typeof sample[col] === 'number');
  const categoricalCols = cols.filter(col => typeof sample[col] !== 'number');
  
  // Initialize all columns as selected if none are selected
  if (appState.selectedColumns.length === 0) {
    appState.selectedColumns = [...cols];
  }

  // Header with title and selected columns count
  const headerDiv = document.createElement("div");
  headerDiv.className = "d-flex justify-content-between align-items-center mb-2";
  headerDiv.innerHTML = `
    <div class="fw-semibold">${title}</div>
    <div class="text-muted small">
      ${data.length} rows | 
      <span id="selectedColCount">${appState.selectedColumns.length}</span> columns selected
    </div>
  `;
  container.appendChild(headerDiv);

  const selectionControlsDiv = document.createElement("div");
  selectionControlsDiv.className = "d-flex justify-content-end gap-2 mb-2";
  selectionControlsDiv.innerHTML = `
    <button id="btnSelectAllCols" class="btn btn-sm btn-outline-secondary" type="button">Select all</button>
    <button id="btnDeselectAllCols" class="btn btn-sm btn-outline-secondary" type="button">Deselect all</button>
  `;
  container.appendChild(selectionControlsDiv);

  // Create scrollable wrapper
  const scrollWrapper = document.createElement("div");
  scrollWrapper.style.maxHeight = "200px";  // Height for ~5 rows
  scrollWrapper.style.overflowY = "auto";
  scrollWrapper.style.overflowX = "auto";

  const table = document.createElement("table");
  table.className = "table table-dark table-striped table-sm mb-0";

  const thead = document.createElement("thead");
  thead.style.position = "sticky";
  thead.style.top = "0";
  thead.style.backgroundColor = "#111111";
  thead.style.zIndex = "1";

  const columnButtons = new Map();

  function updateSelectedCount() {
    const countEl = document.getElementById("selectedColCount");
    if (countEl) countEl.textContent = appState.selectedColumns.length;
  }

  function refreshColumnButtons() {
    cols.forEach(col => {
      const button = columnButtons.get(col);
      if (!button) return;
      const selected = appState.selectedColumns.includes(col);
      button.className = `btn btn-sm w-100 text-start ${selected ? "btn-primary" : "btn-outline-secondary"}`;
      if (categoricalCols.includes(col)) {
        button.style.cursor = "not-allowed";
      }
    });
    updateSelectedCount();
  }
  
  const hr = document.createElement("tr");
  cols.forEach(c => {
    const th = document.createElement("th");
    th.style.userSelect = "none";
    th.style.padding = "8px";
    
    // Check if column is categorical (text)
    const isCategorical = typeof sample[c] !== 'number';
    
    // Set cursor style
    th.style.cursor = isCategorical ? "not-allowed" : "pointer";
    
    // Create button for column selection
    const btn = document.createElement("button");
    btn.className = "btn btn-sm w-100 text-start";
    btn.textContent = c.replaceAll("_", " ");
    btn.style.fontSize = "0.85rem";
    btn.style.padding = "4px 8px";
    
    // Check if column is selected
    const isSelected = appState.selectedColumns.includes(c);
    btn.className += isSelected ? " btn-primary" : " btn-outline-secondary";
    
    // Add tooltip for categorical columns
    if (isCategorical) {
      btn.title = "Categorical columns cannot be deselected";
      btn.style.cursor = "not-allowed";
    }

    columnButtons.set(c, btn);
    
    // Click handler to toggle selection
    btn.addEventListener("click", () => {
      // Prevent deselection of categorical columns
      if (isCategorical) {
        console.log(`Cannot deselect categorical column: ${c}`);
        return;
      }

      const idx = appState.selectedColumns.indexOf(c);
      if (idx > -1) {
        // Deselect numeric column
        appState.selectedColumns.splice(idx, 1);
        btn.className = "btn btn-sm w-100 text-start btn-outline-secondary";
      } else {
        // Special handling for scatter mode: only allow 2 numeric columns
        if (appState.selectionMode === "scatter") {
          const numericSelected = appState.selectedColumns.filter(col => {
            return typeof data[0][col] === 'number';
          }).length;
          
          if (numericSelected >= 2) {
            console.log("Scatter mode: Maximum 2 numeric columns allowed");
            return;
          }
        }
        // Select
        appState.selectedColumns.push(c);
        btn.className = "btn btn-sm w-100 text-start btn-primary";
      }

      // Update count
      updateSelectedCount();

      // Clear all plot containers when variable is selected/deselected
      resetAllPlots();
    });
    
    th.appendChild(btn);
    hr.appendChild(th);
  });

  document.getElementById("btnSelectAllCols")?.addEventListener("click", () => {
    if (appState.selectionMode === "scatter") {
      appState.selectedColumns = [...numericCols.slice(0, 2), ...categoricalCols];
      console.log("Scatter mode: Select all keeps max 2 numeric columns.");
    } else {
      appState.selectedColumns = [...cols];
    }
    refreshColumnButtons();
    resetAllPlots();
  });

  document.getElementById("btnDeselectAllCols")?.addEventListener("click", () => {
    appState.selectedColumns = [...categoricalCols];
    refreshColumnButtons();
    resetAllPlots();
  });

  refreshColumnButtons();

  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  // Display up to 500 rows
  const displayData = data.slice(0, 500);
  displayData.forEach(row => {
    const tr = document.createElement("tr");
    cols.forEach(c => {
      const td = document.createElement("td");
      td.textContent = row[c];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  scrollWrapper.appendChild(table);
  container.appendChild(scrollWrapper);
}

// ======== SIMPLE CSV/TSV PARSER ========
function parseDelimitedText(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(delimiter);
    const obj = {};
    headers.forEach((h, i) => {
      const v = (values[i] ?? "").trim();
      const num = Number(v);
      obj[h] = v !== "" && Number.isFinite(num) ? num : v;
    });
    return obj;
  });
}

function transposeObjectRows(data) {
  if (!Array.isArray(data) || data.length === 0) return [];

  const keys = Object.keys(data[0]);
  const preferredRowNameKeys = ["label", "row", "rows", "name", "id", "gene", "sample"];
  const hasAnyValue = (key) => data.some(row => String(row[key] ?? "").trim() !== "");
  const inferredTextKeys = keys.filter(key => data.some(row => typeof row[key] === "string" && String(row[key]).trim() !== ""));
  const uniqueValueRatio = (key) => {
    const values = data.map(row => String(row[key] ?? "").trim());
    if (values.length === 0) return 0;
    return new Set(values).size / values.length;
  };

  const preferredMatch = preferredRowNameKeys.find(candidate =>
    keys.some(key => key.toLowerCase() === candidate && hasAnyValue(key))
  );

  const matchingPreferredKey = preferredMatch
    ? keys.find(key => key.toLowerCase() === preferredMatch)
    : null;

  const firstKeyLooksLikeRowName = keys.length > 0 && hasAnyValue(keys[0]) && data.some(row => typeof row[keys[0]] !== "number");

  const identifierLikeKey = keys.find((key, index) => {
    if (!hasAnyValue(key)) return false;
    const ratio = uniqueValueRatio(key);
    return ratio >= 0.9 && (index === 0 || key.toLowerCase() === "id" || key.toLowerCase() === "label");
  });

  const textKey = matchingPreferredKey
    ?? (firstKeyLooksLikeRowName ? keys[0] : null)
    ?? (inferredTextKeys.length > 0 ? inferredTextKeys[0] : null)
    ?? identifierLikeKey;

  const rowLabelKey = "label";
  const keysToTranspose = textKey ? keys.filter(key => key !== textKey) : keys;

  const usedNames = new Set();
  const transposedColumnNames = data.map((sourceRow, rowIndex) => {
    const fallbackName = `row_${rowIndex + 1}`;
    const baseName = textKey
      ? String(sourceRow[textKey] ?? "").trim() || fallbackName
      : fallbackName;

    let finalName = baseName;
    let suffix = 2;
    while (usedNames.has(finalName)) {
      finalName = `${baseName}_${suffix}`;
      suffix += 1;
    }
    usedNames.add(finalName);
    return finalName;
  });

  const transposed = keysToTranspose.map((key) => {
    const row = { [rowLabelKey]: key };
    data.forEach((sourceRow, rowIndex) => {
      row[transposedColumnNames[rowIndex]] = sourceRow[key];
    });
    return row;
  });

  return transposed;
}

function updateTransposeButtonState() {
  const btnTranspose = document.getElementById("btnTransposeFile");
  if (!btnTranspose) return;
  const enabled = Array.isArray(appState.data) && appState.data.length > 0;
  btnTranspose.disabled = !enabled;
  btnTranspose.textContent = appState.fileIsTransposed ? "Restore original data" : "Transpose data";
}

// ======== GUI: BUILT-IN DATASET SELECT ========
document.getElementById("builtinData")?.addEventListener("change", (e) => {
  const val = e.target.value;

  if (val === "iris" || val === "spiral") {
    // Clear all plot containers
    resetAllPlots();

    // Reset loaded file info
    appState.source = "builtin";
    appState.name = val === "iris" ? "Iris" : "Spiral";
    appState.data = val === "iris" ? irisData : spiralData;
    appState.fileOriginalData = appState.data.map(row => ({ ...row }));
    appState.fileIsTransposed = false;
    appState.selectedColumns = [];

    // Reset tool/UI state
    resetDatasetUiState();

    // Optionally clear file input
    const fileInput = document.getElementById("fileInput");
    if (fileInput) fileInput.value = "";

    updateTransposeButtonState();

    console.log(`Built-in ${appState.name} data selected`);
    renderTableRight(appState.data, `${appState.name} (built-in)`);
  }
});




// ======== GUI: LOAD FILE ========
document.getElementById("fileInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    let data;
    if (file.name.endsWith(".json")) {
      try {
        data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("JSON file must be an array of objects.");
      } catch (err) {
        console.error("Failed to parse JSON file:", err.message);
        return;
      }
    } else {
      data = parseDelimitedText(text);
    }

    appState.data = data;
    appState.source = "file";
    appState.name = file.name;
    appState.fileOriginalData = data.map(row => ({ ...row }));
    appState.fileIsTransposed = false;
    appState.selectedColumns = []; // Reset selection

    // Reset tool/UI state
    resetDatasetUiState();

    const builtinSelect = document.getElementById("builtinData");
    if (builtinSelect) builtinSelect.selectedIndex = 0;

    updateTransposeButtonState();

    renderTableRight(appState.data, `Loaded file: ${file.name}`);
    // Clear all plot containers
    resetAllPlots();
  };
  reader.readAsText(file);
});

document.getElementById("btnTransposeFile")?.addEventListener("click", () => {
  if (!Array.isArray(appState.data) || appState.data.length === 0) {
    console.warn("Load or select a dataset first to use transpose.");
    updateTransposeButtonState();
    return;
  }

  if (!Array.isArray(appState.fileOriginalData) || appState.fileOriginalData.length === 0) {
    appState.fileOriginalData = appState.data.map(row => ({ ...row }));
  }

  const baseTitle = appState.source === "builtin"
    ? `${appState.name} (built-in)`
    : `Loaded file: ${appState.name}`;

  if (appState.fileIsTransposed) {
    appState.data = appState.fileOriginalData.map(row => ({ ...row }));
    appState.fileIsTransposed = false;
    renderTableRight(appState.data, baseTitle);
  } else {
    appState.data = transposeObjectRows(appState.fileOriginalData);
    appState.fileIsTransposed = true;
    renderTableRight(appState.data, `${baseTitle} — transposed`);
  }

  appState.selectedColumns = [];
  resetDatasetUiState();
  resetAllPlots();
  updateTransposeButtonState();
});

updateTransposeButtonState();

["btnPCA", "btnTSNE", "btnUMAP", "btnScatter", "btnPairs", "btnHclust", "btnHeatmap", "btnHclustRows", "btnHclustCols", "btnTransposeFile"].forEach(id => {
  document.getElementById(id)?.addEventListener("click", () => {
    // Tools now stack: each renders into its own card without clearing the others.
  });
});

// Plot cards: click the title bar to highlight, click again (or ✕) to remove.
function removePlotCard(card) {
  const body = card.querySelector(".plot-body");
  if (body) {
    body.innerHTML = "";
    body.classList.remove("has-plot");
  }
  card.classList.remove("is-selected");
}

// Each plot body maps to the tool button that (re)renders it, used by the Reset action.
const plotToolMap = {
  myPCA: "btnPCA",
  myTSNE: "btnTSNE",
  myUMAP: "btnUMAP",
  myScatter: "btnScatter",
  myPairs: "btnPairs",
  myHeatmap: "btnHeatmap",
  myHclust: "btnHclust",
  myDistanceRows: "btnDistance",
  myDistanceCols: "btnDistance"
};

function resetPlotCard(card) {
  const bodyId = card.querySelector(".plot-body")?.id;
  const btnId = plotToolMap[bodyId];
  if (btnId) document.getElementById(btnId)?.click();
}

function downloadPlotSvg(card) {
  const svg = card.querySelector(".plot-body svg");
  if (!svg) {
    console.warn("Nothing to download yet — render this plot first.");
    return;
  }
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const source = '<?xml version="1.0" standalone="no"?>\r\n' + new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(card.getAttribute("data-plot") || "plot").replace(/[^\w.-]+/g, "_")}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.querySelectorAll(".plot-card").forEach(card => {
  const head = card.querySelector(".plot-card-head");
  const removeBtn = card.querySelector(".plot-remove");

  // Inject Reset + Download actions into the header, grouped with the remove button.
  if (head && removeBtn) {
    const actions = document.createElement("span");
    actions.className = "plot-card-actions";

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "plot-action plot-reset";
    resetBtn.title = "Reset plot";
    resetBtn.setAttribute("aria-label", "Reset plot");
    resetBtn.textContent = "↻";

    const zoomResetBtn = document.createElement("button");
    zoomResetBtn.type = "button";
    zoomResetBtn.className = "plot-action plot-zoom-reset";
    zoomResetBtn.title = "Reset zoom";
    zoomResetBtn.setAttribute("aria-label", "Reset zoom");
    zoomResetBtn.textContent = "1:1";

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "plot-action plot-download";
    downloadBtn.title = "Download SVG";
    downloadBtn.setAttribute("aria-label", "Download SVG");
    downloadBtn.textContent = "⭳";

    actions.appendChild(zoomResetBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(downloadBtn);
    head.appendChild(actions);
    actions.appendChild(removeBtn); // relocate the existing remove button into the group

    zoomResetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const svg = card.querySelector(".plot-body svg");
      if (svg?.__resetZoom) {
        svg.__resetZoom();
        return;
      }
      // Hclust ships its own d3 zoom with an in-plot "Reset zoom" button — trigger it.
      const innerReset = [...card.querySelectorAll(".plot-body button")]
        .find(b => b.textContent.trim() === "Reset zoom");
      innerReset?.click();
    });
    resetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      resetPlotCard(card);
    });
    downloadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadPlotSvg(card);
    });
  }

  removeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    removePlotCard(card);
  });
  head?.addEventListener("click", () => {
    if (card.classList.contains("is-selected")) {
      removePlotCard(card);
    } else {
      card.classList.add("is-selected");
    }
  });
});

// ======== ZOOM / PAN FOR ALL PLOTS (like Hclust) ========
// Lightweight, dependency-free zoom: wheel to zoom toward the cursor, drag to pan.
// Wraps the SVG's contents in a <g> and transforms it. Hclust is excluded because
// it already ships its own d3 zoom.
function enableSvgZoom(svg, { minScale = 0.5, maxScale = 12 } = {}) {
  if (!svg || svg.__zoomEnabled) return;
  svg.__zoomEnabled = true;

  const SVGNS = "http://www.w3.org/2000/svg";
  const layer = document.createElementNS(SVGNS, "g");
  layer.setAttribute("class", "zoom-layer");
  while (svg.firstChild) layer.appendChild(svg.firstChild);
  svg.appendChild(layer);

  const state = { scale: 1, x: 0, y: 0 };
  const apply = () => {
    layer.setAttribute("transform", `translate(${state.x}, ${state.y}) scale(${state.scale})`);
  };
  svg.__resetZoom = () => { state.scale = 1; state.x = 0; state.y = 0; apply(); };
  svg.style.cursor = "grab";
  svg.style.touchAction = "none";

  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newScale = Math.min(maxScale, Math.max(minScale, state.scale * factor));
    const k = newScale / state.scale;
    state.x = mx - k * (mx - state.x);
    state.y = my - k * (my - state.y);
    state.scale = newScale;
    apply();
  }, { passive: false });

  let dragging = false, lastX = 0, lastY = 0;
  svg.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    svg.style.cursor = "grabbing";
    svg.setPointerCapture?.(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    state.x += e.clientX - lastX;
    state.y += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    apply();
  });
  const endDrag = (e) => {
    dragging = false;
    svg.style.cursor = "grab";
    svg.releasePointerCapture?.(e.pointerId);
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
}

// Watch each plot body and (re-)attach zoom whenever a new SVG is rendered.
["myPCA", "myTSNE", "myUMAP", "myScatter", "myPairs", "myHeatmap", "myDistanceRows", "myDistanceCols", "myPlots"].forEach(id => {
  const container = document.getElementById(id);
  if (!container) return;
  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const svg = container.querySelector("svg");
      if (svg && !svg.__zoomEnabled) enableSvgZoom(svg);
    }, 80);
  });
  observer.observe(container, { childList: true, subtree: true });
});

// Highlight the currently selected tool
const toolButtonIds = ["btnPCA", "btnTSNE", "btnUMAP", "btnScatter", "btnPairs", "btnDistance", "btnHclust", "btnHeatmap"];
const toolScrollTargets = {
  btnPCA: "myPCA", btnTSNE: "myTSNE", btnUMAP: "myUMAP", btnScatter: "myScatter",
  btnPairs: "myPairs", btnHeatmap: "myHeatmap", btnDistance: "myDistanceRows", btnHclust: "myHclust"
};
toolButtonIds.forEach(id => {
  document.getElementById(id)?.addEventListener("click", () => {
    toolButtonIds.forEach(otherId => document.getElementById(otherId)?.classList.remove("is-active"));
    document.getElementById(id)?.classList.add("is-active");
    appState.currentTool = id;
    const rToolSelect = document.getElementById("rToolSelect");
    if (rToolSelect) rToolSelect.value = id;
    updateRCode();
    // Bring the (possibly newly added) plot card into view
    setTimeout(() => {
      document.getElementById(toolScrollTargets[id])
        ?.closest(".plot-card")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 250);
  });
});

// Clear all rendered plots at once
function clearAllPlotsUi() {
  resetAllPlots();
  document.querySelectorAll(".plot-card.is-selected").forEach(card => card.classList.remove("is-selected"));
  toolButtonIds.forEach(id => document.getElementById(id)?.classList.remove("is-active"));
  // Clear the webR comparison output as well
  const rPlotOut = document.getElementById("rPlotOut");
  if (rPlotOut) rPlotOut.innerHTML = "";
  const rStatus = document.getElementById("rStatus");
  if (rStatus) rStatus.textContent = "";
  appState.currentTool = null;
  const rToolSelect = document.getElementById("rToolSelect");
  if (rToolSelect) rToolSelect.value = "";
  updateRCode();
}
document.getElementById("btnClearPlots")?.addEventListener("click", clearAllPlotsUi);
document.getElementById("btnClearTools")?.addEventListener("click", clearAllPlotsUi);

// ======== R COMPARISON (webR) ========
function rNum(v) {
  return (typeof v === "number" && Number.isFinite(v)) ? String(v) : "NA";
}

// Serialize the current dataset (numeric columns + optional label column) as R code
function buildRDataCode() {
  const data = appState.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const sample = data[0] || {};
  let keys = Object.keys(sample);
  if (appState.selectedColumns.length > 0) {
    keys = appState.selectedColumns.filter(k => k in sample);
  }
  const numericKeys = keys.filter(k => typeof sample[k] === "number");
  if (numericKeys.length === 0) return null;
  const labelKey = Object.keys(sample).find(k => typeof sample[k] !== "number");

  const maxRows = 500;
  const rows = data.slice(0, maxRows);
  const lines = rows.map(r => "  " + numericKeys.map(k => rNum(r[k])).join(", "));
  const truncNote = data.length > maxRows ? ` (first ${maxRows} of ${data.length} rows)` : "";

  let code = `# Data: ${appState.name ?? "dataset"}${truncNote}\n`;
  code += `# Size: ${rows.length} rows \u00d7 ${numericKeys.length} numeric columns\n`;
  code += R_LOCAL_LOAD_NOTE;
  code += `m <- matrix(c(\n${lines.join(",\n")}\n), nrow = ${rows.length}, byrow = TRUE)\n`;
  code += `colnames(m) <- c(${numericKeys.map(k => JSON.stringify(k)).join(", ")})\n`;
  if (labelKey) {
    code += `labs <- factor(c(${rows.map(r => JSON.stringify(String(r[labelKey]))).join(", ")}))\n`;
  } else {
    code += `labs <- factor(rep("all", nrow(m)))\n`;
  }
  code += `rownames(m) <- paste0(as.character(labs), seq_len(nrow(m)))\n`;
  return code;
}

// Commented example for running the code in desktop R with a local file
// (webR in the browser cannot read local paths, so this stays commented out)
const R_LOCAL_LOAD_NOTE = `# To use your own file in desktop R instead, uncomment and adjust:
# df <- read.csv(
#   "C:/Users/you/Downloads/your_data.csv",
#   check.names = FALSE
# )
`;

// Compact summary of the data for the displayed code (the full matrix is injected when run)
function buildRDataStub() {
  const data = appState.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const sample = data[0] || {};
  let keys = Object.keys(sample);
  if (appState.selectedColumns.length > 0) {
    keys = appState.selectedColumns.filter(k => k in sample);
  }
  const numericKeys = keys.filter(k => typeof sample[k] === "number");
  if (numericKeys.length === 0) return null;
  const labelKey = Object.keys(sample).find(k => typeof sample[k] !== "number");
  const nRows = Math.min(data.length, 500);
  return `# Data: ${appState.name ?? "dataset"} \u2014 injected automatically when run\n`
    + `# Size: ${nRows} rows \u00d7 ${numericKeys.length} numeric columns\n`
    + `# m: numeric matrix (${numericKeys.join(", ")}), rownames = label + row number\n`
    + `# labs: factor of ${labelKey ? JSON.stringify(labelKey) : "row labels"}\n`
    + R_LOCAL_LOAD_NOTE;
}

const R_HEAT_COLS = `col = hcl.colors(50, "RdYlBu", rev = TRUE)`;

function buildRToolCode() {
  switch (appState.currentTool) {
    case "btnPCA":
      return `p <- prcomp(scale(m))\nplot(p$x[, 1], p$x[, 2], col = labs, pch = 19,\n     xlab = "PC1", ylab = "PC2", main = "PCA (R)")\nlegend("topright", legend = levels(labs), col = seq_along(levels(labs)), pch = 19)`;
    case "btnScatter":
      return `plot(m[, 1], m[, 2], col = labs, pch = 19,\n     xlab = colnames(m)[1], ylab = colnames(m)[2], main = "Scatter (R)")\nlegend("topright", legend = levels(labs), col = seq_along(levels(labs)), pch = 19)`;
    case "btnPairs":
      return `pairs(m, col = labs, pch = 19, main = "Pairs (R)")`;
    case "btnHeatmap":
      return `heatmap(m, Rowv = NA, Colv = NA, scale = "none", margins = c(9, 7),\n        ${R_HEAT_COLS}, main = "Heatmap (R)")`;
    case "btnHclust": {
      const rowv = appState.hclustClusterRows ? `as.dendrogram(hclust(dist(xs)))` : "NA";
      const colv = appState.hclustClusterCols ? `as.dendrogram(hclust(dist(t(xs))))` : "NA";
      return `xs <- scale(m)  # scale() -> dist() -> hclust(), same pipeline as clustJs\nheatmap(xs, Rowv = ${rowv}, Colv = ${colv},\n        scale = "none", margins = c(9, 7), ${R_HEAT_COLS}, main = "hclust heatmap (R)")`;
    }
    case "btnDistance": {
      const parts = [`xs <- scale(m)`];
      if (appState.distanceRows) {
        parts.push(`heatmap(as.matrix(dist(xs)), Rowv = NA, Colv = NA, scale = "none", margins = c(9, 7),\n        ${R_HEAT_COLS}, main = "Row distances (R)")`);
      }
      if (appState.distanceCols) {
        parts.push(`heatmap(as.matrix(dist(t(xs))), Rowv = NA, Colv = NA, scale = "none", margins = c(9, 7),\n        ${R_HEAT_COLS}, main = "Column distances (R)")`);
      }
      return parts.join("\n");
    }
    case "btnTSNE":
      return `webr::install("Rtsne")  # downloads the wasm package on first run\nlibrary(Rtsne)\nset.seed(42)\nfit <- Rtsne(scale(m), perplexity = min(30, floor((nrow(m) - 1) / 3)), check_duplicates = FALSE)\nplot(fit$Y, col = labs, pch = 19, xlab = "tSNE 1", ylab = "tSNE 2", main = "t-SNE (R)")`;
    case "btnUMAP":
      return `webr::install("uwot")  # downloads the wasm package on first run\nlibrary(uwot)\nset.seed(42)\nfit <- umap(scale(m))\nplot(fit, col = labs, pch = 19, xlab = "UMAP 1", ylab = "UMAP 2", main = "UMAP (R)")`;
    default:
      return null;
  }
}

function buildRCode({ forDisplay = false } = {}) {
  const dataCode = forDisplay ? buildRDataStub() : buildRDataCode();
  const toolCode = buildRToolCode();
  if (!dataCode || !toolCode) return null;
  return `${dataCode}\n${toolCode}\n`;
}

function updateRCode() {
  const el = document.getElementById("rCode");
  if (!el) return;
  el.textContent = buildRCode({ forDisplay: true })
    ?? "Load a dataset with numeric columns and click a tool to generate the equivalent R code.";
}

// The webR tool dropdown mirrors (and can override) the last-clicked tool
document.getElementById("rToolSelect")?.addEventListener("change", (e) => {
  appState.currentTool = e.target.value || null;
  updateRCode();
});

// Copy the full runnable R code (with the data embedded, unlike the displayed stub)
document.getElementById("btnCopyRCode")?.addEventListener("click", async () => {
  const btn = document.getElementById("btnCopyRCode");
  const code = buildRCode();
  if (!code) {
    console.warn("Load a dataset with numeric columns and click a tool first.");
    return;
  }
  try {
    await navigator.clipboard.writeText(code);
    btn.textContent = "Copied!";
  } catch (err) {
    console.error("Copy failed:", err);
    btn.textContent = "Copy failed";
  }
  setTimeout(() => { btn.textContent = "Copy R code"; }, 1500);
});

let webRPromise = null;
function ensureWebR() {
  if (!webRPromise) {
    webRPromise = (async () => {
      const { WebR } = await import("https://webr.r-wasm.org/latest/webr.mjs");
      const webR = new WebR();
      await webR.init();
      return webR;
    })().catch(err => { webRPromise = null; throw err; });
  }
  return webRPromise;
}

document.getElementById("btnRunR")?.addEventListener("click", async () => {
  const statusEl = document.getElementById("rStatus");
  const outEl = document.getElementById("rPlotOut");
  const btn = document.getElementById("btnRunR");
  updateRCode();
  const code = buildRCode();
  if (!code) {
    if (statusEl) statusEl.textContent = "Load a dataset with numeric columns and click a tool first.";
    return;
  }
  btn.disabled = true;
  try {
    if (statusEl) statusEl.textContent = "Loading webR runtime\u2026 (first run downloads ~15 MB)";
    const webR = await ensureWebR();
    if (statusEl) statusEl.textContent = "Running R code\u2026";
    const shelter = await new webR.Shelter();
    try {
      const result = await shelter.captureR(code, {
        captureGraphics: { width: 900, height: 560 }
      });
      result.output.forEach(line => {
        if (line.type === "stdout") console.log("R:", line.data);
        else if (line.type === "stderr") console.warn("R:", line.data);
      });
      if (outEl) {
        outEl.innerHTML = "";
        const toolName = document.getElementById("rToolSelect")?.selectedOptions?.[0]?.textContent?.trim() || "plot";
        result.images.forEach((img, i) => {
          const wrap = document.createElement("div");
          wrap.className = "r-plot-item";

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext("2d").drawImage(img, 0, 0);
          wrap.appendChild(canvas);

          const dlBtn = document.createElement("button");
          dlBtn.type = "button";
          dlBtn.className = "btn btn-sm btn-outline-light r-plot-download";
          dlBtn.textContent = "Download PNG";
          dlBtn.addEventListener("click", () => {
            const suffix = result.images.length > 1 ? `_${i + 1}` : "";
            const a = document.createElement("a");
            a.href = canvas.toDataURL("image/png");
            a.download = `webR_${toolName.replace(/[^\w.-]+/g, "_")}${suffix}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
          wrap.appendChild(dlBtn);

          outEl.appendChild(wrap);
        });
      }
      if (statusEl) {
        statusEl.textContent = result.images.length
          ? "Done."
          : "Finished, but R produced no plot (see console).";
      }
    } finally {
      shelter.purge();
    }
  } catch (err) {
    console.error("webR failed:", err);
    if (statusEl) statusEl.textContent = `webR error: ${err.message ?? err}`;
  } finally {
    btn.disabled = false;
  }
});

// Leaving Scatter for another tool: restore full column selection
["btnPCA", "btnTSNE", "btnUMAP", "btnPairs", "btnDistance", "btnHclust", "btnHeatmap"].forEach(id => {
  document.getElementById(id)?.addEventListener("click", () => {
    if (appState.selectionMode !== "scatter") return;
    const data = appState.data;
    if (!data || data.length === 0) return;
    appState.selectionMode = "normal";
    appState.selectedColumns = Object.keys(data[0] || {});
    renderTableRight(data, appState.name ? `${appState.name} (${appState.source})` : "Dataset Preview");
  });
});

// ======== PCA: CLICK TOOL BUTTON ========
document.getElementById("btnPCA")?.addEventListener("click", async () => {
  let data = appState.data;

  // Reset to normal selection mode
  appState.selectionMode = "normal";

  if (!data || data.length === 0) {
    renderTableRight([], "");
    const rightPanel = document.getElementById("rightData");
    if (rightPanel) {
      rightPanel.innerHTML = `
        <div class="text-muted">
          Load a file or select a built-in dataset (Iris) first.
        </div>
      `;
    }
    return;
  }

  // Filter to selected columns if any are selected
  if (appState.selectedColumns.length > 0) {
    data = data.map(row => {
      const filtered = {};
      // Include selected columns
      appState.selectedColumns.forEach(col => {
        if (col in row) filtered[col] = row[col];
      });
      // Always include text/categorical columns
      Object.keys(row).forEach(col => {
        if (typeof row[col] !== 'number' && !(col in filtered)) {
          filtered[col] = row[col];
        }
      });
      return filtered;
    });
    console.log(`Using ${appState.selectedColumns.length} selected columns + categorical columns for PCA`);
  }

  //console.log(`Running PCA on ${data.length} rows from ${appState.source}: ${appState.name}`);


const el = document.getElementById("myPCA");

  const height = defaultPlotHeight;

  showPlotLoading(el, getSlowMatrixWarningLabel(data, "Loading..."));

  // Read width after the card is visible so it matches the other plots
  const width = Math.max(520, el.clientWidth - 24);

  await pca_plot({
    data,
    divId: "myPCA",
    width: width,
    height: height
  });
});


// ======== HCLUST: CLICK TOOL BUTTON ========
document.getElementById("btnHclust")?.addEventListener("click", async () => {
  const data = appState.data;
  // console.log("btnHclust clicked, appState.data:", data);
  // Reset to normal selection mode
  appState.selectionMode = "normal";

  if (!data || data.length === 0) {
    const rightPanel = document.getElementById("rightData");
    if (rightPanel) {
      rightPanel.innerHTML = `
        <div class="text-muted">
          Load a file or select a built-in dataset (Iris) first.
        </div>
      `;
    }
    return;
  }

  const el = document.getElementById("myHclust");
  if (!el) return;

 // const height =  900;

  // Derive numeric columns and labels
  const sample = data[0] || {};
  let keys = Object.keys(sample);
  
  // Use selected columns if available
  if (appState.selectedColumns.length > 0) {
    keys = appState.selectedColumns;
    console.log(`Using ${appState.selectedColumns.length} selected columns for Hclust`);
  }
  
  const numericKeys = keys.filter(k => typeof sample[k] === "number");
  const labelKey = keys.find(k => typeof sample[k] !== "number");

  const colNames = numericKeys.length ? numericKeys : keys.filter(k => k !== labelKey);

  if (colNames.length === 0) {
    console.warn("Hclust requires at least one numeric column. Please select a numeric column.");
    showPlotLoading(el, "Select at least one numeric column to render Hclust.");
    return;
  }

  const matrix = data.map(row => colNames.map(k => {
    const value = row[k];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }));
  const rowNames = data.map((row, idx) => (labelKey ? String(row[labelKey]) : "row") + idx);

  // Show hclust controls
  const hclustControls = document.getElementById("hclustControls");
  if (hclustControls) hclustControls.style.display = "grid";

  // Update button states
  const btnRows = document.getElementById("btnHclustRows");
  const btnCols = document.getElementById("btnHclustCols");
  if (btnRows) {
    btnRows.textContent = `Cluster Rows: ${appState.hclustClusterRows ? "ON" : "OFF"}`;
    btnRows.className = `btn btn-sm ${appState.hclustClusterRows ? "btn-primary" : "btn-outline-secondary"} me-2`;
  }
  if (btnCols) {
    btnCols.textContent = `Cluster Cols: ${appState.hclustClusterCols ? "ON" : "OFF"}`;
    btnCols.className = `btn btn-sm ${appState.hclustClusterCols ? "btn-primary" : "btn-outline-secondary"}`;
  }

  // Show the clustered axes in the plot title, like the distance cards
  const hclustAxes = [];
  if (appState.hclustClusterRows) hclustAxes.push("rows");
  if (appState.hclustClusterCols) hclustAxes.push("cols");
  const hclustTitleEl = document.querySelector('.plot-card[data-plot="Hclust"] .plot-card-title');
  if (hclustTitleEl) hclustTitleEl.textContent = hclustAxes.length ? `Hclust (${hclustAxes.join(" & ")})` : "Hclust";

  showPlotLoading(el, "Loading...");

  // Read width after the card is visible so the default matches the reset width
  const width = Math.max(520, el.clientWidth - 24);

  await hclust_plot({
    divId: "myHclust",
    data: matrix,
    rowNames: rowNames,
    colNames: colNames,
    width,
    //height,
    clusterCols: appState.hclustClusterCols,
    clusterRows: appState.hclustClusterRows
  });
});

// ======== HCLUST TOGGLE BUTTONS ========
document.getElementById("btnHclustRows")?.addEventListener("click", () => {
  appState.hclustClusterRows = !appState.hclustClusterRows;
  const btn = document.getElementById("btnHclustRows");
  if (btn) {
    btn.textContent = `Cluster Rows: ${appState.hclustClusterRows ? "ON" : "OFF"}`;
    btn.className = `btn btn-sm ${appState.hclustClusterRows ? "btn-primary" : "btn-outline-secondary"} me-2`;
  }
  // Re-trigger hclust plot
  document.getElementById("btnHclust")?.click();
});

document.getElementById("btnHclustCols")?.addEventListener("click", () => {
  appState.hclustClusterCols = !appState.hclustClusterCols;
  const btn = document.getElementById("btnHclustCols");
  if (btn) {
    btn.textContent = `Cluster Cols: ${appState.hclustClusterCols ? "ON" : "OFF"}`;
    btn.className = `btn btn-sm ${appState.hclustClusterCols ? "btn-primary" : "btn-outline-secondary"}`;
  }
  // Re-trigger hclust plot
  document.getElementById("btnHclust")?.click();
});

// ======== HEATMAP: CLICK TOOL BUTTON ========
document.getElementById("btnHeatmap")?.addEventListener("click", async () => {
  const data = appState.data;
  //console.log("btnHeatmap clicked, appState.data:", data);
  // Reset to normal selection mode
  appState.selectionMode = "normal";

  if (!data || data.length === 0) {
    const rightPanel = document.getElementById("rightData");
    if (rightPanel) {
      rightPanel.innerHTML = `
        <div class="text-muted">
          Load a file or select a built-in dataset (Iris) first.
        </div>
      `;
    }
    return;
  }

  const el = document.getElementById("myHeatmap");
  if (!el) return;

 // const height =  900;

  // Derive numeric columns and labels
  const sample = data[0] || {};
  let keys = Object.keys(sample);
  
  // Use selected columns if available
  if (appState.selectedColumns.length > 0) {
    keys = appState.selectedColumns;
    console.log(`Using ${appState.selectedColumns.length} selected columns for Heatmap`);
  }
  
  const numericKeys = keys.filter(k => typeof sample[k] === "number");
  const labelKey = keys.find(k => typeof sample[k] !== "number");

  const colNames = numericKeys.length ? numericKeys : keys.filter(k => k !== labelKey);
  const matrix = data.map(row => colNames.map(k => {
    const value = row[k];
    return typeof value === "number" && Number.isFinite(value) ? value : -1;
  }));
  const rowNames = data.map((row, idx) => (labelKey ? String(row[labelKey]) : "row") + idx);

  showPlotLoading(el, "Loading...");

  // Read width after the card is visible so it matches the other plots
  const width = Math.max(520, el.clientWidth - 24);

  await heatmap_plot({
    divId: "myHeatmap",
    data: matrix,
    rowNames: rowNames,
    colNames: colNames,
    width,
    //height,
  });
});


// ======== DISTANCE: CLICK TOOL BUTTON ========
document.getElementById("btnDistance")?.addEventListener("click", async () => {
  const data = appState.data;
  // Reset to normal selection mode
  appState.selectionMode = "normal";

  if (!data || data.length === 0) {
    const rightPanel = document.getElementById("rightData");
    if (rightPanel) {
      rightPanel.innerHTML = `
        <div class="text-muted">
          Load a file or select a built-in dataset (Iris) first.
        </div>
      `;
    }
    return;
  }

  // Derive numeric columns and labels (respect selected columns)
  const sample = data[0] || {};
  let keys = Object.keys(sample);
  if (appState.selectedColumns.length > 0) {
    keys = appState.selectedColumns;
    console.log(`Using ${appState.selectedColumns.length} selected columns for Distance`);
  }

  const numericKeys = keys.filter(k => typeof sample[k] === "number");
  const labelKey = keys.find(k => typeof sample[k] !== "number");
  const colNames = numericKeys.length ? numericKeys : keys.filter(k => k !== labelKey);

  if (colNames.length === 0) {
    console.warn("Distance requires at least one numeric column. Please select a numeric column.");
    return;
  }

  const matrix = data.map(row => colNames.map(k => {
    const value = row[k];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }));
  const rowNames = data.map((row, idx) => (labelKey ? String(row[labelKey]) : "row") + idx);

  // Show distance controls
  const distanceControls = document.getElementById("distanceControls");
  if (distanceControls) distanceControls.style.display = "grid";

  // Update toggle button states
  const btnDistRows = document.getElementById("btnDistRows");
  const btnDistCols = document.getElementById("btnDistCols");
  if (btnDistRows) {
    btnDistRows.textContent = `Distance Rows: ${appState.distanceRows ? "ON" : "OFF"}`;
    btnDistRows.className = `btn btn-sm ${appState.distanceRows ? "btn-primary" : "btn-outline-secondary"} me-2`;
  }
  if (btnDistCols) {
    btnDistCols.textContent = `Distance Cols: ${appState.distanceCols ? "ON" : "OFF"}`;
    btnDistCols.className = `btn btn-sm ${appState.distanceCols ? "btn-primary" : "btn-outline-secondary"}`;
  }

  // Row-to-row distance matrix
  const rowsEl = document.getElementById("myDistanceRows");
  if (appState.distanceRows && rowsEl) {
    showPlotLoading(rowsEl, "Loading...");
    const width = Math.max(520, rowsEl.clientWidth - 24);
    await distance_plot({
      divId: "myDistanceRows",
      data: matrix,
      rowNames,
      colNames,
      axis: "rows",
      width
    });
  } else if (rowsEl) {
    rowsEl.innerHTML = "";
    rowsEl.classList.remove("has-plot");
  }

  // Column-to-column distance matrix
  const colsEl = document.getElementById("myDistanceCols");
  if (appState.distanceCols && colsEl) {
    showPlotLoading(colsEl, "Loading...");
    const width = Math.max(520, colsEl.clientWidth - 24);
    await distance_plot({
      divId: "myDistanceCols",
      data: matrix,
      rowNames,
      colNames,
      axis: "cols",
      width
    });
  } else if (colsEl) {
    colsEl.innerHTML = "";
    colsEl.classList.remove("has-plot");
  }
});

// ======== DISTANCE TOGGLE BUTTONS ========
document.getElementById("btnDistRows")?.addEventListener("click", () => {
  appState.distanceRows = !appState.distanceRows;
  const btn = document.getElementById("btnDistRows");
  if (btn) {
    btn.textContent = `Distance Rows: ${appState.distanceRows ? "ON" : "OFF"}`;
    btn.className = `btn btn-sm ${appState.distanceRows ? "btn-primary" : "btn-outline-secondary"} me-2`;
  }
  // Re-trigger distance plot
  document.getElementById("btnDistance")?.click();
});

document.getElementById("btnDistCols")?.addEventListener("click", () => {
  appState.distanceCols = !appState.distanceCols;
  const btn = document.getElementById("btnDistCols");
  if (btn) {
    btn.textContent = `Distance Cols: ${appState.distanceCols ? "ON" : "OFF"}`;
    btn.className = `btn btn-sm ${appState.distanceCols ? "btn-primary" : "btn-outline-secondary"}`;
  }
  // Re-trigger distance plot
  document.getElementById("btnDistance")?.click();
});


// ======== UMAP: CLICK TOOL BUTTON ========
document.getElementById("btnUMAP")?.addEventListener("click", async () => {
  let data = appState.data;

  // Reset to normal selection mode
  appState.selectionMode = "normal";

  //console.log("btnUmap clicked, appState.data:", data);
  if (!data || data.length === 0) {
    renderTableRight([], "");
    const rightPanel = document.getElementById("rightData");
    if (rightPanel) {
      rightPanel.innerHTML = `
        <div class="text-muted">
          Load a file or select a built-in dataset (Iris) first.
        </div>
      `;
    }
    return;
  }

  // Filter to selected columns if any are selected
  if (appState.selectedColumns.length > 0) {
    data = data.map(row => {
      const filtered = {};
      // Include selected columns
      appState.selectedColumns.forEach(col => {
        if (col in row) filtered[col] = row[col];
      });
      // Always include text/categorical columns
      Object.keys(row).forEach(col => {
        if (typeof row[col] !== 'number' && !(col in filtered)) {
          filtered[col] = row[col];
        }
      });
      return filtered;
    });
    console.log(`Using ${appState.selectedColumns.length} selected columns + categorical columns for UMAP`);
  }

  const el = document.getElementById("myUMAP");
  if (!el) return;

  const height = defaultPlotHeight;

  showPlotLoading(el, getSlowMatrixWarningLabel(data, "Loading..."));

  // Read width after the card is visible so it matches the other plots
  const width = Math.max(520, el.clientWidth - 24);

  await umap_plot({
    data,
    divId: "myUMAP",
    width: width,
    height: height
  });
});


// ======== t-SNE: CLICK TOOL BUTTON ========
document.getElementById("btnTSNE")?.addEventListener("click", async () => {
  let data = appState.data;

  // Reset to normal selection mode
  appState.selectionMode = "normal";

  if (!data || data.length === 0) {
    renderTableRight([], "");
    const rightPanel = document.getElementById("rightData");
    if (rightPanel) {
      rightPanel.innerHTML = `
        <div class="text-muted">
          Load a file or select a built-in dataset (Iris) first.
        </div>
      `;
    }
    return;
  }

  // Filter to selected columns if any are selected
  if (appState.selectedColumns.length > 0) {
    data = data.map(row => {
      const filtered = {};
      // Include selected columns
      appState.selectedColumns.forEach(col => {
        if (col in row) filtered[col] = row[col];
      });
      // Always include text/categorical columns
      Object.keys(row).forEach(col => {
        if (typeof row[col] !== 'number' && !(col in filtered)) {
          filtered[col] = row[col];
        }
      });
      return filtered;
    });
    console.log(`Using ${appState.selectedColumns.length} selected columns + categorical columns for t-SNE`);
  }

  const el = document.getElementById("myTSNE");
  if (!el) return;

  const height = defaultPlotHeight;

  showPlotLoading(el, getSlowMatrixWarningLabel(data, "Loading..."));

  // Read width after the card is visible so it matches the other plots
  const width = Math.max(520, el.clientWidth - 24);

  await tsne_plot({
    data,
    divId: "myTSNE",
    width: width,
    height: height
  });
});

// ======== SCATTER: CLICK TOOL BUTTON ========
document.getElementById("btnScatter")?.addEventListener("click", async () => {
  let data = appState.data;

  if (!data || data.length === 0) {
    renderTableRight([], "");
    const rightPanel = document.getElementById("rightData");
    if (rightPanel) {
      rightPanel.innerHTML = `
        <div class="text-muted">
          Load a file or select a built-in dataset (Iris) first.
        </div>
      `;
    }
    return;
  }

  // Set scatter selection mode and limit to 2 numeric columns
  appState.selectionMode = "scatter";
  
  // Get all columns and identify numeric vs categorical
  const sample = data[0] || {};
  const allCols = Object.keys(sample);
  const numericCols = allCols.filter(col => typeof sample[col] === 'number');
  const categoricalCols = allCols.filter(col => typeof sample[col] !== 'number');
  
  // Check if user has already selected numeric columns
  const currentNumericSelected = appState.selectedColumns.filter(col => 
    numericCols.includes(col)
  );
  
  // If user hasn't selected any numeric columns, default to first 2
  // Otherwise, keep their selection (limited to 2)
  let selectedNumeric;
  if (currentNumericSelected.length === 0) {
    selectedNumeric = numericCols.slice(0, 2);
    console.log(`Scatter mode: Defaulting to first 2 numeric columns:`, selectedNumeric);
  } else {
    selectedNumeric = currentNumericSelected.slice(0, 2);
    console.log(`Scatter mode: Using user-selected numeric columns:`, selectedNumeric);
  }
  
  // Update selected columns with chosen numeric + all categorical
  appState.selectedColumns = [...selectedNumeric, ...categoricalCols];
  
  // Re-render table to update button states
  renderTableRight(appState.data, appState.name ? `${appState.name} (${appState.source})` : "Dataset Preview");
  
  console.log(`Scatter mode: Using ${selectedNumeric.length-1} numeric columns`);

  // Filter to selected columns if any are selected
  if (appState.selectedColumns.length > 0) {
    data = data.map(row => {
      const filtered = {};
      // Include selected columns
      appState.selectedColumns.forEach(col => {
        if (col in row) filtered[col] = row[col];
      });
      // Always include text/categorical columns
      Object.keys(row).forEach(col => {
        if (typeof row[col] !== 'number' && !(col in filtered)) {
          filtered[col] = row[col];
        }
      });
      return filtered;
    });
    console.log(`Using ${appState.selectedColumns.length} selected columns + categorical columns for Scatter`);
  }

  const el = document.getElementById("myScatter");
  if (!el) return;

  const height = defaultPlotHeight;

  showPlotLoading(el, "Loading...");

  // Read width after the card is visible so it matches the other plots
  const width = Math.max(520, el.clientWidth - 24);

  await scatter_plot({
    data,
    divId: "myScatter",
    width: width,
    height: height
  });
});


// ======== PAIRS: CLICK TOOL BUTTON ========
document.getElementById("btnPairs")?.addEventListener("click", async () => {
  let data = appState.data;

  // Reset to normal selection mode
  appState.selectionMode = "normal";

  if (!data || data.length === 0) {
    renderTableRight([], "");
    const rightPanel = document.getElementById("rightData");
    if (rightPanel) {
      rightPanel.innerHTML = `
        <div class="text-muted">
          Load a file or select a built-in dataset (Iris) first.
        </div>
      `;
    }
    return;
  }

  // Filter to selected columns if any are selected
  if (appState.selectedColumns.length > 0) {
    data = data.map(row => {
      const filtered = {};
      // Include selected columns
      appState.selectedColumns.forEach(col => {
        if (col in row) filtered[col] = row[col];
      });
      // Always include text/categorical columns
      Object.keys(row).forEach(col => {
        if (typeof row[col] !== 'number' && !(col in filtered)) {
          filtered[col] = row[col];
        }
      });
      return filtered;
    });
    console.log(`Using ${appState.selectedColumns.length} selected columns + categorical columns for Pairs`);
  }

  const el = document.getElementById("myPairs");
  if (!el) return;

  const height = defaultPairsHeight;

  showPlotLoading(el, "Loading...");

  // Read width after the card is visible so it matches the other plots
  const width = Math.max(520, el.clientWidth - 24);

  await pairs_plot({
    data,
    divId: "myPairs",
    width: width,
    height: height
  });
});