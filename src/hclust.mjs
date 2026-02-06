import * as d3 from "d3";
import d3tip from "d3-tip";
import * as hclust from "ml-hclust";
import dist from "ml-distance-matrix";
import { distance } from "ml-distance";
import irisData from "./data/irisData.js";
import { csvToJson } from "./otherFunctions.js";
// TODO: fix padding for left and right dendograms
// TODO: reset/clear plots when variables are selected or deselected
// TODO: call heat_map from heatmap.mjs
// TODO: make pairs plot for scatter, bc only two first features are used
// TODO: add t-SNE and 3D UMAP plot
// TODO: adjust top dendogram to text label width
// TODO: scatter plot add row number to hover label e species setosa_12
// fix dendo for spiral, decrease spiral data
export const hclustDt = {
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


// heatmap auxiliary functions, convert a matrix to a data array
const buildData = async function (matrix) {
    let array = []
    d3.range(matrix.length).map((d) => {
        const o = d3.range(matrix[0].length).map((t) => ({
            t: t,
            n: d,
            value: matrix[d][t]
        }))
        array = [...array, ...o]
    })
    return array
}

const transpose = m => m[0].map((x, i) => m.map(x => x[i]))

// trim label lengths if they are greater than 8 characters
function trimText(idx, arr) {
    return idx.map(e => {
        if (arr[e].length > 12) {
            return arr[e].slice(0, 6) + "..." + arr[e].slice(-3)// truncate to 13 characters
        } else {
            return arr[e]
        }
    })
}


export async function hclust_plot(options = {}) {
      console.log("RUNNING hclust_plot()-------------------------------")

    const {
        divid: divid = "",
    matrix: matrix = irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
    rownames: rownames = irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
    colnames: colnames = Object.keys(irisData[0]).slice(0, -1),
        width: width = 400,
        height: height = 2000,
        // dendograms
        clusterCols: clusterCols = true,
        clusterRows: clusterRows = true,
        clusteringDistanceRows: clusteringDistanceRows = "euclidean",
        clusteringDistanceCols: clusteringDistanceCols = "euclidean",
        clusteringMethodCols: clusteringMethodCols = "complete",
        clusteringMethodRows: clusteringMethodRows = "complete",
        marginTop: marginTop = clusterCols ? 100 : 53,
        marginLeft: marginLeft = clusterRows ? 200 : 80,
        colPadding: colPadding = clusterCols ? 60 : 0, 
        rowPadding: rowPadding = clusterRows ? 15 : 0,
        dendogram_font: dendogram_font = "14px",
        // topdendogram color
        colDendoColor: colDendoColor = "blue",
        // bottomdendogram color
        rowDendoColor: rowDendoColor = "red",
        // heatmap color
        heatmapColor: heatmapColor = "green",
        heatmapColorScale: heatmapColorScale = null,
        // hover tooltip
        tooltip_decimal: tooltip_decimal = 2,
        tooltip_fontFamily: tooltip_fontFamily = 'monospace',
        tooltip_fontSize: tooltip_fontSize = '12px',
    } = options;

   // console.log("dendogram options", options)
    const svg = d3.create("svg")

    const data = matrix //matrix.data ? matrix.data: matrix
     // console.log("dendo data ***", data)
     // console.log("dendo rownames ***", rownames)
     // console.log("dendo colnames ***", colnames)

    // Heatmap--------------------
    const colHclustTree = new hclust.agnes(dist(transpose(data), distance[clusteringDistanceCols]), {
        method: clusteringMethodCols,
        isDistanceMatrix: true
    })
    const root = d3.hierarchy(colHclustTree)
    const clusterLayout = d3.cluster()
    clusterLayout(root)
// console.log("colHclustTree", colHclustTree)


    const rowHclustTree2 = new hclust.agnes(dist(data, distance[clusteringDistanceRows]), {
        method: clusteringMethodRows,
        isDistanceMatrix: true
    })
    const root2 = d3.hierarchy(rowHclustTree2)


    const clusterLayout2 = d3.cluster()
    clusterLayout2(root2)

    let colIdx = clusterCols ? root.leaves().map(x => x.data.index) : d3.range(data[0].length) //col clust
   // console.log("colIdx", colIdx)
    let rowIdx = clusterRows ? root2.leaves().map(x => x.data.index) : d3.range(data.length) //row clust
    //  // console.log("rowIdx",rowIdx)
    const newMatrix2 = transpose(colIdx.map(i => transpose(rowIdx.map(e => data[e]))[i]))

    // if labels (truncated length) are not provided, indices are used
    let colNames2 = colnames ? trimText(colIdx, colnames) : Array.from(new Array(data[0].length), (x, i) => i + 1)

    let rowNames2 = rownames ? trimText(rowIdx, rownames) : Array.from(new Array(data[0].length), (x, i) => i + 1) //rownames.map((x,i) => x + rowIdx[i])//
  
    // max x and y label lengths to be used in dendogram heights
    const colNames2Lengths = d3.max(colNames2.map(e => e.length))
    const rowNames2Lengths = d3.max(rowNames2.map(e => String(e).length))
   // console.log("rowNames2Lengths",rowNames2Lengths)

    const margin = ({
        top: marginTop,
        bottom: 140,
        left: marginLeft,
        right: 300
    })
    const innerHeight = height - margin.top - margin.bottom;

// start of heatmap
    const flatValues = data.flat().filter(v => Number.isFinite(v));
    let derivedScale = heatmapColorScale;
    if (!Array.isArray(derivedScale) || derivedScale.length !== 2 || !derivedScale.every(Number.isFinite)) {
        const extent = d3.extent(flatValues);
        if (extent[0] === extent[1]) {
            derivedScale = [extent[0] ?? 0, (extent[1] ?? 0) + 1];
        } else {
            derivedScale = extent;
        }
    }

    const midVal = (derivedScale[0] + derivedScale[1]) / 2;
    const color_scale = d3.scaleLinear()
        .domain([derivedScale[0], midVal, derivedScale[1]])
        .range(['#4575b4', '#ffffff', '#d73027']) // blue (low) - white (middle) - red (high)

    let x_scale = d3.scaleBand()
        .domain(colNames2)
        .range([0, width - margin.left - margin.right])

    let y_scale = d3.scaleBand()
        .domain(rowNames2)
        // .domain(rownames)
        .range([0, innerHeight])

   // console.log("y_scale",y_scale)
// observable plot d3 to do


    svg
        .attr('width', width)
        .attr('height', height);

    // Solid white background to ensure white behind dendrograms/heatmap
    svg.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#ffffff');

    const g = svg
        .append('g')
        // move the entire graph down and right to accomodate labels
        .attr('transform', `translate(${margin.left}, ${margin.top})`)

    //text x axis (move labels to bottom)
    const xAxisYOffset = 0;
    const xAxis = g.append('g')
        .attr('transform', `translate(0, ${innerHeight + xAxisYOffset})`)
        .call(d3.axisBottom(x_scale))
        .style("font-size", dendogram_font);

    xAxis.selectAll('.tick').selectAll('line').remove()
    xAxis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-2px")
        .attr("dy", "1.2em")
        .attr("transform", "rotate(-90)")
        .attr("class", "xa")
        .style("fill", "#000")

    //text y axis (move labels to right of heatmap)
    const heatmapWidth = width - margin.left - margin.right;
    const yAxisX = heatmapWidth; // position right after heatmap ends

    let yAxis = g.append('g')
        .attr('transform', `translate(${yAxisX}, 0)`)
        .call(d3.axisRight(y_scale))
        .style("font-size", dendogram_font)
        .attr("id", "ya")

    yAxis.selectAll('.tick').selectAll('line').remove()
    yAxis.selectAll("text")
        .attr("dx", "2px")
        .attr("dy", "0.3em")
        .attr("class", "yaa")
        .style("text-anchor", "start")
        .style("fill", "#000")

    const gPoints = g.append("g").attr("class", "gPoints");

    const tooltip = d3tip()
        .style('border', 'solid 3px black')
        .style('background-color', 'white')
        .style('border-radius', '10px')
        .style('float', 'left')
        .style('color', '#000')
        .style('font-family', tooltip_fontFamily)
          .html((event, d) => `
          <div style='float: right; color: #000;'>
           value:${d.value.toFixed(tooltip_decimal)} <br/>
           row:${rowNames2[d.n]}, col:${colNames2[d.t] } 
        </div>`)
   // console.log("rowNames4-----------------------------")


    const heatMapData = await buildData(newMatrix2)
    // Apply tooltip to our SVG
    svg.call(tooltip)
    gPoints.selectAll()
        .data(heatMapData)
        .enter()
        .append('rect')
        .attr('x', (d) => x_scale(colNames2[d.t]))
        .attr('y', (d) => y_scale(rowNames2[d.n]))
        .attr('width', (width - margin.left - margin.right) / data[0].length)
        .attr('height', innerHeight / data.length)
        .attr('fill', (d) => color_scale(d.value))
        .on('mouseover', tooltip.show)
        .on('mouseout', tooltip.hide)

    // Color legend on the right side (START)
    const legendWidth = 30;
    const legendHeight = 300;
    const legendX = heatmapWidth + 150; // Position after y-axis labels
    const legendY = 0; // Align with top of heatmap
    const numBoxes = 5;
    const boxHeight = legendHeight / numBoxes;

    // Create 5 discrete color boxes
    const minVal = derivedScale[0];
    const maxVal = derivedScale[1];
    const range = maxVal - minVal;

    // Color scale for boxes (diverging: blue-white-red)
    const boxColorScale = d3.scaleLinear()
        .domain([0, (numBoxes - 1) / 2, numBoxes - 1])
        .range(["#4575b4", "#ffffff", "#d73027"]); // blue (low) - white (middle) - red (high)

    // Draw 5 boxes from bottom (dark) to top (bright)
    for (let i = 0; i < numBoxes; i++) {
        g.append("rect")
            .attr("x", legendX)
            .attr("y", legendY + (numBoxes - 1 - i) * boxHeight)
            .attr("width", legendWidth)
            .attr("height", boxHeight)
            .style("fill", boxColorScale(i))
            .style("stroke", "#fff")
            .style("stroke-width", "1px");
    }

    // Outer border for the legend
    g.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "none")
        .style("stroke", "#000")
        .style("stroke-width", "1px");

    // Legend axis (scale for the values)
    const legendScale = d3.scaleLinear()
        .domain(derivedScale)
        .range([legendHeight, 0]);

    // Create 5 tick values for the 5 boxes
    const legendTickValues = [];
    for (let i = 0; i < numBoxes; i++) {
        legendTickValues.push(minVal + (i / (numBoxes - 1)) * range);
    }

    const legendAxis = d3.axisRight(legendScale)
        .tickValues(legendTickValues)
        .tickFormat(d3.format(".2f"));

    const legendAxisG = g.append("g")
        .attr("transform", `translate(${legendX + legendWidth}, ${legendY})`)
        .call(legendAxis)
        .style("font-size", "14px");
    
    // Ensure tick text is visible with black fill
    legendAxisG.selectAll("text")
        .style("fill", "#000");
    
    legendAxisG.selectAll("line")
        .style("stroke", "#000");
    
    legendAxisG.selectAll("path")
        .style("stroke", "#000");


    // Color legend on the right side (END)

    // Top dendogram---------------------------------

    const dendoTooltip = d3tip()
    .style('border', 'solid 3px black')
    .style('background-color', 'white')
    .style('border-radius', '9px')
    .style('float', 'left')
    .style('color', '#000')
    .style('font-family', tooltip_fontFamily)
    .style('font-size', tooltip_fontSize)
    .html((event, d) => `
<div style='float: right; color: #000;'>
   Height:${d.source.data.height.toFixed(3)} <br/>
</div>`)



if (clusterCols== true){

    function transformY(data) {
       // console.log("height",height,colPadding)
        const ht = colPadding//height-500//-innerHeight;
                return (data.data.height / colMaxHeight) * ht;
      }
    
    function colElbow(d) { // H = width, V = height
        const path = (
            "M" + 
            d.source.x + 
            "," +
            //(height - (d.source.data.height / colMaxHeight) * height) +
            transformY(d.source) +
            "H" + 
            d.target.x +
            "V" + 
            // (height - (d.target.data.height / colMaxHeight) * height)
            transformY(d.target)
        )
        //// console.log("path", path)
        return path
    }
    

    //// console.log(root.links()) 
    
      // Ensure colMaxHeight is always positive to prevent flipping for small datasets
      const colMaxHeight = Math.max(root.data.height, 1);
    
      const allNodes = root.descendants().reverse()
      const leafs = allNodes.filter(d => !d.children)
          leafs.sort((a,b) => a.x - b.x)
      //const leafHeight = (width-margin.left)/ leafs.length// spacing between leaves
            const leafHeight = (width - margin.left - margin.right) / leafs.length// spacing between leaves (matches x_scale range)

          leafs.forEach((d,i) => d.x = i*leafHeight + leafHeight/2)
      
      allNodes.forEach(node => {
        if (node.children) {
          node.x = d3.mean(node.children, d => d.x)
        }})
    

    // Apply tooltip to our SVG
      svg.call(dendoTooltip)
    // dendo columns
            // Rotation center: half of heatmap width to align leaves with bottom labels after 180° flip
            const heatmapWidth = width - margin.left - margin.right;
            const colDendroRotateX = heatmapWidth / 2;
            const colDendroRotateY = colPadding / 2;
            // Position dendrogram so leaves are near heatmap top edge after 180° rotation
            // Add small gap (5px) between dendrogram leaves and heatmap
            const colDendroGap = 5;
            const colDendroY = margin.top - colPadding - colDendroGap;
      root.links().forEach((link,i) => {
      svg
          .append("path")
          .attr("class", "link")
          .attr("stroke", link.source.color || `${colDendoColor}`)
          .attr("stroke-width", `${3}px`)
          .attr("fill", 'none')
                    .attr("transform", `translate(${margin.left}, ${colDendroY}) rotate(180, ${colDendroRotateX}, ${colDendroRotateY})`)
          .attr("d", colElbow(link,colMaxHeight,margin.top,colNames2Lengths))
          .on('mouseover', dendoTooltip.show)
          // Hide the tooltip when "mouseout"
          .on('mouseout', dendoTooltip.hide)
        })
      }
             
      
    // bottom/row dendogram----------------------

    if (clusterRows == true) {

        function rowElbow(d) { // H = width, V = height
            const path = (
                "M" + 
                transformX(d.source)+ 
                "," +
                d.source.x +
                "V" + 
                d.target.x +
                "H" + 
                transformX(d.target)
            )
            //  // console.log("path",path)
            return path
        }
        
        function transformX(data) { // row dendogram height
            const height2 = margin.left - rowPadding;//padding = 60  
                        // const height2 = margin.left - rowPadding;//padding = 60  

            // const height2 = margin.left - (rowLen+10);
            return height2 - (data.data.height / rowMaxHeight) * height2
        }

        const rowMaxHeight = root2.data.height+2;
        const clusterLayout2 = d3.cluster()
        clusterLayout2(root2)

        const allNodes2 = root2.descendants().reverse()
        const leafs2 = allNodes2.filter(d => !d.children)
        leafs2.sort((a, b) => a.x - b.x)
        const leafHeight2 = innerHeight / leafs2.length
        leafs2.forEach((d, i) => d.x = i * leafHeight2 + leafHeight2 / 2)

        allNodes2.forEach(node => {
            if (node.children) {
                node.x = d3.mean(node.children, d => d.x)
            }
        })

        // Apply tooltip to our SVG
        svg.call(dendoTooltip)


        //  // console.log(root2.links()) 
        root2.links().forEach((link, i) => {
            svg
                .append("path")
                .attr("class", "link")
                .attr("stroke", link.source.color || `${rowDendoColor}`)
                .attr("stroke-width", `${3}px`)
                .attr("fill", 'none')
                .attr(`transform`, `translate(${rowNames2Lengths},${margin.top})`)
                .attr("d", rowElbow(link))
                .on('mouseover', dendoTooltip.show)
                // Hide the tooltip when "mouseout"
                .on('mouseout', dendoTooltip.hide)
        })
        svg.selectAll('path')
            .data(root2.links())
    }



   // Here we add the svg to the plot div
    // Check if the div was provided in the function call
    if (document.getElementById(divid)) {
        const div = document.getElementById(divid)
        // document.body.appendChild(div)
        div.innerHTML = ""
        div.appendChild(svg.node())
        console.log(`plot div provided in function parameters.divid:`,divid);


    } else if (!document.getElementById("childDiv")) {

       const currentDivNum = hclustDt.data.divNum;

       const div = document.createElement("div")
       div.id = divid || 'hclust_plot' + currentDivNum;
       console.log("div  NOT provided in function options or doesn't exist... created a new div with id: ", div.id, "and appended to document body!");

        document.body.appendChild(div)
        div.appendChild(svg.node());
        hclustDt.data.divNum = currentDivNum + 1;
    }
   // console.log("svg", svg.node())

    return svg.node()
}


