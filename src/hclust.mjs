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
// TODO: save scores not data in loacal sstorage
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
// const buildData = async function (matrix) {
//     let array = []
//     d3.range(matrix.length).map((d) => {
//         const o = d3.range(matrix[0].length).map((t) => ({
//             t: t,
//             n: d,
//             value: matrix[d][t]
//         }))
//         array = [...array, ...o]
//     })
//     return array
// }

const transpose = m => m[0].map((x, i) => m.map(x => x[i])) // for dendograms

// trim label lengths if they are greater than 8 characters
// function trimText(idx, arr) {
//     return idx.map(e => {
//         const str = String(arr[e]);
//         if (str.length > 12) {
//             return str.slice(0, 12) + "..."; // truncate to 12 characters + "..."
//         } else {
//             return str;
//         }
//     })
// }


export async function hclust_plot(options = {}) {
    console.log("RUNNING hclust_plot()-------------------------------")

    const {
        divid: divid = "",
        data: data = irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
        rowNames: rowNames = irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
        colNames: colNames = Object.keys(irisData[0]).slice(0, -1),
        width: width = 600,
        height: height = 1500,
        // dendograms
        clusterCols: clusterCols = true,
        clusterRows: clusterRows = true,
        clusteringDistanceRows: clusteringDistanceRows = "euclidean",
        clusteringDistanceCols: clusteringDistanceCols = "euclidean",
        clusteringMethodCols: clusteringMethodCols = "complete",
        clusteringMethodRows: clusteringMethodRows = "complete",
        marginTop: marginTop = clusterCols ? 100 : 53, // top margin (100) increased to accomodate top dendogram
        marginRight: marginRight = 0,
        marginBottom: marginBottom = 0,
        marginLeft: marginLeft = clusterRows ? 200 : 80, // left margin (200) increased to accomodate left dendogram
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
    console.log("*****************************")
    console.log("colIdx", colIdx)
    let rowIdx = clusterRows ? root2.leaves().map(x => x.data.index) : d3.range(data.length) //row clust
    console.log("rowIdx", rowIdx)
    const newMatrix2 = transpose(colIdx.map(i => transpose(rowIdx.map(e => data[e]))[i]))
    // reorder col/row Names according to clustering order, else return numeric indices [0,1,2,3...]
    let colNamesClust = colNames ? colIdx.map(i => colNames[i]) : Array.from(new Array(data[0].length), (x, i) => i + 1)
    let rowNamesClust = rowNames ? rowIdx.map(i => rowNames[i]) : Array.from(new Array(data.length), (x, i) => i + 1)
    console.log("colNamesClust", colNamesClust)
    console.log("rowNamesClust", rowNamesClust)





    // start of heatmap-------------------------
    // bottom labels: Calculate font size as half the heatmap cell width
    const cellWidth = (width - marginLeft - marginRight) / data[0].length;
    const labelFontSizeBottom = Math.min(Math.max(cellWidth / 6, 8), 20); // clamp between 8px and 20px

    // Calculate bottom margin based on longest column label and font size
    const maxColLabelLength = Math.min(d3.max(colNamesClust.map(c => String(c).length)), 13);
    const dynamicBottomMargin = Math.max(marginBottom, labelFontSizeBottom * maxColLabelLength * 0.5 + 5);
    // right labels: Calculate font size as half the heatmap cell height
    const cellHeight = (height - marginTop - dynamicBottomMargin) / data.length;

    const labelFontSizeRight = Math.min(Math.max(cellHeight / 3, 7), 20); // clamp between 7px and 20px
    // Calculate right margin based on longest row label and font size
    const maxRowLabelLength = Math.min(d3.max(rowNamesClust.map(r => String(r).length)), 13);
    const dynamicRightMargin = Math.max(200, labelFontSizeRight * maxRowLabelLength * 0.6 + 100); // 170 extra for legend

    const margin = ({
        top: marginTop,
        bottom: dynamicBottomMargin,
        left: marginLeft,
        right: dynamicRightMargin
    })

    // Call heatmap_plot with clustered matrix and labels
    const heatmapInnerHeight = height - margin.top - margin.bottom; // used for positioning dendograms next/above heatmap
    const heatmapInnerWidth = width - margin.left - margin.right; // only used in heatmap_plot


    // console.log("1: margin", margin)
    // console.log("HCLUST: ###########################################")
    // console.log("height:", height);
    // console.log("width:", width);
    // console.log("marginTop:", marginTop);
    // console.log("marginBottom:", marginBottom);
    // console.log("marginLeft:", marginLeft);
    // console.log("marginRight:", marginRight);
    // console.log("heatmapColorScale:", heatmapColorScale);
    // console.log("cellWidth-------:", cellWidth);
    // console.log("cellHeight:", cellHeight);
    // console.log("labelFontSizeBottom:", labelFontSizeBottom);
    // console.log("maxColLabelLength:", maxColLabelLength);
    // console.log("dynamicBottomMargin:", dynamicBottomMargin);
    // console.log("labelFontSizeRight:", labelFontSizeRight);
    // console.log("maxRowLabelLength:", maxRowLabelLength);
    // console.log("dynamicRightMargin:", dynamicRightMargin);
    // console.log("1: labelFontSizeBottom * maxColLabelLength * 0.5 + 5:", labelFontSizeBottom * maxColLabelLength * 0.5 + 5)
    // console.log("margin:", margin);
    // console.log("heatmapInnerHeight:", heatmapInnerHeight);
    // console.log("heatmapInnerWidth:", heatmapInnerWidth);
    // console.log("colNames", colNames) //['sepal_length', 'sepal_width', 'petal_length', 'petal_width']

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

    // Create the main group before appending myNewPlot
    const g = svg
        .append('g')
        // move the entire graph down and right to accomodate labels
        .attr('transform', `translate(${margin.left}, ${margin.top})`);


    // Heatmap #2: we create a new heatmap with the clustered data and append it to the main 'g' group
    let myNewPlot = await heatmap_plot({
        data: newMatrix2, // TODO: define names and matrix as one json input
        rowNames: rowNamesClust,
        colNames: colNamesClust,
        width: width - margin.left,
        height: height - margin.top,
    });
    // Append myNewPlot inside the main 'g' group so it aligns perfectly
    if (myNewPlot) {
        g.node().appendChild(myNewPlot);
    }

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
            const ht = colPadding //height-500//-heatmapInnerHeight;
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
                .attr("d", colElbow(link))
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
        const leafHeight2 = heatmapInnerHeight / leafs2.length
        leafs2.forEach((d, i) => d.x = i * leafHeight2 + leafHeight2 / 2)

        allNodes2.forEach(node => {
            if (node.children) {
                node.x = d3.mean(node.children, d => d.x)
            }
        })

        // Apply tooltip to our SVG
        svg.call(dendoTooltip)


        // row (left) dendrogram 
        root2.links().forEach((link, i) => {
            svg
                .append("path")
                .attr("class", "link")
                .attr("stroke", link.source.color || `${rowDendoColor}`)
                .attr("stroke-width", `${3}px`)
                .attr("fill", 'none')
                .attr(`transform`, `translate(0,${margin.top})`) // position row dendrogram at left edge of heatmap, below top dendrogram if present
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


export async function hclust_UI(options = {}) {
    console.log("RUNNING hclust_UI()-------------------------------");

    hclustDt.data.divNum += 1

}