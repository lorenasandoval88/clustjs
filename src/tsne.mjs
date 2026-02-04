import * as d3 from "d3";
import d3tip from "d3-tip";
import { TSNE } from '@keckelt/tsne';
import irisData from "./data/irisData.js";
import spiralData from "./data/spiralData.js";


export const tsneDt = {
  data: {
    divNum: 1,
    iris: {
      json: irisData,
      csv: null
    },
    spiral: {
      json: spiralData,
      csv: null
    },
    file: {
      json: null,
      csv: null
    }
  }
}

export async function tsne_plot(options = {}) {
  console.log("RUNNING: tsne_plot() function----------");

  const {
    divid: divid = "",
    data: data = irisData,
    width: width = 600,
    height: height = 300,
    colors: colors = ["red", "blue", "green", "orange", "purple", "pink", "yellow"],
    perplexity: perplexity = 30,
    epsilon: epsilon = 10,
    iterations: iterations = 1000
  } = options;

  // Resolve target container
  let div = divid ? document.getElementById(divid) : null;
  if (div) {
    console.log("plot div provided in function parameters. divid:", divid);
    div.innerHTML = "";
  } else {
    const currentDivNum = tsneDt.data.divNum;
    div = document.createElement("div");
    div.id = divid || 'tsne_plot' + currentDivNum;
    console.log("div NOT provided within function options or doesn't exist... created a new div with id: ", div.id);
    document.body.appendChild(div);
    tsneDt.data.divNum = currentDivNum + 1;
  }

  // Extract numeric and categorical columns
  const sample = data[0] || {};
  const keys = Object.keys(sample);
  const numericKeys = keys.filter(k => typeof sample[k] === "number");
  const categoryKey = keys.find(k => typeof sample[k] !== "number");

  // Extract feature matrix X and labels
  const X = data.map(row => numericKeys.map(k => row[k]));
  const labels = categoryKey ? data.map(row => row[categoryKey]) : data.map((_, i) => `row${i}`);

  // Standardize features
  const Xs = standardize(X);

  // Run t-SNE using @keckelt/tsne API -------------------------------------------
  // This library requires separate initialization steps

// 1.  Create the TSNE model with just options (no data)
// 2.  Call model.initDataRaw(Xs) to initialize with the data
// 3.  Call model.initSolution() to set up the initial random solution
// 4.  Then run the iterations with model.step()
// 5.  Finally get the result with model.getSolution()

  const model = new TSNE({
    dim: 2,
    perplexity: perplexity,
    earlyExaggeration: 4.0,
    learningRate: epsilon,
    nIter: iterations,
    metric: 'euclidean'
  });

  // Initialize with raw data
  model.initDataRaw(Xs);
  
  // Initialize the solution (random initial positions)
  model.initSolution();

  // Run all iterations
  for (let i = 0; i < iterations; i++) {
    model.step();
  }

  // Get output coordinates
  const embedding = model.getSolution();

  // Create scores array similar to PCA/UMAP
  const scores = embedding.map((xy, i) => ({
    group: labels[i],
    name: categoryKey ? String(labels[i]) + "_" + i : "id_" + i,
    tSNE1: xy[0],
    tSNE2: xy[1]
  }));

  const groups = [...new Set(scores.map(d => d.group))];
  const color = d3.scaleOrdinal(colors).domain(groups);

  const fontFamily = 'monospace';
  const maxOpacity = 0.7;
  const margin = {
    top: 25,
    right: 170,
    bottom: 45,
    left: 45
  };

  // Compute padded domain for tSNE1
  const minTSNE1 = d3.min(scores, d => d.tSNE1);
  const maxTSNE1 = d3.max(scores, d => d.tSNE1);
  const rangeTSNE1 = maxTSNE1 - minTSNE1;
  const paddedMin = minTSNE1 - rangeTSNE1 * 0.10;
  const paddedMax = maxTSNE1 + rangeTSNE1 * 0.10;

  const x = d3.scaleLinear()
    .domain([paddedMin, paddedMax])
    .range([margin.left, width - margin.right]);

  const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom + 5})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
    .call(g => g.select(".domain")
      .attr("stroke", "#000")
      .attr("stroke-width", 1))
    .call(g => g.selectAll(".tick line")
      .attr("stroke", "#000")
      .attr("stroke-width", 1))
    .call(g => g.selectAll(".tick text")
      .attr("fill", "#000")
      .style("font-size", "12px"))
    .call(g => g.append("text")
      .attr("x", width - margin.right)
      .attr("y", 35)
      .attr("fill", "#000")
      .attr("font-weight", "bold")
      .attr("text-anchor", "end")
      .text("t-SNE 1"));

  const y = d3.scaleLinear()
    .domain(d3.extent(scores, d => d.tSNE2))
    .range([height - margin.bottom, margin.top]);

  const yAxis = g => g
    .attr("transform", `translate(${margin.left - 5},0)`)
    .call(d3.axisLeft(y).ticks(6).tickSizeOuter(0))
    .call(g => g.select(".domain")
      .attr("stroke", "#000")
      .attr("stroke-width", 1))
    .call(g => g.selectAll(".tick line")
      .attr("stroke", "#000")
      .attr("stroke-width", 1))
    .call(g => g.selectAll(".tick text")
      .attr("fill", "#000")
      .style("font-size", "12px"))
    .call(g => g.append("text")
      .attr("x", -margin.top)
      .attr("y", margin.top - 5)
      .attr("fill", "#000")
      .attr("font-weight", "bold")
      .attr("text-anchor", "start")
      .text("t-SNE 2"));

  const svg = d3.create("svg")
    .style("background", "white")
    .style("overflow", "visible");

  svg.attr("id", "svgid_tsne");

  // Title
  svg.append("text")
    .attr("x", width / 2 - margin.left)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-family", "sans-serif")
    .text("t-SNE Plot");

  const g = svg
    .attr('width', width)
    .attr('height', height)
    .append('g');

  g.append("g").call(xAxis);
  g.append("g").call(yAxis);

  g.append("rect")
    .attr("id", "background")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", "white")
    .on("click", (event, d) => selectGroup(null, d, maxOpacity));

  const gPoints = g.append("g").attr("class", "gPoints").style("isolation", "isolate");

  const tooltip = d3tip()
    .style('border', 'solid 2px navy')
    .style('background-color', 'white')
    .style("color", "#000")
    .style('border-radius', '7px')
    .style('padding', '8px 12px')
    .style('font-family', fontFamily)
    .style('font-size', '12px')
    .style('max-width', '250px')
    .style('width', 'auto')
    .html((event, d) => `
      <div style='line-height: 1.5;'>
        <div><strong>Name:</strong> ${d.name}</div>
        <div><strong>t-SNE 1:</strong> ${d.tSNE1.toFixed(2)}</div>
        <div><strong>t-SNE 2:</strong> ${d.tSNE2.toFixed(2)}</div>
      </div>`);

  svg.call(tooltip);

  gPoints
    .selectAll("circle")
    .data(scores)
    .enter()
    .append("circle")
    .attr("class", "points")
    .attr("cx", d => x(d.tSNE1))
    .attr("cy", d => y(d.tSNE2))
    .attr("fill", d => color(d.group))
    .attr("opacity", 0.7)
    .attr("r", 4)
    .on('mouseover', tooltip.show)
    .on('mouseout', tooltip.hide);

  const key = g.append("g")
    .selectAll("rect")
    .data(groups);

  key.enter().append("rect")
    .attr("class", "keyRects")
    .attr("x", width - margin.left - 50)
    .attr("y", (d, i) => i * 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => color(d))
    .on("click", (event, d) => selectGroup(null, d, maxOpacity));

  key.enter().append("text")
    .attr("x", d => width - margin.left - 30)
    .attr("y", (d, i) => i * 20)
    .attr("dy", "0.7em")
    .text(d => `${d}`)
    .style("font-size", "11px")
    .on("click", (event, d) => selectGroup(null, d, maxOpacity));

  div.appendChild(svg.node());

  function selectGroup(ctx, group, maxOpacity) {
    const groupElements = d3.selectAll(".points")
      .filter(d => d.group !== group);
    const activeGroup = d3.selectAll(".keyRects")
      .filter(d => d === group);
    const otherElements = d3.selectAll(".points")
      .filter(d => d.group === group);
    const otherGroups = d3.selectAll(".keyRects")
      .filter(d => d !== group);

    groupElements.transition().attr("opacity", 0.1);
    otherGroups.transition().attr("opacity", 0.1);
    otherElements.transition().attr("opacity", maxOpacity);
    activeGroup.transition().attr("opacity", maxOpacity);
  }
}

export const tsne_UI = async (options = {}) => {
  console.log("t-SNE UI - not yet implemented");
  console.log("Options:", options);
  
  // TODO: Implement UI similar to pca_UI with file upload and plot rendering
}

// Standardize features (recommended for t-SNE)
function standardize(X) {
  const n = X.length;
  const d = X[0].length;

  const mean = Array(d).fill(0);
  const std = Array(d).fill(0);

  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j];
  for (let j = 0; j < d; j++) mean[j] /= n;

  for (const row of X) for (let j = 0; j < d; j++) std[j] += (row[j] - mean[j]) ** 2;
  for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j] / (n - 1)) || 1;

  return X.map(row => row.map((v, j) => (v - mean[j]) / std[j]));
}
