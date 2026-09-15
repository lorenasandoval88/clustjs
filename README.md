# Welcome to clustJs!


Multivariate statistical visualization (PCA, t-SNE, UMAP, clustering, heatmaps, etc) in JavaScript. 

live at: https://lorenasandoval88.github.io/clustjs


## Getting Started

Use Clust.js either directly from the CDN (ES modules in the browser) or as an npm package in your app.

### CDN (ES Module)

Run in the browser console or inside an HTML `<script type="module">` block:

```javascript
// One‑liner
await (await import("https://lorenasandoval88.github.io/clustjs/dist/sdk.mjs"))
    .pca_plot({ width: 600, height: 400 })

// Step‑by‑step
const sdk = await import("https://lorenasandoval88.github.io/clustjs/dist/sdk.mjs")
await sdk.pca_plot({ data: sdk.irisData, divid: "myPCA", width: 600, height: 400 })
// UI helper
await sdk.pca_UI({ divid: "myPCA", width: 600, height: 300, loadIrisOnStart: true })
```

<img width="499" height="532" alt="image" src="https://github.com/user-attachments/assets/2739074d-12a4-4e5e-ae79-b96b68f73295" />


### npm (ESM)

Install and import in your application:

```bash
npm install clustjs
```

```javascript
import { pca_plot, pca_UI, irisData } from "clustjs";

await pca_plot({ data: irisData, divid: "myPCA", width: 600, height: 400 });
await pca_UI({ divid: "myPCA", width: 600, height: 300, loadIrisOnStart: true });
```

### Notes

- Browser/DOM required: `pca_plot` and `pca_UI` render to the DOM; use in browser apps (Vite, webpack, Next.js client components).
- ES modules: the SDK is ESM-only; ensure your bundler/runtime supports ESM imports.


Further documentation can be found on the [wiki](https://github.com/lorenasandoval88/clustjs/wiki).

## Project Structure

### Architecture

- `index.html`: browser demo shell and layout.
- `main.js`: demo app wiring (imports SDK from `./dist/sdk.mjs`, runs plots, console UI helpers).
- `src/`: reusable source modules for plots and helpers.
- `src/sdk.mjs`: public SDK source entrypoint (aggregates dataset + plot + utility exports).
- `src/data/`: built-in datasets (`irisData`, `spiralData`).
- `css/styles.css`: demo styling.
- `dist/`: Rollup output (`dist/sdk.mjs` + sourcemap).

### Build

Run `npm run build` to generate `dist/sdk.mjs` from `src/sdk.mjs`.

### Run

Open `index.html` with a local static server (for example VS Code Live Server). The demo script `main.js` loads the built SDK from `./dist/sdk.mjs`.

### SDK API

Public exports from `src/sdk.mjs`:

- Datasets: `irisData`, `spiralData`
- Plots/UI/state:
    - `hclust_plot`, `hclust_UI`, `hclustDt`
    - `pca_plot`, `pca_UI`, `pcaDt`
    - `tsne_plot`, `tsne_UI`, `tsneDt`
    - `umap_plot`, `umap_UI`, `umapDt`
    - `scatter_plot`, `scatter_UI`, `scatterDt`
    - `pairs_plot`, `pairs_UI`, `pairsDt`
    - `heatmap_plot`
- Utilities: all exports from `otherFunctions.js` (via `export *`)
- Metadata: `version`

## Hierarchical clustering & missing values

`hclust_plot` reproduces R's `scale()` → `dist()` → `hclust()` pipeline, including the way R
handles missing values (`NA`). A missing entry is **never** replaced by a numeric value; it is
simply excluded from every calculation that involves it. The pipeline runs in three stages:

1. **Scaling (optional, on by default).** Each column is standardized using only its observed
   values — mean and sample standard deviation (`n − 1` denominator), matching R's `scale()`.
   Missing values stay missing, and a constant (zero-variance) column becomes missing so it never
   produces an invalid z-score. Set `scaleData: false` to cluster raw values like base
   `hclust(dist(x))`.

2. **Pairwise distance.** For every pair of rows, only the variables observed in *both* rows
   contribute. The accumulated difference is rescaled by `P / q` (total variables / jointly
   observed variables) to compensate for the excluded dimensions:

   ```
   d(i, j) = sqrt( (P / q) · Σ (z_ik − z_jk)²  over variables observed in both i and j )
   ```

   When every variable is observed, `P / q = 1` and this reduces to ordinary Euclidean distance.
   Shared missing values contribute nothing and never make two rows look similar. If a pair has no
   jointly observed variables (or fewer than `minOverlapRatio`), the distance is undefined and
   `hclust_plot` throws instead of inventing a value — matching R's `NA`.

3. **Clustering.** The precomputed row and column distance matrices are handed to `ml-hclust`
   (`agnes`) and drawn as dendrograms; the heatmap still shows the original `NA` cells as
   "missing".

### Missing-value options

| Option | Default | Description |
| --- | --- | --- |
| `scaleData` | `true` | Standardize columns (R's `scale()`) before clustering. |
| `missingValue` | `null` | Value treated as missing in the input (e.g. set `-1` if your data encodes missing as `-1`). |
| `clusteringDistanceRows` / `clusteringDistanceCols` | `"euclidean"` | Distance metric. Supported: `euclidean`, `manhattan` (`cityblock`). Unsupported metrics throw. |
| `removeMissingBy` | `"none"` | `"row"` or `"col"` drops rows/columns containing any missing value before clustering. |
| `minOverlapRatio` | `0` | Extension: require at least this fraction (`q / P`) of jointly observed variables per pair; pairs below it are rejected. `0` reproduces R behavior (only fully unobservable pairs are rejected). |

See the [wiki](https://github.com/lorenasandoval88/clustjs/wiki) for the full derivation and worked
examples.

