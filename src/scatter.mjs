import * as d3 from "d3";
import d3tip from "d3-tip";
import irisData from "./data/irisData.js";
import spiralData from "./data/spiralData.js";

export const scatterDt = {
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
};

function selectGroup(ctx, group, maxOpacity) {
  const groupElements = d3.selectAll(".scatter-points")
    .filter(d => d.group !== group);
  const activeGroup = d3.selectAll(".scatter-keyRects")
    .filter(d => d === group);
  const otherElements = d3.selectAll(".scatter-points")
    .filter(d => d.group === group);
  const otherGroups = d3.selectAll(".scatter-keyRects")
    .filter(d => d !== group);

  groupElements.transition().attr("opacity", 0.1);
  otherGroups.transition().attr("opacity", 0.1);
  otherElements.transition().attr("opacity", maxOpacity);
  activeGroup.transition().attr("opacity", maxOpacity);
}

export async function scatter_plot(options = {}) {
  console.log("RUNNING: scatter_plot() function----------");

  const {
    divid: divid = "",
    data: data = spiralData,
    width: width = 600,
    height: height = 460,
    colors: colors = ["red", "blue", "green", "orange", "purple", "pink", "yellow"],
    xCol: xCol = null,  // column name for x-axis
    yCol: yCol = null   // column name for y-axis
  } = options;

  // Resolve target container
  let div = divid ? document.getElementById(divid) : null;
  if (div) {
    console.log("div provided in function parameters:", divid);
    div.innerHTML = "";
  } else {
    const currentDivNum = scatterDt.data.divNum;
    div = document.createElement("div");
    div.id = divid || 'scatter_plot' + currentDivNum;
    console.log("div NOT provided within function options or doesn't exist... created a new div with id: ", div.id);
    document.body.appendChild(div);
    scatterDt.data.divNum = currentDivNum + 1;
  }

  // Extract columns
  const sample = data[0] || {};
  const keys = Object.keys(sample);
  const numericKeys = keys.filter(k => typeof sample[k] === "number");
  const categoryKey = keys.find(k => typeof sample[k] !== "number");

  // Auto-select x and y columns if not provided
  const xColumn = xCol || numericKeys[0] || keys[0];
  const yColumn = yCol || numericKeys[1] || keys[1];

  if (!xColumn || !yColumn) {
    console.error("Need at least 2 columns for scatter plot");
    return;
  }

  // Build scatter data
  const scatterData = data.map((row, i) => ({
    x: row[xColumn],
    y: row[yColumn],
    group: categoryKey ? row[categoryKey] : "row_" + i,
    name: categoryKey ? String(row[categoryKey]) + "_" + i : "id_" + i,
    original: row
  }));

  const groups = [...new Set(scatterData.map(d => d.group))];
  const color = d3.scaleOrdinal(colors).domain(groups);

  const fontFamily = 'monospace';
  const maxOpacity = 0.7;
  const margin = {
    top: 25,
    right: 170,
    bottom: 45,
    left: 45
  };

  // Compute padded domain for x
  const minX = d3.min(scatterData, d => d.x);
  const maxX = d3.max(scatterData, d => d.x);
  const rangeX = maxX - minX;
  const paddedMinX = minX - rangeX * 0.10;
  const paddedMaxX = maxX + rangeX * 0.10;

  const x = d3.scaleLinear()
    .domain([paddedMinX, paddedMaxX])
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
      .text(xColumn));

  const y = d3.scaleLinear()
    .domain(d3.extent(scatterData, d => d.y))
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
      .text(yColumn));

  const svg = d3.create("svg")
    .style("background", "white")
    .style("overflow", "visible");

  svg.attr("id", "svgid_scatter");

  // Title
  svg.append("text")
    .attr("x", width / 2 - margin.left)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-family", "sans-serif")
    .text("Scatter Plot");

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
        <div><strong>${xColumn}:</strong> ${d.x.toFixed(2)}</div>
        <div><strong>${yColumn}:</strong> ${d.y.toFixed(2)}</div>
      </div>`);

  svg.call(tooltip);

  gPoints
    .selectAll("circle")
    .data(scatterData)
    .enter()
    .append("circle")
    .attr("class", "scatter-points")
    .attr("cx", d => x(d.x))
    .attr("cy", d => y(d.y))
    .attr("fill", d => color(d.group))
    .attr("opacity", 0.7)
    .attr("r", 4)
    .on('mouseover', tooltip.show)
    .on('mouseout', tooltip.hide);

  const key = g.append("g")
    .selectAll("rect")
    .data(groups);

  key.enter().append("rect")
    .attr("class", "scatter-keyRects")
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
}

export const scatter_UI = async (options = {}) => {
  console.log("Scatter UI - not yet implemented");
  console.log("Options:", options);
  
  // TODO: Implement UI similar to pca_UI with file upload and plot rendering
};
