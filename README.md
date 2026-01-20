# Welcome to clust.js!


Multivariate statistical visualization (clustering, correlation, heatmaps, etc) in JavaScript. 

live at: https://lorenasandoval88.github.io/statsjs

repo layout:

<img width="399" height="755" alt="image" src="https://github.com/user-attachments/assets/8c38acbd-9c11-40c4-a762-e9ebbd16425b" />



Demo: 
### Loading statsJs ES6 Modules:

`sdk = await import("https://lorenasandoval88.github.io/statsjs/sdk.js")`

### Loading the User Interface (UI):

`sdk.pca.loadUI()`

### Loading statsJs PCA plot only:

`sdk.pca.plot( {colors: ["#8C236A", "#4477AA"]} )`

    options can include the following (order is irrelevant) or be left empty:
    {
        divId: "as a string", 
        colors: [...list],
        data: data in JSON format,
        height: 100,
        width: 400
    }

### Loading statsJs textBox only:

define the text using the built in Iris data. 
`const csv = sdk. pca.data.iris.csv`

`sdk.textBox( {text: csv} )`

    options can include the following (order is irrelevant) or be left empty:
    {
        divId: "as a string", 
        text: data in csv or text format,
        height: 100,
        width: 400,
        border: "2px solid",
        color: "red"
    }
    
        
Further documentation can be found on the [wiki](https://github.com/lorenasandoval88/clust.js/wiki).
