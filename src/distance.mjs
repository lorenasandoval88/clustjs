import * as d3 from "d3";
import irisData from "./data/irisData.js";
import { heatmap_plot } from "./heatmap.mjs";

// Convert a value to a finite number or null (missing).
const toFiniteNumber = value => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

// Accept either an array of arrays (numeric matrix) or an array of objects.
// Returns { matrix, rowNames, colNames } where matrix is row-major numeric (null = missing).
const coerceMatrix = ({ data, rowNames, colNames }) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("distance_plot() requires a non-empty data array.");
  }

  if (Array.isArray(data[0])) {
    const matrix = data.map(row => row.map(toFiniteNumber));
    return {
      matrix,
      rowNames: rowNames ?? matrix.map((_, i) => `row${i}`),
      colNames: colNames ?? (matrix[0] ?? []).map((_, j) => `col${j}`)
    };
  }

  if (typeof data[0] !== "object" || data[0] === null) {
    throw new Error("distance_plot() data must be an array of arrays or array of objects.");
  }

  const keys = Object.keys(data[0]);
  const numericKeys = keys.filter(key => data.some(row => toFiniteNumber(row[key]) !== null));
  const textKeys = keys.filter(key => data.some(row => typeof row[key] === "string" && row[key].trim() !== ""));
  const labelKey = textKeys.length ? textKeys[0] : null;

  const matrix = data.map(row => numericKeys.map(key => toFiniteNumber(row[key])));
  return {
    matrix,
    rowNames: rowNames ?? (labelKey ? data.map((row, i) => `${row[labelKey]}${i}`) : matrix.map((_, i) => `row${i}`)),
    colNames: colNames ?? numericKeys
  };
};

// Standardize each column to zero mean / unit sd (ignoring missing), like R's scale().
const standardizeColumns = matrix => {
  const rowCount = matrix.length;
  const colCount = matrix[0]?.length ?? 0;
  const scaled = matrix.map(row => row.slice());

  for (let c = 0; c < colCount; c++) {
    const values = [];
    for (let r = 0; r < rowCount; r++) {
      const v = matrix[r][c];
      if (v !== null && Number.isFinite(v)) values.push(v);
    }
    if (values.length === 0) continue;
    const mean = d3.mean(values);
    const sd = d3.deviation(values) || 1;
    for (let r = 0; r < rowCount; r++) {
      const v = matrix[r][c];
      scaled[r][c] = v === null || !Number.isFinite(v) ? null : (v - mean) / sd;
    }
  }
  return scaled;
};

// Pairwise distance between a set of vectors, ignoring dimensions missing in either
// vector and rescaling by P/q (R's dist() missing-value convention). Returns a
// symmetric matrix with a zero diagonal.
export const distanceMatrix = (vectors, metric = "euclidean") => {
  const isManhattan = metric === "manhattan" || metric === "cityblock";
  const n = vectors.length;
  const dims = vectors[0]?.length ?? 0;
  const out = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let accumulated = 0;
      let shared = 0;
      for (let k = 0; k < dims; k++) {
        const a = vectors[i][k];
        const b = vectors[j][k];
        if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) continue;
        const diff = a - b;
        accumulated += isManhattan ? Math.abs(diff) : diff * diff;
        shared++;
      }
      const value = shared === 0
        ? 0
        : (isManhattan
          ? (dims / shared) * accumulated
          : Math.sqrt((dims / shared) * accumulated));
      out[i][j] = value;
      out[j][i] = value;
    }
  }
  return out;
};

// Render a pairwise-distance matrix as a heatmap.
// axis: "cols" (variable-to-variable) or "rows" (observation-to-observation).
export async function distance_plot(options = {}) {
  const {
    divId = "",
    data = irisData,
    rowNames: inputRowNames,
    colNames: inputColNames,
    axis = "cols",
    metric = "euclidean",
    standardize = true,
    width,
    height,
    color = null,
    title: inputTitle, // string, null to hide; default is auto-generated
    marginLeft = 20,   // breathing room on the left edge
    ...heatmapOptions
  } = options;

  const { matrix, rowNames, colNames } = coerceMatrix({
    data,
    rowNames: inputRowNames,
    colNames: inputColNames
  });

  const prepared = standardize ? standardizeColumns(matrix) : matrix;

  // Build the list of vectors to compare.
  // - cols: each variable is a vector over observations (transpose).
  // - rows: each observation is a vector over variables.
  const transpose = m => (m[0] ?? []).map((_, c) => m.map(row => row[c]));
  const vectors = axis === "rows" ? prepared : transpose(prepared);
  const labels = axis === "rows" ? rowNames : colNames;

  const dist = distanceMatrix(vectors, metric);

  // Auto title, e.g. "Row distances (euclidean, standardized)"
  const title = inputTitle !== undefined
    ? inputTitle
    : `${axis === "rows" ? "Row" : "Column"} distances (${metric}${standardize ? ", standardized" : ""})`;

  return heatmap_plot({
    divId,
    data: dist,
    rowNames: labels,
    colNames: labels,
    width,
    height,
    color,
    title,
    marginLeft,
    missingValue: null,
    ...heatmapOptions
  });
}
