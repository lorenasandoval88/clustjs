import { irisData, spiralData, pca_plot, hclust_plot, heatmap_plot, umap_plot, tsne_plot, scatter_plot, pairs_plot } from "./dist/sdk.mjs"; // adjust path

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
console.log = (...args) => {
  originalConsole.log(...args);
  displayInConsole(args, 'log');
};

console.warn = (...args) => {
  originalConsole.warn(...args);
  displayInConsole(args, 'warn');
};

console.error = (...args) => {
  originalConsole.error(...args);
  displayInConsole(args, 'err');
};

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
  selectedColumns: [], // columns selected by user
  selectionMode: "normal" // "normal" | "scatter" (for 2-column limit)
};

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
  
  const hr = document.createElement("tr");
  cols.forEach(c => {
    const th = document.createElement("th");
    th.style.userSelect = "none";
    th.style.padding = "8px";
    
    // Check if column is categorical (text)
    const sample = data[0];
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
      const countEl = document.getElementById("selectedColCount");
      if (countEl) countEl.textContent = appState.selectedColumns.length;
      
      //console.log("Selected columns:", appState.selectedColumns);
    });
    
    th.appendChild(btn);
    hr.appendChild(th);
  });
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

// ======== GUI: BUILT-IN DATASET SELECT ========
document.getElementById("builtinData")?.addEventListener("change", (e) => {
  const val = e.target.value;

  if (val === "iris") {
    appState.data = irisData;
    appState.source = "builtin";
    appState.name = "Iris";
    appState.selectedColumns = []; // Reset selection
    console.log("Built-in Iris data selected");
    renderTableRight(appState.data, "Iris (built-in)");
    // Clear all plot containers
    const plotIds = ["myPCA", "myHclust", "myHeatmap", "myUMAP", "myTSNE", "myScatter", "myPairs"];
    plotIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
  } else if (val === "spiral") {
    appState.data = spiralData;
    appState.source = "builtin";
    appState.name = "Spiral";
    appState.selectedColumns = []; // Reset selection
    console.log("Built-in Spiral data selected");
    renderTableRight(appState.data, "Spiral (built-in)");
    // Clear all plot containers
    const plotIds = ["myPCA", "myHclust", "myHeatmap", "myUMAP", "myTSNE", "myScatter", "myPairs"];
    plotIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
  }
});




// ======== GUI: LOAD FILE ========
document.getElementById("fileInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    const data = parseDelimitedText(text);

    appState.data = data;
    appState.source = "file";
    appState.name = file.name;
    appState.selectedColumns = []; // Reset selection

    renderTableRight(appState.data, `Loaded file: ${file.name}`);
    // Clear all plot containers
    const plotIds = ["myPCA", "myHclust", "myHeatmap", "myUMAP", "myTSNE", "myScatter", "myPairs"];
    plotIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    });
  };
  reader.readAsText(file);
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

  // Use container size (with safe minimums)
  const width = Math.max(520, el.clientWidth - 24);
  const height = 410;

// Toggle the class in JS when you render/clear PCA plot so background stays white
  const p = document.getElementById("myPCA");
    if (p) {
    p.classList.add("has-plot");
    }

  await pca_plot({
    data,
    divid: "myPCA",
    width: width,
    height: height
  });
});


// ======== HCLUST: CLICK TOOL BUTTON ========
document.getElementById("btnHclust")?.addEventListener("click", async () => {
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

  const el = document.getElementById("myHclust");
  if (!el) return;

  const width = Math.max(520, el.clientWidth - 24);
  const height = 1500;

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

  const colnames = numericKeys.length ? numericKeys : keys.filter(k => k !== labelKey);
  const matrix = data.map(row => colnames.map(k => row[k])).filter(row => row.every(v => typeof v === "number" && Number.isFinite(v)));
  const rownames = data.map((row, idx) => (labelKey ? String(row[labelKey]) : "row") + idx);

  // Clear and mark container
  el.innerHTML = "";
  el.classList.add("has-plot");

  await hclust_plot({
    divid: "myHclust",
    matrix,
    rownames,
    colnames,
    width,
    height,
    clusterCols: true,
    clusterRows: true
  });
});


// ======== HEATMAP: CLICK TOOL BUTTON ========
document.getElementById("btnHeatmap")?.addEventListener("click", async () => {
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

  const el = document.getElementById("myHeatmap");
  if (!el) return;

  const width = Math.max(520, el.clientWidth - 24);
  const height = 1500;

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

  const colnames = numericKeys.length ? numericKeys : keys.filter(k => k !== labelKey);
  const matrix = data.map(row => colnames.map(k => row[k])).filter(row => row.every(v => typeof v === "number" && Number.isFinite(v)));
  const rownames = data.map((row, idx) => (labelKey ? String(row[labelKey]) : "row") + idx);

  // Clear and mark container
  el.innerHTML = "";
  el.classList.add("has-plot");

  await heatmap_plot({
    divid: "myHeatmap",
    matrix,
    rownames,
    colnames,
    width,
    height,
  });
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

  const width = Math.max(520, el.clientWidth - 24);
  const height = 410;

  // Clear and mark container
  el.innerHTML = "";
  el.classList.add("has-plot");

  await umap_plot({
    data,
    divid: "myUMAP",
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

  const width = Math.max(520, el.clientWidth - 24);
  const height = 410;

  // Clear and mark container with loading message
  el.innerHTML = '<div class="text-center text-muted p-4">Loading t-SNE plot...</div>';
  el.classList.add("has-plot");

  await tsne_plot({
    data,
    divid: "myTSNE",
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

  const width = Math.max(520, el.clientWidth - 24);
  const height = 410;

  // Clear and mark container
  el.innerHTML = "";
  el.classList.add("has-plot");

  await scatter_plot({
    data,
    divid: "myScatter",
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

  const width = Math.max(900, el.clientWidth - 24);
  const height = 900;

  // Clear and mark container
  el.innerHTML = "";
  el.classList.add("has-plot");

  await pairs_plot({
    data,
    divid: "myPairs",
    width: width,
    height: height
  });
});