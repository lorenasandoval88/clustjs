import * as d3 from "d3";
import d3tip from "d3-tip";
import irisData from "./data/irisData.js";


// auxiliary function to convert a matrix to a data array
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

// trim label lengths if they are greater than 8 characters
function trimText(arr) {
  return arr.map(label => {
    const str = String(label);
    if (str.length > 8) {
      return str.slice(0, 8) + "...";
    }
    return str;
  });
}




export async function heatmap_plot(options = {}) {
  // console.log("heatmap options", options)
  console.log("RUNNING heatmap_plot()----------------------");

  const {
    divid: divid = "",
    matrix: matrix = irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
    rownames: rownames = irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
    colnames: colnames = Object.keys(irisData[0]).slice(0, -1),
    height: height = 900,
    width: width = 400,
    color: color = ['#000080', '#ffffff', '#d73027'], // navy (low) - white (middle) - red (high)//'#000080', //"#d62728",
    marginTop: marginTop = 10,
    marginBottom: marginBottom = 10,
    marginLeft: marginLeft = 10,
    marginRight: marginRight = 10,

    colorScale: colorScale = null,

  } = options

  // start of heatmap
  const flatValues = matrix.flat().filter(v => Number.isFinite(v));
  let derivedScale = colorScale;
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
    .range(color) // navy (low) - white (middle) - red (high)

  // bottom labels: Calculate font size as half the heatmap cell width
  const cellWidth = (width - marginLeft - marginRight) / matrix[0].length;
  console.log("cellWidth:", cellWidth)
  const labelFontSizeBottom = Math.max(cellWidth / 6, 8); // minimum 8px
  console.log("labelFontSizeBottom:", labelFontSizeBottom)

  // Calculate bottom margin based on trimmed label length (max 11 chars: 8 + "...")
  // Rotated labels need space: fontSize * charCount * 0.6 (char width) + 1.2em offset + padding
  const maxColLabelLength = Math.min(d3.max(colnames.map(c => String(c).length)), 11);
  console.log("maxColLabelLength:", maxColLabelLength)
  const dynamicBottomMargin = Math.max(marginBottom, labelFontSizeBottom * (maxColLabelLength * 0.5 ) + 5);
  console.log("dynamicBottomMargin:", dynamicBottomMargin)

  // right labels: Calculate font size as half the heatmap cell height
  const cellHeight = (height - marginTop - dynamicBottomMargin) / matrix.length;
  console.log("cellHeight:-------------------------", cellHeight)
  const labelFontSizeRight = Math.max(cellHeight / 3, 7); // minimum 7px
  console.log("labelFontSizeRight:", labelFontSizeRight)

  // Calculate right margin based on longest row label and font size
  const maxRowLabelLength = Math.min(d3.max(rownames.map(r => String(r).length)), 11);
  console.log("maxRowLabelLength:", maxRowLabelLength)
  const dynamicRightMargin = Math.max(marginRight, labelFontSizeRight * maxRowLabelLength * 0.6 +5);
console.log("dynamicRightMargin:", dynamicRightMargin)

  const margin = ({
    top: marginTop,
    bottom: dynamicBottomMargin,
    left: marginLeft,
    right: dynamicRightMargin
  });

  const innerHeight = height - margin.top - margin.bottom;
  const innerWidth = width - margin.left - margin.right;

  // Trim labels to 8 characters max (for display only)
  const trimmedColnames = trimText(colnames);
  const trimmedRownames = trimText(rownames);

  // Use indices for scale domain to avoid duplicate label issues
  const colIndices = d3.range(matrix[0].length);
  const rowIndices = d3.range(matrix.length);

  let x_scale = d3.scaleBand()
    .domain(colIndices)
    .range([0, innerWidth])
    .padding(0)

  let y_scale = d3.scaleBand()
    .domain(rowIndices)
    .range([0, innerHeight])
    .padding(0)


  // index of the rows based on cluster hierarchy
  const svg = d3
    .create("svg")

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

  //create x axis plus text labels (at bottom of heatmap)
  const x_axis = g.append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x_scale).tickFormat(i => trimmedColnames[i]))
    .style("font-size", labelFontSizeBottom + "px");


  x_axis.selectAll('.tick').selectAll('line').remove()
  x_axis.selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-2px")
    .attr("dy", "1.2em")
    .attr("transform", "rotate(-90)")
    .style("fill", "#000")

  //create y axis  plus text labels (at right of heatmap)
  let y_axis = g.append('g')
    .attr('transform', `translate( ${innerWidth},0)`)
    .call(d3.axisRight(y_scale).tickFormat(i => trimmedRownames[i]))
    .attr("id", "ya")
    .style("font-size", labelFontSizeRight + "px");

  y_axis.selectAll('.tick').selectAll('line').remove()
  y_axis.selectAll("text")
    .attr("dx", "3px")
    .attr("dy", "0.3em")
    .attr("class", "yaa")
    .style("fill", "#000")


  // interactive labels
  const tooltip = d3tip()
    .style('border', 'solid 2px black')
    .style('background-color', 'white')
    .style('color', '#000')
    .style('border-radius', '6px')
    .style('float', 'left')
    .style('font-family', 'monospace')
    .style("font-size", '10px')
    .html((event, d) => `
        <div style='float: right; color: #000;'>
           val:${d.value.toFixed(0)} <br/>
             row:${rownames[d.n]}, col:${(colnames[d.t])} 
        </div>`)
  svg.call(tooltip)

  // create squares
  const gPoints = g.append("g").attr("class", "gPoints");

  gPoints.selectAll()
    .data(await buildData(matrix))
    .enter()
    .append('rect')
    .attr('x', (d) => x_scale(d.t))
    .attr('y', (d) => y_scale(d.n))
    .attr('width', x_scale.bandwidth())
    .attr('height', y_scale.bandwidth())
    .attr('fill', (d) => color_scale(d.value))
    // show the tooltip when "mouseover"
    .on('mouseover', tooltip.show)
    // Hide the tooltip when "mouseout"
    .on('mouseout', tooltip.hide)

  // Here we add the svg to the plot div
  // Check if the div was provided in the function call
  if (document.getElementById(divid)) {
    console.log(`plot div provided in function parameters.divid:`, divid);
    const div = document.getElementById(divid)
    div.innerHTML = ""
    div.appendChild(svg.node())

  } else if (!document.getElementById("childDiv")) {
    // console.log(`pcaPlot div  NOT provided in function parameters or doesn't exist, creating div....`);
    const div = document.createElement("div")
    document.body.appendChild(div)
    div.appendChild(svg.node());
  }


  return svg.node()
}
