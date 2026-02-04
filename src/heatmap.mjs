import * as d3 from "d3";
import d3tip from "d3-tip";
import irisData from "./data/irisData.js";


// auxiliary function to convert a matrix to a data array
const buildData = async function(matrix)  {
  let array = []
  d3.range(matrix.length).map((d) => {
    const o = d3.range(matrix[0].length).map((t) => ({
      t: t,
      n: d,
      value: matrix[d][t]
    }))
    array = [...array,...o]
  })
  return array
}




export async function  heatmap_plot(options = {}){
  // console.log("heatmap options", options)
console.log("RUNNING heatmap_plot()----------------------");

  const {
    divid: divid = "",

    matrix: matrix = irisData.map(obj => Object.values(obj)).map(row => row.slice(0, -1)),
    rownames: rownames = irisData.map(obj => Object.values(obj)).map((d, idx) => d[4] + idx),
    colnames: colnames = Object.keys(irisData[0]).slice(0, -1),
    height: height = 900,
    width: width = 400,
    color: color = "green", //"#d62728",
    marginLeft: marginLeft = 50,
    marginRight: marginRight = 10,
    colorScale: colorScale = [0, 8],

  } =  options

  const color_scale = d3.scaleLinear()
  .domain(colorScale)
  .range(['#000', `${color}`])


 const margin = ({ 
    top: 53,
    bottom: 10,
    left: marginLeft,
    right: marginRight
  });


    // index of the rows based on cluster hierarchy
    const svg = d3
      .create("svg")
     
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
     
     let y_scale = d3.scaleBand()
    .domain(rownames)
    .range([ 0, height-  margin.top])
     
    let x_scale = d3.scaleBand()
    .domain(colnames)
    .range([0, width-margin.left-margin.right])
  
  const txtLengths = d3.selectAll("text").nodes().map( n => n.getComputedTextLength())
  // console.log("txtLengths",txtLengths)
     
  // Set SVG size and add solid white background
  svg
    .attr('width', width)
    .attr('height', height);

  svg.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', height)
    .attr('fill', '#ffffff');

  const g = svg
    .append('g')
    .attr('transform', `translate(${margin.left+margin.right}, ${margin.top+margin.bottom})`)
     
  //create x axis
  const x_axis = g.append('g')
      .call(d3.axisTop(x_scale))
  x_axis.selectAll('.tick').selectAll('line').remove()
  x_axis.selectAll("text")
    .style("text-anchor", "start")
    .attr("dx", "2px")
    .attr("dy", "1.1em")
    .attr("transform", "rotate(-90)") 
    .style("fill", "#000")
     
  //create y  axes
  let y_axis = g.append('g')
    .call(d3.axisLeft(y_scale))
    .attr("id", "ya")

  y_axis.selectAll('.tick').selectAll('line').remove()
  y_axis.selectAll("text")
    .attr("dx", "3px")
    .attr("dy", "0.3em")
    .attr("class", "yaa")
    .style("fill", "#000")
  
// console.log("y_axis", y_axis)
// console.log("x_axis", x_axis)
// console.log("buildData(matrix)", buildData(matrix))

   // create squares
   const gPoints = g.append("g").attr("class", "gPoints");

   gPoints.selectAll()
      .data(await buildData(matrix))
      .enter()
      .append('rect')
      .attr('x', (d) => x_scale(colnames[d.t]))
      .attr('y', (d) => y_scale(rownames[d.n]))
      .attr('width', width/matrix[0].length)
      .attr('height', height/matrix.length)
      .attr('fill', (d) => color_scale(d.value))
        // show the tooltip when "mouseover"
      .on('mouseover', tooltip.show)
        // Hide the tooltip when "mouseout"
        .on('mouseout', tooltip.hide) 
     
    // Here we add the svg to the plot div
  // Check if the div was provided in the function call
  if (document.getElementById(divid)) {
    console.log(`plot div provided in function parameters.divid:`,divid);
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

