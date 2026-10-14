// Shared plot-title renderer so every clustjs plot title looks identical:
// sans-serif, 16px, semibold, dark fill, centered at the given coordinates.
// Append to the static SVG root (never a zoom/pan layer) so the title stays
// fixed while the plot moves.
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
