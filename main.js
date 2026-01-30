import { irisData, pca_plot, hclust_plot, heatmap_plot } from "./dist/sdk.mjs"; // adjust path

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
  name: null          // filename or dataset name
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

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="fw-semibold">${title}</div>
      <div class="text-muted small">${data.length} rows</div>
    </div>
  `;

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
    th.textContent = c.replaceAll("_", " ");
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
    console.log("Built-in Iris data selected");
    renderTableRight(appState.data, "Iris (built-in)");
    document.getElementById("myPCA").innerHTML = ""; // optional: clear old plot
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

    renderTableRight(appState.data, `Loaded file: ${file.name}`);
    document.getElementById("myPCA").innerHTML = ""; // optional: clear old plot
  };
  reader.readAsText(file);
});

// ======== PCA: CLICK TOOL BUTTON ========
document.getElementById("btnPCA")?.addEventListener("click", async () => {
  const data = appState.data;

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

  //console.log(`Running PCA on ${data.length} rows from ${appState.source}: ${appState.name}`);


const el = document.getElementById("myPCA");

  // Use container size (with safe minimums)
  const width = Math.max(520, el.clientWidth - 24);
  const height = 460;

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
  const height = 600;

  // Derive numeric columns and labels
  const sample = data[0] || {};
  const keys = Object.keys(sample);
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
  const height = 460;

  // Derive numeric columns and labels
  const sample = data[0] || {};
  const keys = Object.keys(sample);
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
    color: "red"
  });
});