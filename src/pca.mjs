console.log("pca.mjs loaded")
// TODO: limit textbox rows to 500
// TODO: automate UI to apply to dendo and heatmap
import {   removeNonNumberValues,  removeNumberValues,  scale} from './src/otherFunctions.js'
// import {  npm_pca,   d3,  d3tip,  localforage} from './imports.js'

import * as d3 from "d3";
import d3tip from "d3-tip";
import { PCA } from "ml-pca";        // this is the ml-pca default export
import irisData from "./data/irisData.js";

// import localforage from "localforage";  // only if you truly need it in SDK

const pcaDt = { data: {}}

// create button when UI function is called?, name divs by number
const divNum = 1
pcaDt.data.divNum = divNum
console.log("pca pcaDt.data.divNum:", pcaDt.data.divNum)
console.log("pcaDt object:", pcaDt)


const pcaScores = async function (data) {
  console.log("RUNNING pcaScores()-------------------------------")

  const numbersOnlyObjs = removeNonNumberValues(data)
  // console.log("numbersOnlyObjs", numbersOnlyObjs)
  const numbersOnlyArrs = (numbersOnlyObjs.map(Object.values))
  //// console.log('numbersOnlyArrs',numbersOnlyArrs[0])  

  const categories = (removeNumberValues(data)).map(x => Object.values(x)).flat()
  //// console.log('categories',categories)  

  // const headers = Object.keys(data[0]).filter(key => !isNaN(data[0][key]))
  // // console.log('headers',headers)
  let scaledObjs = (await scale(numbersOnlyObjs))
  let scaledArr = scaledObjs.map(Object.values)
  // console.log('scaledArr',scaledArr[0])  

  const pca = new npm_pca(scaledArr, {
    center: true,
    scale: true
  })


  const scores = pca.predict(scaledArr)
    .toJSON()
    .map((row, rowIndex) => {
      const columns = Object.keys(data[rowIndex]);
      const rowObj = {
        group: data[rowIndex]['species'],
        name: "id_" + rowIndex //data[rowIndex]['id']
      };
      columns.forEach((column, colIndex) => {
        rowObj[`PC${colIndex + 1}`] = row[colIndex];
      });
      return rowObj;
    }).map(({
      PC1,
      PC2,
      group,
      name
    }) => ({
      PC1,
      PC2,
      group,
      name
    }))
  // console.log("PCA1 and PC2 - getScores() (1st row):", scores[0])

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
  console.log("RUNNING pca_plot()-------------------------------")

  const {
    divid: divid = undefined,
    data: data = irisData , //formatIrisData(irisData, irisLabels),
    width: width = 400,
    height: height = 200,
    colors: colors = ["red", "blue", "green", "orange", "purple", "pink", "yellow"],
  } = options;

  //TODO calcscores

  // console.log(" data - pca_plot() (1st row):", data[0])
  const scores = await pcaScores(data)
  const groups = [...new Set(scores.map(d => d.group))] //.values()//.sort())
  const color = d3.scaleOrdinal(colors).domain(groups)


  const fontFamily = 'monospace'
  const maxOpacity = 0.7
 const margin = ({ top: 25, right: 170, bottom: 45, left: 45 })
  const paddedMin = d3.min(scores, d => d.PC1) - d3.min(scores, d => d.PC1) * -0.10
  const paddedMax = d3.max(scores, d => d.PC1) + d3.max(scores, d => d.PC1) * 0.10
  const x = d3.scaleLinear()
    .domain([paddedMin, paddedMax])
    .range([margin.left, width - margin.right])

  const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom + 5})`)
    .call(d3.axisBottom(x))
    .call(g => g.select(".domain").remove())
    .call(g => g.append("text")
      .attr("x", width - margin.left - 20)
      .attr("y", 15)
      // .attr("x", width - margin.right)
      //  .attr("y", -4)
      .attr("fill", "#000000")
      .attr("font-weight", "bold")
      .attr("text-anchor", "end")
      .text("PC1"))

  const y = d3.scaleLinear()
    .domain(d3.extent(scores, d => d.PC2))
    .range([height - margin.bottom, margin.top])

  const yAxis = g => g
    .attr("transform", `translate(${margin.left-5},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())
    .call(g => g.select(".tick:last-of-type text").clone()
      .attr("x", -margin.top)
      .attr("y", -margin.top)
      .attr("fill", "#000000")
      .attr("text-anchor", "start")
      .attr("font-weight", "bold")
      .text("PC2"))




  const svg = d3.create("svg")
    .style("background", "transparent")
  .style("overflow", "visible");


    svg.selectAll(".tick text")
  .attr("fill", "#000000");

  svg.selectAll(".domain, .tick line")
  .attr("stroke", "#000000");

  svg.id = "svgid"
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

  const gPoints = g.append("g").attr("class", "gPoints");

  const tooltip = d3tip()
    .style('border', 'solid 2px navy')
    .style('background-color', 'white')
    .style("color", "#000")
    .style('border-radius', '7px')
    // .style('float', 'left')
    .style('font-family', fontFamily)
    .style('width', '9%')
    .html((event, d) => `
          <div style='text-align: center'>
            name:${d.name} <br/>
            pc1:${d.PC1.toFixed(2)} <br/>
            pc2:${d.PC2.toFixed(2)}
          </div>`)

  // Apply tooltip to our SVG
  svg.call(tooltip)
  gPoints.selectAll()
  g.append("g")
    .style("isolation", "isolate")
    .selectAll("circle")
    .data(scores)
    .enter().append("circle")
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


  // Here we add the pca svg to the document body or to a specific div if provided

  if (document.getElementById(divid)) {
    console.log(`pcaPlot div provided in function parameters:`, divid);
    const div = document.getElementById(divid)
    div.innerHTML = ""
    div.appendChild(svg.node())

  // } else if (!document.getElementById("childDiv")) {
  } else if (!document.getElementById(divid)) {
    console.log(`pcaPlot div  NOT provided in function parameters or doesn't exist, creating div....`);
    const div = document.createElement("div")

    div.appendChild(svg.node());
    document.body.appendChild(div);
    console.log("pca() div without assigned id:", div)



  }
  console.log("pca_plot() end-----------------")
  return svg.node();
}



// export {  // pca
//   pca_plot,
// }






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