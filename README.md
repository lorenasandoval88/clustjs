# Welcome to clustJs!


Multivariate statistical visualization (clustering, correlation, heatmaps, etc) in JavaScript. 

live at: https://lorenasandoval88.github.io/clustjs

repo layout:

<img width="499" height="795" alt="image" src="https://github.com/user-attachments/assets/8c38acbd-9c11-40c4-a762-e9ebbd16425b" />



Demo: 



### Loading statsJs PCA plot UI:

sdk = await import("https://lorenasandoval88.github.io/clustjs/sdk.js")

sdk.pca_UI( {colors: ["#8C236A", "#4477AA"]} )

    options can include the following (order is irrelevant) or be left empty:
    
    {
        divId: "as a string", 
        colors: [...list],
        data: data in JSON format,
        height: 100,
        width: 400
    }

<img width="499" height="532" alt="image" src="https://github.com/user-attachments/assets/2739074d-12a4-4e5e-ae79-b96b68f73295" />

    
        
Further documentation can be found on the [wiki](https://github.com/lorenasandoval88/clustjs/wiki).
