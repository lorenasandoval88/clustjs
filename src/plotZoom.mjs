import * as d3 from "d3";

// Shared d3-zoom wiring for all clustjs plots: wheel to zoom toward the cursor,
// drag to pan. Transforms `layer` while everything outside it (title, background)
// stays fixed. Exposes node.plotZoom.resetZoom(); the reset is applied
// synchronously (no transition) so it also works when rAF is throttled
// (e.g. background tabs).
export function attachPlotZoom(svg, layer, { enabled = true, scaleExtent = [0.5, 8] } = {}) {
    const zoom = d3.zoom()
        .scaleExtent(scaleExtent)
        .on("zoom", event => layer.attr("transform", event.transform));

    const resetZoom = () => {
        if (enabled) svg.call(zoom.transform, d3.zoomIdentity);
    };

    if (enabled) svg.call(zoom);

    svg.node().plotZoom = { enabled, resetZoom };
    return resetZoom;
}
