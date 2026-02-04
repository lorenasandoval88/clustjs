import * as d3 from "d3";
import d3tip from "d3-tip";
import irisData from "./data/irisData.js";
import spiralData from "./data/spiralData.js";

export const pairsDt = {
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

export async function pairs_plot(options = {}) {
  console.log("RUNNING: pairs_plot() function----------");

  const {
    divid: divid = "",
    data: data = irisData,
    width: width = 1000,
    height: height = 1000,
    colors: colors = ["red", "blue", "green", "orange", "purple", "pink", "yellow"],
  } = options;

  // Resolve target container
  let div = divid ? document.getElementById(divid) : null;
  if (div) {
    console.log("div provided in function parameters:", divid);
    div.innerHTML = "";
  } else {
    const currentDivNum = pairsDt.data.divNum;
    div = document.createElement("div");
    div.id = divid || 'pairs_plot' + currentDivNum;
    console.log("div NOT provided... created new div with id:", div.id);
    document.body.appendChild(div);
    pairsDt.data.divNum = currentDivNum + 1;
  }

  // Extract numeric columns and categorical column
  const sample = data[0] || {};
  const keys = Object.keys(sample);
  const numericKeys = keys.filter(k => typeof sample[k] === "number");
  const categoryKey = keys.find(k => typeof sample[k] !== "number");

  if (numericKeys.length < 2) {
    div.innerHTML = '<div class="text-muted">Need at least 2 numeric columns for pairs plot</div>';
    return;
  }

  // Build data with groups
  const plotData = data.map((row, i) => ({
    values: numericKeys.map(k => row[k]),
    group: categoryKey ? row[categoryKey] : "row_" + i,
    name: categoryKey ? String(row[categoryKey]) + "_" + i : "id_" + i
  }));

  const groups = [...new Set(plotData.map(d => d.group))];
  const color = d3.scaleOrdinal(colors).domain(groups);

  const n = numericKeys.length;
  const cellSize = Math.min(180, (width - 100) / n);
  const margin = { top: 60, right: 150, bottom: 40, left: 60 };
  const plotWidth = cellSize * n + margin.left + margin.right;
  const plotHeight = cellSize * n + margin.top + margin.bottom;

  const svg = d3.create("svg")
    .attr("width", plotWidth)
    .attr("height", plotHeight)
    .style("background", "white");

  // Title
  svg.append("text")
    .attr("x", plotWidth / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Pairs Plot");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create tooltip
  const tooltip = d3tip()
    .style('border', 'solid 2px navy')
    .style('background-color', 'white')
    .style("color", "#000")
    .style('border-radius', '7px')
    .style('padding', '8px 12px')
    .style('font-family', 'monospace')
    .style('font-size', '11px')
    .html((event, d) => {
      const xVar = d.xVar;
      const yVar = d.yVar;
      return `
        <div>
          <strong>${d.group}</strong><br/>
          ${xVar}: ${d.xVal.toFixed(2)}<br/>
          ${yVar}: ${d.yVal.toFixed(2)}
        </div>`;
    });

  svg.call(tooltip);

  // Create scales for each variable
  const scales = numericKeys.map(key => {
    const values = data.map(d => d[key]);
    return d3.scaleLinear()
      .domain(d3.extent(values))
      .range([cellSize, 0]);
  });

  // Create grid of scatter plots
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const gCell = g.append("g")
        .attr("transform", `translate(${j * cellSize},${i * cellSize})`);

      // Add border
      gCell.append("rect")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", "none")
        .attr("stroke", "#ccc");

      if (i === j) {
        // Diagonal: show variable name
        gCell.append("text")
          .attr("x", cellSize / 2)
          .attr("y", cellSize / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .text(numericKeys[i]);
      } else {
        // Off-diagonal: scatter plot
        const xScale = scales[j];
        const yScale = scales[i];

        plotData.forEach(d => {
          gCell.append("circle")
            .datum({
              ...d,
              xVar: numericKeys[j],
              yVar: numericKeys[i],
              xVal: d.values[j],
              yVal: d.values[i]
            })
            .attr("cx", xScale(d.values[j]))
            .attr("cy", yScale(d.values[i]))
            .attr("r", 2.5)
            .attr("fill", color(d.group))
            .attr("opacity", 0.6)
            .on('mouseover', tooltip.show)
            .on('mouseout', tooltip.hide);
        });
      }

      // Add axis labels on edges
      if (i === n - 1) {
        // Bottom row - x labels
        gCell.append("text")
          .attr("x", cellSize / 2)
          .attr("y", cellSize + 15)
          .attr("text-anchor", "middle")
          .style("font-size", "9px")
          .text(numericKeys[j]);
      }

      if (j === 0) {
        // Left column - y labels
        gCell.append("text")
          .attr("x", -10)
          .attr("y", cellSize / 2)
          .attr("text-anchor", "end")
          .attr("dominant-baseline", "middle")
          .style("font-size", "9px")
          .text(numericKeys[i]);
      }
    }
  }

  // Add legend
  const legend = svg.append("g")
    .attr("transform", `translate(${plotWidth - margin.right + 20},${margin.top})`);

  groups.forEach((group, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(0,${i * 20})`);

    legendRow.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", color(group));

    legendRow.append("text")
      .attr("x", 20)
      .attr("y", 6)
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .text(group);
  });

  div.appendChild(svg.node());
}

export async function pairs_UI(options = {}) {
  const {
    divid: divid = "",
    data: data = irisData,
    width: width = 1000,
    height: height = 1000,
    colors: colors = ["red", "blue", "green", "orange", "purple", "pink", "yellow"],
  } = options;

  await pairs_plot({ divid, data, width, height, colors });
}