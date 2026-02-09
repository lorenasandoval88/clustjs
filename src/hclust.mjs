import * as d3 from "d3";
import d3tip from "d3-tip";
import * as hclust from "ml-hclust";
import dist from "ml-distance-matrix";
import {
    distance
} from "ml-distance";
import irisData from "./data/irisData.js";
import {
    heatmap_plot
} from "./heatmap.mjs";
import {
    csvToJson
} from "./otherFunctions.js";
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
            csv: null // Will be generated on demand
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
        const str = String(arr[e]);
        if (str.length > 12) {
            return str.slice(0, 12) + "..."; // truncate to 12 characters + "..."
        } else {
            return str;
        }
    })
}


export async function hclust_plot(options = {}) {
    console.log("RUNNING hclust_plot()-------------------------------")

    const {
        divid: divid = "",
        data: data = irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
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
        marginRight: marginRight = 10,
        marginBottom: marginBottom = 10,
        marginLeft: marginLeft = clusterRows ? 200 : 80,
        colPadding: colPadding = clusterCols ? 60 : 0,
        rowPadding: rowPadding = clusterRows ? 15 : 0,
        dendogram_font: dendogram_font = "14px",
        // topdendogram color
        colDendoColor: colDendoColor = "black",
        // bottomdendogram color
        rowDendoColor: rowDendoColor = "black",
        // heatmap color
        heatmapColor: heatmapColor = "green",
        heatmapColorScale: heatmapColorScale = null,
        // hover tooltip
        tooltip_decimal: tooltip_decimal = 2,
        tooltip_fontFamily: tooltip_fontFamily = 'monospace',
        tooltip_fontSize: tooltip_fontSize = '14px',
    } = options;


    // 'data' is now the main matrix input

    // dendograms--------------------
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

    // start of heatmap-------------------------
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
        .range(['#000080', '#ffffff', '#d73027']) // navy (low) - white (middle) - red (high)

    // bottom labels: Calculate font size as half the heatmap cell width
    const legendSpace = 20; // Reserve space for legend

    const cellWidth = (width - marginLeft - marginRight - legendSpace) / data[0].length;
    const labelFontSizeBottom = Math.max(cellWidth / 6, 8); // minimum 8px

    // Calculate bottom margin based on longest column label and font size
    const maxColLabelLength = Math.min(d3.max(colNames2.map(c => String(c).length)), 13);
    const dynamicBottomMargin = Math.max(140, labelFontSizeBottom * maxColLabelLength * 0.5 + 5);

    // right labels: Calculate font size as half the heatmap cell height
    const cellHeight = (height - marginTop - dynamicBottomMargin) / data.length;
    const labelFontSizeRight = Math.max(cellHeight / 3, 7); // minimum 7px

    // Calculate right margin based on longest row label and font size
    const maxRowLabelLength = Math.min(d3.max(rowNames2.map(r => String(r).length)), 13);
    const dynamicRightMargin = Math.max(200, labelFontSizeRight * maxRowLabelLength * 0.6 + 100); // 170 extra for legend

    const margin = ({
        top: marginTop,
        bottom: dynamicBottomMargin,
        left: marginLeft,
        right: dynamicRightMargin
    })


    const innerHeight = height - margin.top - margin.bottom;
    const innerWidth = width - margin.left - margin.right;



    // Use indices for scale domain to avoid duplicate label issues
    const colIndices = d3.range(data[0].length);
    const rowIndices = d3.range(data.length);

    let x_scale = d3.scaleBand()
        .domain(colIndices)
        .range([0, innerWidth])
        .padding(0)
    let y_scale = d3.scaleBand()
        .domain(rowIndices)
        .range([0, innerHeight])
        .padding(0)

    const svg = d3.create("svg")

    // Set SVG size 
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
    const x_axis = g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(x_scale).tickFormat(i => colNames2[i]))
        .style("font-size", labelFontSizeBottom + "px");

    x_axis.selectAll('.tick').selectAll('line').remove()
    x_axis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-2px")
        .attr("dy", "0.3em")
        .attr("class", "xa")
        .attr("transform", "rotate(-90)")
        .style("fill", "#000")

    //text y axis (move labels to right of heatmap)
    let y_axis = g.append('g')
        .attr('transform', `translate(${innerWidth}, 0)`)
        .call(d3.axisRight(y_scale).tickFormat(i => rowNames2[i]))
        .style("font-size", labelFontSizeRight + "px")
        .attr("id", "ya")

    y_axis.selectAll('.tick').selectAll('line').remove()
    y_axis.selectAll("text")
        .attr("dx", "3px")
        .attr("dy", "0.3em")
        .attr("class", "yaa")
        .style("text-anchor", "start")
        .style("fill", "#000")


    const tooltip = d3tip()
        .style('border', 'solid 3px black')
        .style('background-color', 'white')
        .style('border-radius', '10px')
        .style('float', 'left')
        .style('color', '#000')
        .style('font-family', tooltip_fontFamily)
        .style("font-size", tooltip_fontSize)
        .html((event, d) => `
          <div style='float: right; color: #000;'>
           value:${d.value.toFixed(tooltip_decimal)} <br/>
           row:${rowNames2[d.n]}, col:${colNames2[d.t] } 
        </div>`)

    const heatMapData = await buildData(newMatrix2)

    // Apply tooltip to our SVG
    const gPoints = g.append("g").attr("class", "gPoints");

    svg.call(tooltip)
    gPoints.selectAll()
        .data(heatMapData)
        .enter()
        .append('rect')
        .attr('x', (d) => x_scale(d.t))
        .attr('y', (d) => y_scale(d.n))
        .attr('width', x_scale.bandwidth())
        .attr('height', y_scale.bandwidth())
        .attr('fill', (d) => color_scale(d.value))
        .on('mouseover', tooltip.show)
        .on('mouseout', tooltip.hide)

    // Color legend on the right side (START)
    const legendWidth = 30;
    const legendHeight = Math.max(innerHeight / 2, 60); // Half the heatmap height, minimum 60px
    const legendX = innerWidth + margin.right / 2; // Position after right axis labels
    const legendY = 0; // Align with top of heatmap

    // Create 5 discrete color boxes
    const minVal = derivedScale[0];
    const maxVal = derivedScale[1];
    const range = maxVal - minVal;

    // Create gradient definition
    const gradientId = "legend-gradient-" + Math.random().toString(36).substr(2, 9);
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("y1", "100%") // bottom (low values)
        .attr("x2", "0%")
        .attr("y2", "0%"); // top (high values)

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#000080"); // navy (low)

    gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#ffffff"); // white (middle)

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#d73027"); // red (high)

    // Draw gradient rectangle
    g.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", `url(#${gradientId})`)
        .style("stroke", "#000")
        .style("stroke-width", "1px");

    // Legend axis (scale for the values)
    const legendScale = d3.scaleLinear()
        .domain(derivedScale)
        .range([legendHeight, 0]);

    // Create 5 tick values for the legend
    const numBoxes = 5;
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


    //################################################################
    // Top dendogram---------------------------------

    const dendoTooltip = d3tip()
        .style('border', 'solid 3px black')
        .style('background-color', 'white')
        .style('border-radius', '10px')
        .style('float', 'left')
        .style('color', '#000')
        .style('font-family', tooltip_fontFamily)
        .style('font-size', tooltip_fontSize)
        .html((event, d) => `
<div style='float: right; color: #000;'>
   Height:${d.source.data.height.toFixed(3)} <br/>
</div>`)



    if (clusterCols == true) {

        function transformY(data) {
            // console.log("height",height,colPadding)
            const ht = colPadding //height-500//-innerHeight;
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
        leafs.sort((a, b) => a.x - b.x)
        //const leafHeight = (width-margin.left)/ leafs.length// spacing between leaves
        const leafHeight = (width - margin.left - margin.right) / leafs.length // spacing between leaves (matches x_scale range)

        leafs.forEach((d, i) => d.x = i * leafHeight + leafHeight / 2)

        allNodes.forEach(node => {
            if (node.children) {
                node.x = d3.mean(node.children, d => d.x)
            }
        })


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
        root.links().forEach((link, i) => {
            svg
                .append("path")
                .attr("class", "link")
                .attr("stroke", link.source.color || `${colDendoColor}`)
                .attr("stroke-width", `${3}px`)
                .attr("fill", 'none')
                .attr("transform", `translate(${margin.left}, ${colDendroY}) rotate(180, ${colDendroRotateX}, ${colDendroRotateY})`)
                .attr("d", colElbow(link, colMaxHeight, margin.top, colNames2Lengths))
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
                transformX(d.source) +
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
            const height2 = margin.left - rowPadding; //padding = 60  
            // const height2 = margin.left - rowPadding;//padding = 60  

            // const height2 = margin.left - (rowLen+10);
            return height2 - (data.data.height / rowMaxHeight) * height2
        }

        const rowMaxHeight = root2.data.height + 2;
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
        console.log(`plot div provided in function parameters.divid:`, divid);


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

        // Call heatmap_plot with clustered matrix and labels
        await heatmap_plot({
            data: newMatrix2,
            rownames: rowNames2,
            colnames: colNames2,
            width: width - marginLeft - dynamicRightMargin,
            height: height - marginTop - dynamicBottomMargin,
            divid: divid // or another div id
        });
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
    irisDataButton.id = 'irisDataButton' + (hclustDt.data.divNum)
    irisDataButton.textContent = 'Load Iris Data'
    div.appendChild(irisDataButton);
    console.log("hclustUI: irisDataButton:", document.getElementById(irisDataButton.id))

    // file input Button
    const fileInput = document.createElement('input')
    fileInput.id = 'fileInput' + (hclustDt.data.divNum)
    fileInput.setAttribute('type', 'file')
    div.appendChild(fileInput);
    div.append(document.createElement('br'));
    div.append(document.createElement('br'));



    // create plot div
    const plotDiv = document.createElement("div")
    plotDiv.id = 'hcplotDiv' + (hclustDt.data.divNum) //'hcplotDiv'
    div.appendChild(plotDiv);
    console.log("hclustUI: plotDiv:", document.getElementById(plotDiv.id))

    // create textbox div
    const textBoxDiv = document.createElement("div")
    textBoxDiv.id = 'textBoxDiv' + (hclustDt.data.divNum)
    textBoxDiv.style.alignContent = "center"
    div.appendChild(textBoxDiv);
    console.log("hclustUI: textBoxDiv:", document.getElementById(textBoxDiv.id))

    // event listener for load file data buttons
    fileInput.addEventListener('change', (event) => {

        console.log(hclustDt.data.divNum, "fileInput button clicked!")

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

                        const data = (json.map(Object.values))
                        data['headers'] = json['headers']

                        hclustDt.data.file = []
                        hclustDt.data.file.json = json
                        hclustDt.data.file.csv = csv

                        // hclust plot and cluster by row/col buttons 

                        let clusterRows = false
                        let clusterCols = false

                        // cluster row button 
                        if (!document.getElementById('rowCluster' + (hclustDt.data.divNum))) {
                            let clusterRows = true

                            console.log("*********", !document.getElementById('rowCluster' + (hclustDt.data.divNum)))
                            const rowClusterButton = document.createElement('button')
                            rowClusterButton.id = 'rowCluster' + (hclustDt.data.divNum)
                            rowClusterButton.textContent = 'Cluster by Rows'
                            div.appendChild(rowClusterButton);
                            console.log("hclustUI: rowCluster:", document.getElementById(rowClusterButton.id))

                            // cluster col Button
                            const colClusterButton = document.createElement('button')
                            colClusterButton.id = 'colCluster' + (hclustDt.data.divNum)
                            colClusterButton.textContent = 'Cluster by Columns'
                            div.appendChild(colClusterButton);
                            div.append(document.createElement('br'));
                            div.append(document.createElement('br'));
                        }

                        console.log("load iris data button for Hclust clicked!")

                        hclust_plot({
                            data: hclustDt.data.file.json.map(obj => Object.values(obj)).map(row => row.slice(0, -1)), //numbers only, no species,
                            rownames: hclustDt.data.file.json.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
                            colnames: Object.keys(hclustDt.data.file.json[0]).slice(0, -1),
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
        if (!document.getElementById('rowCluster' + (hclustDt.data.divNum))) {
            let clusterRows = true

            console.log("*********", !document.getElementById('rowCluster' + (hclustDt.data.divNum)))
            const rowClusterButton = document.createElement('button')
            rowClusterButton.id = 'rowCluster' + (hclustDt.data.divNum)
            rowClusterButton.textContent = 'Cluster by Rows'
            div.appendChild(rowClusterButton);
            console.log("hclustUI: rowCluster:", document.getElementById(rowClusterButton.id))

            // cluster col Button
            const colClusterButton = document.createElement('button')
            colClusterButton.id = 'colCluster' + (hclustDt.data.divNum)
            colClusterButton.textContent = 'Cluster by Columns'
            div.appendChild(colClusterButton);
            div.append(document.createElement('br'));
            div.append(document.createElement('br'));
        }

        console.log("load iris data button for Hclust clicked!")

        //TO DO: fix add file button. The cluster button revert to the load iris data
        // hclust plot and text box
        hclust_plot({
            data: irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
            rownames: irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
            colnames: Object.keys(irisData[0]).slice(0, -1),
            divid: plotDiv.id,
            clusterCols: clusterCols,
            clusterRows: clusterRows
        })
        // textBox({ text: hclustDt.data.iris.csv, divid: textBoxDiv.id})

        document.getElementById('rowCluster' + (hclustDt.data.divNum)).addEventListener('click', async function () {
            console.log(document.getElementById('rowCluster' + (hclustDt.data.divNum)))
            console.log("clusterRows", clusterRows)

            if (clusterRows == false) {
                clusterRows = true
            } else if (clusterRows == true) {
                clusterRows = false
            }
            console.log("clusterRows", clusterRows)
            hclust_plot({
                data: irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
                rownames: irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
                colnames: Object.keys(irisData[0]).slice(0, -1),
                divid: plotDiv.id,
                clusterCols: clusterCols,
                clusterRows: clusterRows
            })
        })

        document.getElementById('colCluster' + (hclustDt.data.divNum)).addEventListener('click', async function () {
            console.log(document.getElementById('colCluster' + (hclustDt.data.divNum)))
            console.log("clusterCols", clusterCols)

            if (clusterCols == false) {
                clusterCols = true
            } else if (clusterCols == true) {
                clusterCols = false
            }
            console.log("clusterCols", clusterCols)

            hclust_plot({
                data: irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
                rownames: irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
                colnames: Object.keys(irisData[0]).slice(0, -1),
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