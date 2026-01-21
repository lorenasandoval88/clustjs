// console.log("imports.js loaded")

import { PCA as npm_pca } from "https://esm.sh/ml-pca"
import { default as npm_pcajs } from 'https://cdn.jsdelivr.net/npm/pca-js@1.0.1/+esm'
const Plotly = (await import('https://cdn.jsdelivr.net/npm/plotly.js-dist@3.0.1/+esm')).default
const localforage = (await import('https://cdn.jsdelivr.net/npm/localforage@1.10.0/+esm')).default
// import {PCA} from 'https://cdn.jsdelivr.net/npm/ml-pca@4.1.1/+esm'
import * as d3 from "https://cdn.skypack.dev/d3@7"
import { default as d3tip} from 'https://esm.sh/d3-tip';
const hclust = (await import("https://cdn.skypack.dev/ml-hclust@3.1.0?min"))
// const dist = (await import("https://bundle.run/ml-distance-matrix@2.0.1"))
import {default as dist} from "https://esm.sh/ml-distance-matrix"
const distance = (await import("https://cdn.skypack.dev/ml-distance@3.0.0?min")).distance



export {
    npm_pca,
    npm_pcajs,
    Plotly,
    d3,
    d3tip,
    localforage,
    hclust,
    dist,
    distance
};