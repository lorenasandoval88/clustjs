// console.log("pca.mjs loaded")

// TODO: limit textbox rows to 500
// TODO: automate UI to apply to dendo and heatmap
import {
  removeNonNumberValues,
  scale,
  csvToJson,
  textBox
} from './otherFunctions.js'

import * as d3 from "d3";
import d3tip from "d3-tip";
import {
  PCA
} from "ml-pca"; // this is the ml-pca default export
import irisData from "./data/irisData.js";

// import localforage from "localforage";  // only if you truly need it in SDK

const pcaDt = {
  data: {
    divNum: 1,
    iris: {
      json: irisData,
      csv: null  // Will be generated on demand
    },
    file: {
      json: null,
      csv: null
    }
  }
}

// Generate CSV from iris JSON data
const irisHeaders = Object.keys(irisData[0]);
pcaDt.data.iris.csv = irisHeaders.join(',') + '\n' + 
  irisData.map(row => irisHeaders.map(h => row[h]).join(',')).join('\n');


const pcaScores = async function (data) {
  // console.log("RUNNING pcaScores()-------------------------------")

  const numbersOnlyObjs = removeNonNumberValues(data)

  let scaledObjs = (await scale(numbersOnlyObjs))
  let scaledArr = scaledObjs.map(Object.values)

  const pca = new PCA(scaledArr, {
    center: true,
    scale: true
  })

  // Efficiently extract only the first two principal components (PC1, PC2)
  const scoresArray = pca.predict(scaledArr).toJSON();
  const scores = scoresArray.map((row, rowIndex) => ({
    group: data[rowIndex]?.species,
    name: "id_" + rowIndex,
    PC1: row[0],
    PC2: row[1]
  }));
  return scores
}

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

export async function pca_plot(options = {}) {
  console.log("RUNNING: pca_plot() function----------")

  const {
    divid: divid = "",
    data: data = irisData, 
    width: width = 600,
    height: height = 300,
    colors: colors = ["red", "blue", "green", "orange", "purple", "pink", "yellow"],
  } = options;


  // Resolve target container and avoid redundant lookups
  let div = divid ? document.getElementById(divid) : null;
  if (div) {
    console.log("pcaPlot div provided in function parameters:", divid);
    div.innerHTML = "";
  } else {
    const currentDivNum = pcaDt.data.divNum;
    div = document.createElement("div");
    div.id = divid || 'pca_plot' + currentDivNum;
    console.log("currentDivNum", currentDivNum);
    console.log("div NOT provided within function options or doesn't exist... created a new div with id: ", div.id, "and appended to document body!");
    document.body.appendChild(div);
    pcaDt.data.divNum = currentDivNum + 1;
  }

  const scores = await pcaScores(data)
  const groups = [...new Set(scores.map(d => d.group))]
  const color = d3.scaleOrdinal(colors).domain(groups)


  const fontFamily = 'monospace'
  const maxOpacity = 0.7
  const margin = ({
    top: 25,
    right: 170,
    bottom: 45,
    left: 45
  })
  // Compute padded domain once using the range for better performance and clarity
  const minPC1 = d3.min(scores, d => d.PC1);
  const maxPC1 = d3.max(scores, d => d.PC1);
  const rangePC1 = maxPC1 - minPC1;
  const paddedMin = minPC1 - rangePC1 * 0.10;
  const paddedMax = maxPC1 + rangePC1 * 0.10;
  const x = d3.scaleLinear()
    .domain([paddedMin, paddedMax])
    .range([margin.left, width - margin.right])

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
    .text("PC1"));

const y = d3.scaleLinear()
  .domain(d3.extent(scores, d => d.PC2))
  .range([height - margin.bottom, margin.top])

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
    .text("PC2"));


  const svg = d3.create("svg")
    .style("background", "white")
    .style("overflow", "visible");

