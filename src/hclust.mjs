import * as d3 from "d3";
import d3tip from "d3-tip";
import * as hclust from "ml-hclust";
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

const toFiniteNumber = value => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string" && value.trim() !== "") {
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    return null;
}

const extractHclustInput = ({
    data,
    rowNames,
    colNames
}) => {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("hclust_plot() requires a non-empty data array.");
    }

    if (Array.isArray(data[0])) {
        return {
            data: data.map(row => row.map(value => toFiniteNumber(value))),
            rowNames,
            colNames
        };
    }

    if (typeof data[0] !== "object" || data[0] === null) {
        throw new Error("hclust_plot() data must be an array of arrays or an array of objects.");
    }

    const keys = Object.keys(data[0]);
    const numericColumnNames = keys.filter(key => data.some(row => toFiniteNumber(row[key]) !== null));

    if (numericColumnNames.length === 0) {
        throw new Error("hclust_plot() could not find any numeric columns in the provided data.");
    }

    const textColumnNames = keys.filter(key => data.some(row => typeof row[key] === "string" && row[key].trim() !== ""));
    const textColumnName = textColumnNames.length === 1 ? textColumnNames[0] : null;

    return {
        data: data.map(row => numericColumnNames.map(key => {
            return toFiniteNumber(row[key]);
        })),
        rowNames: rowNames ?? (textColumnName ? data.map((row, idx) => `${row[textColumnName]}${idx}`) : rowNames),
        colNames: colNames ?? numericColumnNames
    };
}

const resolveMissingFilterIndices = (matrix, removeMissingBy = "none") => {
    const rowIndices = d3.range(matrix.length);
    const colIndices = d3.range(matrix[0]?.length ?? 0);

    if (removeMissingBy === "row") {
        return {
            keptRowIndices: rowIndices.filter(rowIndex => matrix[rowIndex].every(value => value !== null)),
            keptColIndices: colIndices
        };
    }

    if (removeMissingBy === "col") {
        return {
            keptRowIndices: rowIndices,
            keptColIndices: colIndices.filter(colIndex => matrix.every(row => row[colIndex] !== null))
        };
    }

    return {
        keptRowIndices: rowIndices,
        keptColIndices: colIndices
    };
}

const materializeHclustInput = ({
    normalized,
    keptRowIndices,
    keptColIndices,
    missingFill = null
}) => ({
    data: keptRowIndices.map(rowIndex => keptColIndices.map(colIndex => {
        const value = normalized.data[rowIndex][colIndex];
        return (value === null || !Number.isFinite(value)) ? missingFill : value;
    })),
    rowNames: Array.isArray(normalized.rowNames)
        ? keptRowIndices.map(rowIndex => normalized.rowNames[rowIndex])
        : normalized.rowNames,
    colNames: Array.isArray(normalized.colNames)
        ? keptColIndices.map(colIndex => normalized.colNames[colIndex])
        : normalized.colNames
})

// Stage 1 (R's scale()): standardize each column using its OBSERVED values only.
// The mean and the sample standard deviation (n - 1 denominator, via d3.deviation) are
// computed from finite entries; missing entries stay null so an NA never becomes a number.
const scaleMatrixColumns = matrix => {
    const rowCount = matrix.length;
    const colCount = matrix[0]?.length ?? 0;

    const columnStats = d3.range(colCount).map(colIndex => {
        const observed = [];
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            const value = matrix[rowIndex][colIndex];
            if (value !== null && Number.isFinite(value)) observed.push(value);
        }
        return {
            mean: observed.length > 0 ? d3.mean(observed) : 0,
            sd: observed.length > 1 ? d3.deviation(observed) : 0
        };
    });

    return matrix.map(row => row.map((value, colIndex) => {
        if (value === null || !Number.isFinite(value)) return null;
        const { mean, sd } = columnStats[colIndex];
        // R-like: a zero/undefined SD (constant column) cannot produce a valid z-score, so the
        // value becomes missing (null) and is excluded from every pairwise distance.
        return sd > 0 ? (value - mean) / sd : null;
    }));
};

// Distance metrics supported by the missing-aware pairwise calculation. Anything else is
// rejected rather than silently treated as Euclidean (which would give wrong results for
// e.g. "maximum" or "canberra").
const SUPPORTED_DISTANCE_METRICS = new Set(["euclidean", "manhattan", "cityblock"]);

