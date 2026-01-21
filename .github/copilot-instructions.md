# Clust.js AI Agent Instructions

## Project Overview
**Clust.js** is a JavaScript library for multivariate statistical visualization (clustering, correlation, heatmaps, PCA) leveraging D3.js and machine learning libraries. The project exports visualization components via an ES module SDK that can be imported directly from CDN.

## Architecture

### Module Structure
- **Entry Points**: 
  - `src/sdk.mjs` — Main SDK export (compiled to `dist/sdk.mjs` via Rollup)
  - `src/index.js` — Local development exports (pca, heatmap, hclust)
- **Visualization Components**:
  - `src/pca.mjs` — PCA plot UI and calculations (uses `ml-pca` library)
  - `src/heatmap.js` — Heatmap visualization (currently empty, placeholder)
  - `src/hclust.js` — Hierarchical clustering (currently empty, placeholder)
- **Utilities**:
  - `src/otherFunctions.js` — Data transformation (CSV parsing, number/category separation, scaling)
  - `src/imports.js` — CDN import aggregation (D3, Plotly, ml-pca, ml-hclust, localforage)

### Data Flow
1. User provides data as **array of objects** (mixed numeric and categorical columns)
2. `otherFunctions` functions filter/separate numeric vs. categorical data
3. Machine learning libraries (ml-pca, ml-hclust) process numeric data
4. D3.js + d3-tip render interactive visualizations with color/dimension options

### Key Integration Points
- **ml-pca**: PCA calculations; expects 2D array of numeric values; outputs `scores` and `explained variance`
- **D3.js**: DOM rendering; tooltips via d3-tip
- **Bootstrap 5**: UI styling in HTML demo
- **Rollup**: Bundles `sdk.mjs` with plugin-node-resolve, plugin-commonjs, plugin-json, terser

## Build & Deployment

### Build Command
```bash
npm run build
```
Compiles `src/sdk.mjs` → `dist/sdk.mjs` with minification.

### SDK Usage Pattern
```javascript
// Load from CDN
sdk = await import("https://lorenasandoval88.github.io/clustjs/sdk.js")
sdk.pca_UI({
  divId: "chart-container",
  colors: ["#8C236A", "#4477AA"],
  data: irisData,
  height: 400,
  width: 600
})
```

### Demo Entry Point
- `index.html` — Bootstrap UI with file upload, data preview tables
- `main.js` — Imports from `dist/sdk.mjs`, manages app state, renders dataset preview

## Code Patterns & Conventions

### Data Structure Convention
All data is **array of objects** with mixed types:
```javascript
const data = [
  { species: "setosa", sepal_length: 5.1, sepal_width: 3.5, ... },
  { species: "versicolor", sepal_length: 7.0, sepal_width: 3.2, ... }
]
```

### Data Transformation Utilities
- `removeNonNumberValues(arr)` — Returns array of objects with only numeric values
- `removeNumberValues(arr)` — Returns array of objects with only categorical values
- `scale(arr)` — Async function; standardizes numeric data
- `csvToJson(csv)` — Converts CSV string to above data structure

### UI Function Pattern
All visualization functions follow `*_UI()` naming convention:
- Parameter: options object with `{divId, colors, data, height, width}`
- Return: interactive visualization mounted to DOM element
- Example: `pca_UI(options)` in [src/pca.mjs](src/pca.mjs)

### Import Pattern (CDN-First)
[src/imports.js](src/imports.js) aggregates CDN imports for browser bundling:
```javascript
export { PCA as npm_pca } from "https://esm.sh/ml-pca"
import * as d3 from "https://cdn.skypack.dev/d3@7"
```
This enables dynamic imports while maintaining ES module compatibility.

## Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| [src/pca.mjs](src/pca.mjs) | PCA visualization + calculations | Active |
| [src/otherFunctions.js](src/otherFunctions.js) | Data transformation utilities | Active |
| [src/heatmap.js](src/heatmap.js) | Heatmap component | Placeholder (empty) |
| [src/hclust.js](src/hclust.js) | Hierarchical clustering | Placeholder (empty) |
| [src/data/irisData.js](src/data/irisData.js) | Built-in sample dataset | Used in demos |
| [rollup.config.mjs](rollup.config.mjs) | Rollup build config | Bundles to dist/ |
| [index.html](index.html) + [main.js](main.js) | Demo application | Entry for local testing |

## Development Workflows

### Local Development
1. Edit source files in `src/`
2. Import from local files or `src/` paths
3. Use `import` statements with `.js`/`.mjs` extensions

### Building for Distribution
```bash
npm run build  # Creates dist/sdk.mjs (minified, sourcemapped)
```
- Output: `dist/sdk.mjs` — published to CDN for `https://lorenasandoval88.github.io/clustjs/sdk.js`

### Testing/Debugging
- Open `index.html` in browser to test demo
- Use browser DevTools console (see `console.log` statements throughout pca.mjs)
- Check [GitHub Wiki](https://github.com/lorenasandoval88/clustjs/wiki) for additional docs

## Dependencies & Version Notes
- **d3**: ^7.9.0 — Visualization library
- **ml-pca**: ^4.1.1 — PCA implementation
- **rollup**: ^4.55.3 — Module bundler
- Rollup plugins use `prefer-builtin: false` to prioritize browser-compatible ESM versions

## Known TODO Items
- PCA: Limit textbox rows to 500
- PCA: Automate UI application to dendrograms and heatmaps
- Complete heatmap and hclust placeholder implementations
