// Shared plot-title renderer so every clustjs plot title looks identical:
// sans-serif, 16px, semibold, dark fill, centered at the given coordinates.
// Append to the plot's zoom layer so the title zooms/pans together with the plot.
export function addPlotTitle(svg, title, x, y) {
    if (!title) return null;
    return svg.append("text")
        .attr("class", "plot-title")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", "16px")
        .attr("font-weight", "600")
        .attr("fill", "#111111")
        .text(title);
}
