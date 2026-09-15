// ===============================
// DATASETS
// ===============================
export { default as irisData } from "./data/irisData.js";
export { default as spiralData } from "./data/spiralData.js";

// ===============================
// DEPENDENCIES
// ===============================
export * as d3 from "d3";

// ===============================
// PLOTS
// ===============================

export { hclust_plot,  hclustDt } from "./hclust.mjs";//hclust_UI
export { pca_plot, pca_UI, pcaDt } from "./pca.mjs";
export { tsne_plot, tsne_UI, tsneDt } from "./tsne.mjs";
export { umap_plot, umap_UI, umapDt } from "./umap.mjs";
export { scatter_plot, scatter_UI, scatterDt } from "./scatter.mjs";
export { pairs_plot, pairs_UI, pairsDt } from "./pairs.mjs";
export { heatmap_plot } from "./heatmap.mjs";
export { distance_plot, distanceMatrix } from "./distance.mjs";
// export { hclust_plot } from "./plots/hclust.mjs";
// optionally also export helpers
export * from "./otherFunctions.js";

// ===============================
// SDK METADATA
// ===============================
export const version = "0.1.0";