// Stage 2: build a full symmetric distance matrix using R's missing-value convention.
// Only dimensions observed in BOTH rows contribute; the accumulated difference is rescaled
// by P / q (total dimensions / jointly-observed dimensions) to compensate for the missing
// comparisons: d_ij = sqrt( (P / q_ij) * sum_{k in O_ij} (z_ik - z_jk)^2 ) for euclidean.
// Like R's dist(), a pair with no (or insufficient) jointly-observed dimensions yields NA;
// rather than invent a distance we stop with an error before clustering.
const pairwiseDistanceMatrix = (matrix, metric = "euclidean", minOverlapRatio = 0) => {
    if (!SUPPORTED_DISTANCE_METRICS.has(metric)) {
        throw new Error(`hclust_plot(): unsupported distance metric "${metric}". Supported metrics: euclidean, manhattan.`);
    }

    const rowCount = matrix.length;
    const totalDims = matrix[0]?.length ?? 0; // P
    const isManhattan = metric === "manhattan" || metric === "cityblock";

    const distances = Array.from({ length: rowCount }, () => new Array(rowCount).fill(0));
    const unavailablePairs = [];

    for (let i = 0; i < rowCount; i++) {
        for (let j = i + 1; j < rowCount; j++) {
            let accumulated = 0;
            let shared = 0; // q_ij: dimensions observed in both rows

            for (let k = 0; k < totalDims; k++) {
                const a = matrix[i][k];
                const b = matrix[j][k];
                // A dimension participates only when BOTH rows observed it.
                if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) continue;
                const diff = a - b;
                accumulated += isManhattan ? Math.abs(diff) : diff * diff;
                shared++;
            }

            const overlapRatio = totalDims > 0 ? shared / totalDims : 0;
            // shared === 0 is exact R behavior (dist() returns NA). The minOverlapRatio gate is a
            // stricter, opt-in extension; either way the pair is unavailable, not a real distance.
            if (shared === 0 || overlapRatio < minOverlapRatio) {
                unavailablePairs.push([i, j]);
                distances[i][j] = NaN;
                distances[j][i] = NaN;
                continue;
            }

            const correction = totalDims / shared; // P / q
            const value = isManhattan
                ? correction * accumulated
                : Math.sqrt(correction * accumulated);
            distances[i][j] = value;
            distances[j][i] = value;
        }
    }

    // Matching R's dist(), refuse to cluster on invented distances: if any pair has no (or
    // insufficient) jointly-observed dimensions, stop rather than fabricate a value.
    if (unavailablePairs.length > 0) {
        throw new Error(`hclust_plot(): ${unavailablePairs.length} pair(s) have no sufficient jointly-observed values; cannot compute a valid distance matrix.`);
    }

    return distances;
};