svg.attr("id", "svgid");

  // svg.id = "svgid"
  // const g = d3.select(DOM.svg(width, height));

  // title
  svg.append("text")
    .attr("x", width / 2 - margin.left)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-family", "sans-serif")
    .text("PCA Plot");

  const g = svg
    .attr('width', width)
    .attr('height', height)
    .append('g')
  // .attr('transform', `translate(${margin.left+margin.right}, ${margin.top+margin.bottom})`)

  g.append("g")
    .call(xAxis);

  g.append("g")
    .call(yAxis);

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
            <div><strong>PC1:</strong> ${d.PC1.toFixed(2)}</div>
            <div><strong>PC2:</strong> ${d.PC2.toFixed(2)}</div>
          </div>`)

  // Apply tooltip to our SVG
  svg.call(tooltip)
  gPoints
    .selectAll("circle")
    .data(scores)
    .enter()
    .append("circle")
    .attr("class", "points")
    .attr("cx", d => x(d.PC1))
    .attr("cy", d => y(d.PC2))
    .attr("fill", d => color(d.group))
    // .style("mix-blend-mode", blendingMode)
    .attr("opacity", 0.7)
    .attr("r", 4)
    .on('mouseover', tooltip.show)
    .on('mouseout', tooltip.hide)

  const key = g.append("g")
    .selectAll("rect")
    .data(groups)
  //  //console.log("key",key)
  key.enter().append("rect")
    .attr("class", "keyRects")
    .attr("x", width - margin.left - 50)
    .attr("y", (d, i) => i * 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => color(d))
    .on("click", (event, d) => selectGroup(null, d, maxOpacity))

  key.enter().append("text")
    .attr("x", d => width - margin.left - 30)
    .attr("y", (d, i) => i * 20)
    .attr("dy", "0.7em")
    .text(d => `${d}`)
    .style("font-size", "11px")
    .on("click", (event, d) => selectGroup(null, d, maxOpacity))

  div.appendChild(svg.node());
}

// load file and plot PCA
export async function pca_UI(options = {}) {
    console.log("RUNNING pca_UI()-------------------------------");

  const {
    divid: divid = "",
    data: data = irisData, 
    width: width = 600,
    height: height = 300,
    colors: colors = ["red", "blue", "green", "orange", "purple", "pink", "yellow"],
  } = options;


  // use the div provided in the function call or create a new one
  // Resolve target container and avoid redundant lookups
  const currentDivNum = pcaDt.data.divNum;
  let div = divid ? document.getElementById(divid) : null;
  if (div) {
    console.log("pca_UI() div provided in function parameters:", divid);
    div.innerHTML = "";
  } else {
      div = document.createElement("div");
      div.id = divid || 'pca_UI_' + currentDivNum;
      console.log(div.id)
      console.log("currentDivNum", currentDivNum);
      console.log("div NOT provided within function options or doesn't exist... created a new div with id: ", divid, "and appended to document body!");
      document.body.appendChild(div);
      pcaDt.data.divNum = currentDivNum + 1;
    }

  // Create loading message div
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loadingMessage_' + currentDivNum;
  loadingDiv.style.display = 'none';
  loadingDiv.style.padding = '10px';
  loadingDiv.style.margin = '10px 0';
  loadingDiv.style.backgroundColor = '#e3f2fd';
  loadingDiv.style.border = '1px solid #2196F3';
  loadingDiv.style.borderRadius = '4px';
  loadingDiv.textContent = 'Processing data...';

  // Create error message div
  const errorDiv = document.createElement('div');
  errorDiv.id = 'errorMessage_' + currentDivNum;
  errorDiv.style.display = 'none';
  errorDiv.style.padding = '10px';
  errorDiv.style.margin = '10px 0';
  errorDiv.style.backgroundColor = '#ffebee';
  errorDiv.style.border = '1px solid #f44336';
  errorDiv.style.borderRadius = '4px';
  errorDiv.style.color = '#c62828';

  // Iris data button
  const irisDataButton = document.createElement('button');
  irisDataButton.id = 'irisDataButton_' + currentDivNum;
  irisDataButton.textContent = 'Load Iris Data';
  irisDataButton.setAttribute('aria-label', 'Load built-in iris dataset');
  irisDataButton.style.marginRight = '10px';
  irisDataButton.style.padding = '5px 10px';
  
  // File input button
  const fileInput = document.createElement('input');
  fileInput.id = 'fileInput_' + currentDivNum;
  fileInput.setAttribute('type', 'file');
  fileInput.setAttribute('accept', '.csv');
  fileInput.setAttribute('aria-label', 'Upload CSV file for PCA analysis');
  
  // File input label for accessibility
  const fileLabel = document.createElement('label');
  fileLabel.setAttribute('for', fileInput.id);
  fileLabel.textContent = 'Or upload CSV file: ';
  fileLabel.style.marginLeft = '10px';
  
  div.appendChild(irisDataButton);
  div.appendChild(fileLabel);
  div.appendChild(fileInput);
  div.appendChild(document.createElement('br'));
  div.appendChild(loadingDiv);
  div.appendChild(errorDiv);
  div.appendChild(document.createElement('br'));

  // Create plot div
  const plotDiv = document.createElement("div");
  plotDiv.id = 'pcaplotDiv_' + currentDivNum;
  div.appendChild(plotDiv);

  // Create textbox div
  const textBoxDiv = document.createElement("div");
  textBoxDiv.id = 'textBoxDiv_' + currentDivNum;
  textBoxDiv.style.alignContent = "center";
  div.appendChild(textBoxDiv);

  // Helper function to show loading state
  const showLoading = () => {
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
  };

  // Helper function to hide loading state
  const hideLoading = () => {
    loadingDiv.style.display = 'none';
  };

  // Helper function to show error
  const showError = (message) => {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
  };

  // Helper function to validate and render data
  const renderData = async (json, csv) => {
    try {
      showLoading();
      
      // Validate that data has numeric columns
      const numericData = removeNonNumberValues(json);
      if (numericData.length === 0 || Object.keys(numericData[0]).length === 0) {
        throw new Error('No numeric columns found in data. PCA requires numeric data.');
      }

      // Clear previous content
      plotDiv.innerHTML = '';
      textBoxDiv.innerHTML = '';

      // PCA plot and text box with options
      await pca_plot({
        data: json, 
        divid: plotDiv.id,
        width: width,
        height: height,
        colors: colors
      });
      
      await textBox({text: csv, divid: textBoxDiv.id});
      
      hideLoading();
    } catch (error) {
      console.error('Error rendering data:', error);
      showError(`Error: ${error.message}`);
    }
  };

  // Event listener for file input (remove old listener if exists)
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log(currentDivNum, "fileInput button clicked!");

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      showError('Please upload a CSV file.');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async function (e) {
      try {
        const csv = e.target.result;
        
        // Validate CSV is not empty
        if (!csv || csv.trim().length === 0) {
          throw new Error('File is empty.');
        }
        
        const json = await csvToJson(csv);
        
        // Validate JSON data
        if (!json || json.length === 0) {
          throw new Error('No valid data found in CSV file.');
        }

        // Store data
        pcaDt.data.file.json = json;
        pcaDt.data.file.csv = csv;

        await renderData(json, csv);
      } catch (error) {
        console.error('Error processing file:', error);
        showError(`Error processing file: ${error.message}`);
      }
    };
    
    reader.onerror = function () {
      showError('Error reading the file. Please try again.');
    };
    
    reader.readAsText(file);
  };

  // Remove old event listener if it exists and add new one
  fileInput.removeEventListener('change', handleFileChange);
  fileInput.addEventListener('change', handleFileChange);

  // Event listener for iris data button
  const handleIrisClick = async function () {
    console.log(currentDivNum, "load iris data button clicked!");
    await renderData(pcaDt.data.iris.json, pcaDt.data.iris.csv);
  };

  irisDataButton.removeEventListener('click', handleIrisClick);
  irisDataButton.addEventListener('click', handleIrisClick);

  // Load iris data on initialization if requested
  if (loadIrisOnStart) {
    await renderData(pcaDt.data.iris.json, pcaDt.data.iris.csv);
  }

  pcaDt.data.divNum += 1;

  return div;
}




async function pcaPlotly2DPlot(data, labels) {
  var eigenvectors = imports.npm_pcajs.getEigenVectors(data);
  // var first = imports.npm_pcajs.computePercentageExplained(vectors,vectors[0])
  var topTwo = imports.npm_pcajs.computePercentageExplained(eigenvectors, eigenvectors[0], eigenvectors[1])
  // // const explainedVariance = imports.npm_pcajs.getExplainedVariance();

  // //console.log("vectors",vectors)
  // //console.log("first",first)
  //console.log("topTwo", topTwo)
  //console.log("eigenvectors", eigenvectors)
  //console.log("eigenvectors.map(row => row[0])", eigenvectors[0].vector)
  //console.log("eigenvectors.map(row => row[1])", eigenvectors[1].vector)

  const numComponents = 2
  const pcScores = data.map(row => {
    const transformedRow = [];
    for (let i = 0; i < numComponents; i++) {
      transformedRow.push(row.reduce((sum, val, idx) => sum + val * eigenvectors[idx][i], 0));
    }
    return transformedRow;
  });
  //console.log("pcScores", pcScores)
  const pc1 = eigenvectors[0].vector //eigenvectors.map(row => row[0]);
  const pc2 = eigenvectors[1].vector //eigenvectors.map(row => row[1]);
  // For 3D plot
  // const pc3 = eigenvectors[2].vector//pcScores.map(row => row[2]);

  const trace3d = {
    x: pc1,
    y: pc2,
    // z: pc3,
    mode: 'markers',
    type: 'scatter',
    marker: {
      size: 4,
      opacity: 0.8
    }
  };

  const layout2d = {
    // margin: {
    //   l: 150,
    //   r: 70,
    //   b: 150,
    //   t: 50
    // },
    title: {
      text: '3D PCA Plot',
      x: 0.5,
      xanchor: 'center'
    },
    scene: {
      xaxis: {
        title: 'PC1',
        titlefont: {
          color: 'red',
          family: 'Arial, Open Sans',
          size: 12
        }
      },
      yaxis: {
        title: 'PC2'
      },
      // zaxis: { title: 'Principal Component 3' }
    }
  };
  // Create the plot div
  const pca_plot3 = document.createElement("div")
  pca_plot3.id = 'pca_plot3'
  // pca_plot3.style.width = 400//"auto";
  // pca_plot3.style.height = 400//"auto";

  document.body.appendChild(pca_plot3);
  // pca_plot2.append(document.createElement('br'));
  await imports.Plotly.newPlot('pca_plot3', [trace3d], layout2d);
}
// pcaPlotlyPlot4(data)
// await pcaPlotly3DPlot(pcaData.irisData.irisNumbersOnly, irisLabels);
// await pcaPlotly2DPlot(pcaData.irisData.irisNumbersOnly, irisLabels);
// await pcaPlotly2DPlot(data, labels);