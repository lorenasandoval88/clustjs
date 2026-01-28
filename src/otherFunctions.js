// import {  d3 } from './imports.js'



const csvToJson =  async function (csv) {
// console.log("function info:", csv)
  const lines = csv.split(/\r?\n/);
  // //console.log("lines", lines)
  const headers = lines[0].split(',');
  // //console.log("headers", headers)
  const result = [];
  result.headers = headers;

  for (let i = 1; i < lines.length - 1; i++) {
    const obj = {};
    const currentLine = lines[i].split(',');

    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = convertStrToNumber(currentLine[j])
    }
    result.push(obj);
  }
  // //console.log("result", result)
  return result;
}

const convertStrToNumber = function (str) {
  // Check if the string is empty or null
  if (isNaN(str)) {
    return str; // It's a letter or other non-numeric character, return the original string
  } else {
    return Number(str); // It's a number (or can be converted to one), so convert it
  }
}

const removeNonNumbers = function (arr) {
  return arr.filter(element => typeof element === 'number');
}

const removeNumbers = function (arr) {
  return arr.filter(element => typeof element !== 'number');
}

const removeNonNumberValues = function (ob) {
  return ob.map(obj => {
    const newObj = {};
    for (const key in obj) {
      if (typeof obj[key] === 'number') {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  });
}

const removeNumberValues = function (ob) {
  return ob.map(obj => {
    const newObj = {};
    for (const key in obj) {
      if (typeof obj[key] !== 'number') {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  });
}

const asDataFrame = function (value) {
  //  //console.log("value",value)
  // check if value is array of objects (aoo)
  if (value === undefined || value === null)
    throw new Error("No data passed to function.");
  if (
    !Array.isArray(value) ||
    typeof value[0] !== "object" ||
    value[0] === null
  ) {
    throw new Error("First argument must be an array of objects");
  }

  const aoo = value;
  // columns: if parsed using d3, the aoo will already have a columns prop
  // -> create it otherwise
  if (!value.columns) {
    const set = new Set();
    for (const row of aoo) {
      for (const key of Object.keys(row)) set.add(key);
    }
    aoo.columns = [...set];
  }
  // create getters and setters for columns
  aoo.columns.forEach((column) => {
    if (!Object.getOwnPropertyDescriptor(aoo, column)) {
      Object.defineProperty(aoo, column, {
        get: function () {
          return this.map((row) => row[column]);
        },
        set: function (array) {
          if (!array) {
            throw new Error(`No data passed to set ${column} column.`);
          }
          if (array.length !== this.length) {
            throw new Error(
              `Data length (${array.length}) different from column ${column} length (${this.length}).`
            );
          }
          this.forEach((row, index) => (row[column] = array[index]));
        }
      });
    }
  });
  return aoo;
}

const scale = async function (Objects) {
  //console.log("function info:",pca.scale.toString())
  //Standardization (Z-score transformation)
  //Subtract the mean (μ) from each data point (x)
  //divide each result by the standard deviation (σ)

  const d3 = await import("d3");

  const clone = JSON.parse(JSON.stringify(Objects));
  const df = asDataFrame(clone);
  df.columns.forEach((column) => {
    const values = df[column];
    const mean = d3.mean(values);
    const sd = d3.deviation(values);
    df[column] = values.map((v) => {
      if (v !== null && v !== undefined) {
        return (v - mean) / sd;
      }
      return v;
    });
  });
  return df;
}

const createTableFromCSV = async function (csvData, tableId) {
  // console.log("csvData:", csvData);
  const table = document.getElementById(tableId);
  table.innerHTML = ""; // Clear existing table content
  const rows = csvData.split("\n");
// console.log("rows", rows)
  for (const row of rows) {
    const cells = row.split(",");
    const tr = document.createElement("tr");

    for (const cell of cells) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

const textBox = async function ( options = {}) {

  const {
    text: text = "No text provided",
    divid: divid = "",
    width: width = 460, //"auto",
    height: height = 150, //"auto",
    border: border = "2px solid",
    color: color = "red", //"auto",
  } = options;

// console.log("textBox options", options)
  // check if textbox div was provided in the function call
  if (document.getElementById(divid)) {
    console.log(`textbox div provided in function parameters.`);
    const div = document.getElementById(divid)
    div.id = divid
    div.style.display = "block"
    div.style.overflow = "scroll"
    div.style.width = width + 'px'
    div.style.height = height + 'px'
    div.style.border = border + " " + color//"2px solid blue"
    div.style.resize = "both"
    // div.style.alignContent = "left"
    // div.style.marginRight = "auto"
    // div.style.marginLeft = "auto"
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createElement('br'));

    //  console.log("div",div);

    createTableFromCSV(text, divid)

    // update textbox content
  } else if (document.getElementById("textboxDiv")) {
    console.log(`textbox div exists. updating contents...`);
    createTableFromCSV(text, "textboxDiv")

  } else {
    // Optionally, handle the case where the element doesn't exist
    console.log(`textbox div NOT provided in function parameters. creating div...`);
    const div = document.createElement("table")
    div.id = "textboxDiv"
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createElement('br'));
    div.appendChild(document.createElement('br'));
    document.body.appendChild(div);

    createTableFromCSV(text, "textboxDiv")
    div.style.display = "block"
    div.style.overflow = "scroll"
    div.style.width = width + 'px'
    div.style.height = height + 'px'
    div.style.border = border + " " + color//"2px solid blue"
    div.style.resize = "both"
    // div.style.alignContent = "left"
    // div.style.marginRight = "auto"
    // div.style.marginLeft = "auto"

  }

return document.getElementById("textboxDiv")
}


// let irisJSON 
// // retreive built-in iris dataset
//  await fetch('./sampleData/iris.csv')
//     .then(response => response.text())
//     .then(async response =>  {irisJSON =  await csvToJson(response)
//         // console.log("response", response)
//     })

// let irisCSV
// // retreive built-in iris dataset
//  await fetch('./sampleData/iris.csv')
//     .then(response => response.text())
//     .then(async response =>  {irisCSV =  response
//         // console.log("response", response)
//     })





export {
  // irisJSON,
  // irisCSV,
  csvToJson,
  convertStrToNumber,
  removeNonNumbers,
  removeNumbers,
  removeNonNumberValues,
  removeNumberValues,
  asDataFrame,
  scale,
  createTableFromCSV,
  textBox
}