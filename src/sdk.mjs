// ===============================
// DATASETS
// ===============================
export { default as irisData } from "./data/irisData.js";
export { default as spiralData } from "./data/spiralData.js";

// ===============================
// PLOTS
// ===============================
export { hclust_plot, hclust_UI, hclustDt } from "./hclust.mjs";
export { pca_plot, pca_UI, pcaDt } from "./pca.mjs";
export { tsne_plot, tsne_UI } from "./tsne.mjs";
export { umap_plot, umap_UI } from "./umap.mjs";
export { heatmap_plot } from "./heatmap.mjs";
// export { hclust_plot } from "./plots/hclust.mjs";
// optionally also export helpers
export * from "./otherFunctions.js";

// ===============================
// SDK METADATA
// ===============================
export const version = "0.1.0";