export async function hclust_plot(options = {}) {
    // console.log("RUNNING hclust_plot()-------------------------------")

    const {
        divId: divId = "",
        data: rawData = irisData,
        displayData: rawDisplayData = null,
        rowNames: inputRowNames,
        colNames: inputColNames,
        width: inputWidth,
        height: inputHeight,
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
        // heatmap color (array of 3 colors: low, middle, high)
        heatmapColor: heatmapColor = ['#000080', '#ffffff', '#d73027'],
        heatmapColorScale: heatmapColorScale = null,
        missingValue: missingValue = null,
        removeMissingBy: removeMissingBy = "none",
        // minimum jointly-observed overlap (q / P) required before a pairwise distance is
        // trusted; pairs below this ratio are treated as unavailable. 0 = no minimum (R behavior).
        minOverlapRatio: minOverlapRatio = 0,
        // when true (default) columns are standardized before clustering, matching R's
        // x_scaled <- scale(x); set false to cluster raw values like base hclust(dist(x)).
        scaleData: scaleData = true,
        // angle (degrees) for bottom column labels; -45 = vertical, -45 = diagonal, 0 = horizontal
        bottomLabelAngle: bottomLabelAngle = -45,
        // maximum characters shown for row/column tick labels before truncation with an ellipsis
        maxLabelLength: maxLabelLength = 20,
        // horizontal pixel offset applied to the color legend (positive moves it right)
        legendOffsetX: legendOffsetX = 10,//25,
        // hover tooltip
        tooltip_decimal: tooltip_decimal = 2,
        tooltip_fontFamily: tooltip_fontFamily = 'monospace',
        tooltip_fontSize: tooltip_fontSize = '14px',
        // interactivity
        interactive: interactive = true,
        zoomable: zoomable = true,
        showResetButton: showResetButton = true,
        hoverHighlight: hoverHighlight = true,
        clickSelect: clickSelect = true,
    } = options;
    const targetDivId = divId;


    //Normalize both matrices to ensure they are in the correct format and dimensions match. 'data' is used for clustering and 'displayData' is used for the heatmap (can be the same as 'data' if 'displayData' is not provided).
    const {
        data: rawMatrix,
        rowNames: rawRowNames,
        colNames: rawColNames
    } = extractHclustInput({
        data: rawData,
        rowNames: inputRowNames,
        colNames: inputColNames
    });

    // Stage 0: normalize the missing-value sentinel (e.g. -1) to null so a missing
    // measurement is never treated as a real number anywhere in the clustering pipeline.
    const nullifySentinel = matrix => (Number.isFinite(missingValue)
        ? matrix.map(row => row.map(value => (value === missingValue ? null : value)))
        : matrix);

    const nullifiedMatrix = nullifySentinel(rawMatrix);

    // Stage 1 (optional): scale each column from observed values only (R's scale()); NA stays
    // NA. When scaleData is false we cluster the raw values, like base hclust(dist(x)).
    const preparedMatrix = scaleData ? scaleMatrixColumns(nullifiedMatrix) : nullifiedMatrix;

    // When no explicit display matrix is supplied we show the prepared (scaled) values, like
    // R's pheatmap(x_scaled); otherwise we display precisely what the caller provided.
    const hasExplicitDisplayData = rawDisplayData !== null && rawDisplayData !== undefined;
    let displaySource;
    if (hasExplicitDisplayData) {
        const {
            data: rawDisplayMatrix,
            rowNames: rawDisplayRowNames,
            colNames: rawDisplayColNames
        } = extractHclustInput({
            data: rawDisplayData,
            rowNames: inputRowNames,
            colNames: inputColNames
        });

        //Validate dimensions match
        if (
            rawDisplayMatrix.length !== rawMatrix.length ||
            rawDisplayMatrix[0]?.length !== rawMatrix[0]?.length
        ) {
            throw new Error("displayData must have the same dimensions as data");
        }

        displaySource = {
            data: nullifySentinel(rawDisplayMatrix),
            rowNames: rawDisplayRowNames,
            colNames: rawDisplayColNames
        };
    } else {
        displaySource = {
            data: preparedMatrix,
            rowNames: rawRowNames,
            colNames: rawColNames
        };
    }

    const {
        keptRowIndices,
        keptColIndices
    } = resolveMissingFilterIndices(nullifiedMatrix, removeMissingBy);

    if (keptRowIndices.length === 0) {
        throw new Error(`hclust_plot() removeMissingBy="${removeMissingBy}" removed all rows.`);
    }

    if (keptColIndices.length === 0) {
        throw new Error(`hclust_plot() removeMissingBy="${removeMissingBy}" removed all columns.`);
    }

    // Clustering matrix keeps missing values as null so Stage 2 can skip them per pair.
    const {
        data,
        rowNames,
        colNames
    } = materializeHclustInput({
        normalized: {
            data: preparedMatrix,
            rowNames: rawRowNames,
            colNames: rawColNames
        },
        keptRowIndices,
        keptColIndices,
        missingFill: null
    });

    // Heatmap matrix keeps missing values as NaN so those cells render as "missing".
    const {
        data: displayData
    } = materializeHclustInput({
        normalized: displaySource,
        keptRowIndices,
        keptColIndices,
        missingFill: Number.NaN
    });

    const maxAutoSize = 500; // maximum size for auto-scaling to prevent excessively large plots
    const colCount = data[0]?.length ?? 0;
    const rowCount = data.length;
    const autoWidth = Math.min(maxAutoSize, Math.max(400, colCount * 18 + 260));
    const autoHeight = Math.min(maxAutoSize, Math.max(400, rowCount * 16 + 180));

    const targetDiv = targetDivId ? document.getElementById(targetDivId) : null;
    const clientWidth = targetDiv && Number.isFinite(targetDiv.clientWidth) && targetDiv.clientWidth > 0
        ? targetDiv.clientWidth
        : null;
    const cssWidth = targetDiv
        ? parseFloat(window.getComputedStyle(targetDiv).width)
        : NaN;
    const detectedContainerWidth = clientWidth ?? (Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : null);

    const width = Number.isFinite(inputWidth) && inputWidth > 0
        ? inputWidth
        : (detectedContainerWidth
            ? Math.min(maxAutoSize, Math.max(320, detectedContainerWidth - 24))
            : autoWidth);
    const height = Number.isFinite(inputHeight) && inputHeight > 0 ? inputHeight : autoHeight;

    console.log("hclust_plot dimensions:", { width, height });

    // 'data' is now the main matrix input
    // console.log("hclust_plot() data:", data)
    // Stage 2: pairwise distance matrices with R-style missing handling (only jointly
    // observed dimensions contribute, rescaled by P / q). Stage 3: agnes/hclust consumes them.
    const colDistanceMatrix = pairwiseDistanceMatrix(transpose(data), clusteringDistanceCols, minOverlapRatio);
    const rowDistanceMatrix = pairwiseDistanceMatrix(data, clusteringDistanceRows, minOverlapRatio);

    // dendograms--------------------
    const colHclustTree = new hclust.agnes(colDistanceMatrix, {
        method: clusteringMethodCols,
        isDistanceMatrix: true
    })
    const root = d3.hierarchy(colHclustTree)
    const clusterLayout = d3.cluster()
    clusterLayout(root)
    // console.log("colHclustTree", colHclustTree)


    const rowHclustTree2 = new hclust.agnes(rowDistanceMatrix, {
        method: clusteringMethodRows,
        isDistanceMatrix: true
    })
    const root2 = d3.hierarchy(rowHclustTree2)


    const clusterLayout2 = d3.cluster()
    clusterLayout2(root2)

    let colIdx = clusterCols ? root.leaves().map(x => x.data.index) : d3.range(data[0].length) //col clust
    // console.log("*****************************")
    // console.log("colIdx", colIdx)
    let rowIdx = clusterRows ? root2.leaves().map(x => x.data.index) : d3.range(data.length) //row clust
    // console.log("rowIdx", rowIdx)


    const clusteredMatrix = transpose(    colIdx.map(i => transpose(rowIdx.map(e => data[e]))[i]));

    const displayMatrix = transpose(    colIdx.map(i => transpose(rowIdx.map(e => displayData[e]))[i]));

    const validColNames = Array.isArray(colNames) && colNames.length === data[0].length
        ? colNames
        : Array.from(new Array(data[0].length), (x, i) => i + 1)
    const validRowNames = Array.isArray(rowNames) && rowNames.length === data.length
        ? rowNames
        : Array.from(new Array(data.length), (x, i) => i + 1)

    // reorder col/row Names according to clustering order
    let colNamesClust = colIdx.map(i => validColNames[i])
    let rowNamesClust = rowIdx.map(i => validRowNames[i])
    // console.log("colNamesClust", colNamesClust)
    // console.log("rowNamesClust", rowNamesClust)





    // start of heatmap-------------------------
    // bottom labels: Calculate font size as half the heatmap cell width
    const cellWidth = (width - marginLeft - marginRight) / data[0].length;
    const labelFontSizeBottom = Math.min(Math.max(cellWidth / 6, 8), 20); // clamp between 8px and 20px

    // Calculate bottom margin based on longest column label, font size, and label angle
    const maxColLabelLength = Math.min(d3.max(colNamesClust.map(c => String(c).length)), maxLabelLength);
    const bottomAngleRad = (Math.abs(bottomLabelAngle) * Math.PI) / 180;
    const bottomLabelTextWidth = labelFontSizeBottom * maxColLabelLength * 0.5;
    const dynamicBottomMargin = Math.max(
        marginBottom,
        Math.abs(Math.sin(bottomAngleRad)) * bottomLabelTextWidth + labelFontSizeBottom + 5
    );
    // right labels: Calculate font size as half the heatmap cell height
    const cellHeight = (height - marginTop - dynamicBottomMargin) / data.length;

    const labelFontSizeRight = Math.min(Math.max(cellHeight / 3, 7), 20); // clamp between 7px and 20px
    // Calculate right margin based on longest row label and font size
    const maxRowLabelLength = Math.min(d3.max(rowNamesClust.map(r => String(r).length)), maxLabelLength);
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

    // Zoom wrapper layer — everything inside zooms/pans together
    const zoomLayer = svg.append("g");

    // Create the main group before appending myNewPlot
    const g = zoomLayer
        .append('g')
        // move the entire graph down and right to accomodate labels
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.5, 8])
        .on("zoom", event => {
            zoomLayer.attr("transform", event.transform);
        });

    if (interactive && zoomable) {
        svg.call(zoom);
    }


    // Heatmap #2: we create a new heatmap with the clustered data and append it to the main 'g' group
 let myNewPlot = await heatmap_plot({
    data: displayMatrix,
    rowNames: rowNamesClust,
    colNames: colNamesClust,
    width: heatmapInnerWidth + margin.right,
    height: heatmapInnerHeight + margin.bottom,
    marginTop: 0,
    marginLeft: 0,
    marginRight: margin.right,
    marginBottom: margin.bottom,
    legendOffsetX,
    color: heatmapColor,
    colorScale: heatmapColorScale,
    missingValue: Number.NaN,
    bottomLabelAngle,
    maxLabelLength,
    hoverHighlight: interactive && hoverHighlight,
    clickSelect: interactive && clickSelect,
    mountToDOM: false,
});

    // Extract the inner <g> and <defs> from the heatmap SVG to avoid double-translation
    if (myNewPlot) {
        // Move defs (gradient) into hclust SVG so url(#id) references still resolve
        d3.select(myNewPlot).selectAll("defs").each(function() {
            svg.node().insertBefore(this, svg.node().firstChild);
        });
        const heatmapG = d3.select(myNewPlot).select("g").node();
        if (heatmapG) {
            g.node().appendChild(heatmapG);
        }
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
            // Flip vertically only: leaves (height 0) sit at the bottom, root at the top.
            // Do NOT use rotate(180) here, it would also mirror x and reverse the leaf order.
            return ht - (data.data.height / colMaxHeight) * ht;
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
        const leafHeight = heatmapInnerWidth / leafs.length // spacing between leaves (matches x_scale range)

        leafs.forEach((d, i) => d.x = i * leafHeight + leafHeight / 2)

        allNodes.forEach(node => {
            if (node.children) {
                node.x = d3.mean(node.children, d => d.x)
            }
        })


        // Apply tooltip to our SVG
        svg.call(dendoTooltip)
        // dendo columns
        // Position dendrogram so leaves are near heatmap top edge (vertical flip handled in transformY)
        // Add small gap (5px) between dendrogram leaves and heatmap
        const colDendroGap = 5;
        const colDendroY = margin.top - colPadding - colDendroGap;
        root.links().forEach((link, i) => {
            zoomLayer
                .append("path")
                .datum(link)
                .attr("class", "link")
                .attr("stroke", link.source.color || `${colDendoColor}`)
                .attr("stroke-width", `${3}px`)
                .attr("fill", 'none')
                .attr("transform", `translate(${margin.left}, ${colDendroY})`)
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
            zoomLayer
                .append("path")
                .datum(link)
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
    // Shared lock state for click-select (scoped to this plot instance)
    let lockedCell = null;

    const _mountPlot = (div) => {
        div.innerHTML = "";

        // Button bar
        const buttonBar = document.createElement("div");
        buttonBar.style.cssText = "display:flex;gap:6px;margin-bottom:4px;";

        if (interactive && zoomable && showResetButton) {
            const resetButton = document.createElement("button");
            resetButton.textContent = "Reset zoom";
            resetButton.style.cssText = "padding:3px 10px;cursor:pointer;";
            resetButton.onclick = () => {
                svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
            };
            buttonBar.appendChild(resetButton);
        }

        if (interactive && clickSelect) {
            const clearButton = document.createElement("button");
            clearButton.textContent = "Clear selection";
            clearButton.style.cssText = "padding:3px 10px;cursor:pointer;";
            clearButton.onclick = () => {
                lockedCell = null;
                d3.selectAll(".heatmap-cell")
                    .style("opacity", 1)
                    .style("stroke", "none");
            };
            buttonBar.appendChild(clearButton);
        }

        if (buttonBar.children.length > 0) div.appendChild(buttonBar);
        div.appendChild(svg.node());
    };

    if (document.getElementById(targetDivId)) {
        const div = document.getElementById(targetDivId);
        _mountPlot(div);

    } else if (!document.getElementById("childDiv")) {

        const currentDivNum = hclustDt.data.divNum;

        const div = document.createElement("div");
        div.id = targetDivId || 'hclust_plot' + currentDivNum;
        console.log("div  NOT provided in function options or doesn't exist... created a new div with id: ", div.id, "and appended to document body!");

        const plotsPanel = document.getElementById("plotsPanel");
        (plotsPanel || document.body).appendChild(div);
        _mountPlot(div);
        hclustDt.data.divNum = currentDivNum + 1;
    }
    // console.log("svg", svg.node())

    return svg.node()
}


export async function hclust_UI(options = {}) {
    console.log("RUNNING hclust_UI()-------------------------------");

    hclustDt.data.divNum += 1

}