//-----------------------------------------------------------------------------------
export async function hclust_UI(options = {}) {
    console.log("RUNNING hclust_UI()-------------------------------");
    console.log("hclust UI div num", hclustDt.data.divNum)

  const {
    divid: divid = "",
    //todo: add textbox opyions, height width color etc
  } = options

  let div = document.getElementById(divid);
    if (document.getElementById(divid)) {
    // The div with the specified ID exists, updating...
    console.log("hclust_UI() div ID provided, loading div:", div);
    // div.id = 'loadUI'

  } else {
    console.log("hclust_UI() div NOT provided. creating div...", div);
    // create the div element here
    div = document.createElement("div")
    div.id = 'loadUI' + (hclustDt.data.divNum)
    div.style.alignContent = "center"
    document.body.appendChild(div);
    console.log("hclust_UI() div NOT provided. creating div...", div);
  }

  // iris data button 
  const irisDataButton = document.createElement('button')
  irisDataButton.id = 'irisDataButton'+(hclustDt.data.divNum)
  irisDataButton.textContent = 'Load Iris Data'
  div.appendChild(irisDataButton);
  console.log("hclustUI: irisDataButton:", document.getElementById(irisDataButton.id))

  // file input Button
  const fileInput = document.createElement('input')
  fileInput.id = 'fileInput'+(hclustDt.data.divNum)
  fileInput.setAttribute('type', 'file')
  div.appendChild(fileInput);
  div.append(document.createElement('br'));
  div.append(document.createElement('br'));



  // create plot div
  const plotDiv = document.createElement("div")
  plotDiv.id = 'hcplotDiv'+(hclustDt.data.divNum)//'hcplotDiv'
  div.appendChild(plotDiv);
  console.log("hclustUI: plotDiv:", document.getElementById(plotDiv.id))

  // create textbox div
  const textBoxDiv = document.createElement("div")
  textBoxDiv.id = 'textBoxDiv'+(hclustDt.data.divNum)
  textBoxDiv.style.alignContent = "center"
  div.appendChild(textBoxDiv);
  console.log("hclustUI: textBoxDiv:", document.getElementById(textBoxDiv.id))

  // event listener for load file data buttons
  fileInput.addEventListener('change', (event) => {
  
      console.log(hclustDt.data.divNum,"fileInput button clicked!")
  
      const files = event.target.files;
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const file = event.target.files[0]
          if (file) {
            const reader = new FileReader();
  
            reader.onload = async function (e) {
              const csv = e.target.result;
              const json = await csvToJson(csv)
  
              console.log("hclustDt.data.divNum", hclustDt.data.divNum)
  
              const matrix = (json.map(Object.values))
              matrix['headers'] = json['headers']
  
              hclustDt.data.file = []
              hclustDt.data.file.json = json
              hclustDt.data.file.csv = csv
  
        // hclust plot and cluster by row/col buttons 
            
        let clusterRows = false
        let clusterCols = false

        // cluster row button 
        if (!document.getElementById('rowCluster'+(hclustDt.data.divNum))) {
            let clusterRows = true

            console.log("*********",!document.getElementById('rowCluster'+(hclustDt.data.divNum)))
            const rowClusterButton = document.createElement('button')
            rowClusterButton.id = 'rowCluster'+(hclustDt.data.divNum)
            rowClusterButton.textContent = 'Cluster by Rows'
            div.appendChild(rowClusterButton);
            console.log("hclustUI: rowCluster:", document.getElementById(rowClusterButton.id))

            // cluster col Button
            const colClusterButton = document.createElement('button')
            colClusterButton.id = 'colCluster'+(hclustDt.data.divNum)
            colClusterButton.textContent = 'Cluster by Columns'
            div.appendChild(colClusterButton);
            div.append(document.createElement('br'));
            div.append(document.createElement('br'));
        }

        console.log("load iris data button for Hclust clicked!")

            hclust_plot({
            matrix:  hclustDt.data.file.json.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),//numbers only, no species,
            rownames:  hclustDt.data.file.json.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
            colnames:   Object.keys(hclustDt.data.file.json[0]).slice(0, -1),
            divid: plotDiv.id,
            clusterCols: false,
            clusterRows: false
        })              
            // textBox({text: csv, divid: textBoxDiv.id})
       
            };
            reader.onerror = function () {
              displayError('Error reading the file.');
            };
            reader.readAsText(file);
          }
  
  
        };
        reader.readAsText(file); // Read as text, other options are readAsArrayBuffer, readAsDataURL
      }
  
    });
     // event listener for load iris data button
      document.getElementById(irisDataButton.id).addEventListener('click', async function () {
        let clusterRows = false
        let clusterCols = false

        // cluster row button 
        if (!document.getElementById('rowCluster'+(hclustDt.data.divNum))) {
            let clusterRows = true

            console.log("*********",!document.getElementById('rowCluster'+(hclustDt.data.divNum)))
            const rowClusterButton = document.createElement('button')
            rowClusterButton.id = 'rowCluster'+(hclustDt.data.divNum)
            rowClusterButton.textContent = 'Cluster by Rows'
            div.appendChild(rowClusterButton);
            console.log("hclustUI: rowCluster:", document.getElementById(rowClusterButton.id))

            // cluster col Button
            const colClusterButton = document.createElement('button')
            colClusterButton.id = 'colCluster'+(hclustDt.data.divNum)
            colClusterButton.textContent = 'Cluster by Columns'
            div.appendChild(colClusterButton);
            div.append(document.createElement('br'));
            div.append(document.createElement('br'));
        }

        console.log("load iris data button for Hclust clicked!")
    
        //TO DO: fix add file button. The cluster button revert to the load iris data
         // hclust plot and text box
        hclust_plot({
            matrix:  irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
            rownames:  irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
            colnames:   Object.keys(irisData[0]).slice(0, -1),
            divid: plotDiv.id, 
            clusterCols: clusterCols,
            clusterRows: clusterRows

        })
        // textBox({ text: hclustDt.data.iris.csv, divid: textBoxDiv.id})

        document.getElementById('rowCluster'+(hclustDt.data.divNum)).addEventListener('click', async function () {
            console.log(document.getElementById('rowCluster'+(hclustDt.data.divNum)))
            console.log("clusterRows",clusterRows)

        if(clusterRows == false){
            clusterRows = true
        } else if(clusterRows == true){
            clusterRows = false
        }
         console.log("clusterRows",clusterRows)
            hclust_plot({
                        matrix:  irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
                        rownames:  irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
                        colnames:   Object.keys(irisData[0]).slice(0, -1),
                        divid: plotDiv.id, 
                        clusterCols: clusterCols,
                        clusterRows: clusterRows
                    })
      })

        document.getElementById('colCluster'+(hclustDt.data.divNum)).addEventListener('click', async function () {
        console.log(document.getElementById('colCluster'+(hclustDt.data.divNum)))
         console.log("clusterCols",clusterCols)

        if(clusterCols == false){
            clusterCols = true
        } else if(clusterCols == true){
            clusterCols = false
        }
         console.log("clusterCols",clusterCols)

        hclust_plot({
                    matrix:  irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
                    rownames:  irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
                    colnames:   Object.keys(irisData[0]).slice(0, -1),
                    divid: plotDiv.id, 
                    clusterCols: clusterCols,
                    clusterRows: clusterRows
                })
      })
    
      });

      console.log(`rowCluster${(hclustDt.data.divNum)}`)

      console.log(document.getElementById(`rowCluster${(hclustDt.data.divNum)}`))


        hclustDt.data.divNum += 1

}