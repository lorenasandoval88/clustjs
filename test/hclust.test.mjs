// Unit tests for the pure (DOM-free) math in src/hclust.mjs.
// Reference values marked "R:" were computed with R's scale() / dist(), which this
// library intentionally mirrors (including the P/q missing-value rescaling convention).
//
// Run with: npm test  (node --test)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    toFiniteNumber,
    extractHclustInput,
    resolveMissingFilterIndices,
    scaleMatrixColumns,
    pairwiseDistanceMatrix,
    SUPPORTED_DISTANCE_METRICS,
    SUPPORTED_CLUSTERING_METHODS,
    hclust_plot
} from "../src/hclust.mjs";

const assertClose = (actual, expected, eps = 1e-12, msg) => {
    assert.ok(
        Math.abs(actual - expected) < eps,
        msg ?? `expected ${actual} to be within ${eps} of ${expected}`
    );
};

// ---------------------------------------------------------------- toFiniteNumber

test("toFiniteNumber: finite numbers pass through", () => {
    assert.equal(toFiniteNumber(5), 5);
    assert.equal(toFiniteNumber(-2.5), -2.5);
    assert.equal(toFiniteNumber(0), 0);
});

test("toFiniteNumber: numeric strings are parsed", () => {
    assert.equal(toFiniteNumber("3.14"), 3.14);
    assert.equal(toFiniteNumber(" 2 "), 2);
    assert.equal(toFiniteNumber("-7"), -7);
});

test("toFiniteNumber: non-numeric values become null (missing)", () => {
    assert.equal(toFiniteNumber("abc"), null);
    assert.equal(toFiniteNumber(""), null);
    assert.equal(toFiniteNumber("   "), null);
    assert.equal(toFiniteNumber(null), null);
    assert.equal(toFiniteNumber(undefined), null);
    assert.equal(toFiniteNumber(NaN), null);
    assert.equal(toFiniteNumber(Infinity), null);
    assert.equal(toFiniteNumber(-Infinity), null);
    assert.equal(toFiniteNumber({}), null);
    assert.equal(toFiniteNumber(true), null);
});

// ---------------------------------------------------------------- extractHclustInput

test("extractHclustInput: array of arrays coerces string numbers, keeps missing as null", () => {
    const { data } = extractHclustInput({
        data: [["1", "2"], ["3", "oops"], [5, null]]
    });
    assert.deepEqual(data, [[1, 2], [3, null], [5, null]]);
});

test("extractHclustInput: array of objects extracts numeric columns and names", () => {
    const { data, rowNames, colNames } = extractHclustInput({
        data: [
            { name: "a", x: 1, y: 2 },
            { name: "b", x: 3, y: 4 }
        ]
    });
    assert.deepEqual(data, [[1, 2], [3, 4]]);
    assert.deepEqual(colNames, ["x", "y"]);
    // single text column becomes rowNames, suffixed with the row index
    assert.deepEqual(rowNames, ["a0", "b1"]);
});

test("extractHclustInput: explicit row/col names are preserved", () => {
    const { rowNames, colNames } = extractHclustInput({
        data: [{ name: "a", x: 1 }, { name: "b", x: 2 }],
        rowNames: ["r1", "r2"],
        colNames: ["c1"]
    });
    assert.deepEqual(rowNames, ["r1", "r2"]);
    assert.deepEqual(colNames, ["c1"]);
});

test("extractHclustInput: empty or invalid data throws", () => {
    assert.throws(() => extractHclustInput({ data: [] }), /non-empty/);
    assert.throws(() => extractHclustInput({ data: null }), /non-empty/);
    assert.throws(() => extractHclustInput({ data: [5] }), /array of arrays or an array of objects/);
    assert.throws(() => extractHclustInput({ data: [{ a: "text" }] }), /numeric columns/);
});

// ---------------------------------------------------------------- resolveMissingFilterIndices

test("resolveMissingFilterIndices: 'none' keeps everything", () => {
    const m = [[1, null], [2, 3]];
    const { keptRowIndices, keptColIndices } = resolveMissingFilterIndices(m, "none");
    assert.deepEqual(keptRowIndices, [0, 1]);
    assert.deepEqual(keptColIndices, [0, 1]);
});

test("resolveMissingFilterIndices: 'row' drops rows containing missing values", () => {
    const m = [[1, null], [2, 3]];
    const { keptRowIndices, keptColIndices } = resolveMissingFilterIndices(m, "row");
    assert.deepEqual(keptRowIndices, [1]);
    assert.deepEqual(keptColIndices, [0, 1]);
});

test("resolveMissingFilterIndices: 'col' drops columns containing missing values", () => {
    const m = [[1, null], [2, 3]];
    const { keptRowIndices, keptColIndices } = resolveMissingFilterIndices(m, "col");
    assert.deepEqual(keptRowIndices, [0, 1]);
    assert.deepEqual(keptColIndices, [0]);
});

// ---------------------------------------------------------------- scaleMatrixColumns

test("scaleMatrixColumns: z-scores match R's scale()", () => {
    // R: scale(c(1,2,3)) -> -1, 0, 1  (sample sd, n-1 denominator)
    const scaled = scaleMatrixColumns([[1], [2], [3]]);
    assertClose(scaled[0][0], -1);
    assertClose(scaled[1][0], 0);
    assertClose(scaled[2][0], 1);
});

test("scaleMatrixColumns: mean/sd computed from observed values only, NA stays NA", () => {
    // R: scale(c(2,4,NA)) -> -0.7071068, 0.7071068, NA  (mean 3, sd sqrt(2))
    const scaled = scaleMatrixColumns([[2], [4], [null]]);
    assertClose(scaled[0][0], -0.7071067811865475);
    assertClose(scaled[1][0], 0.7071067811865475);
    assert.equal(scaled[2][0], null);
});

test("scaleMatrixColumns: constant column becomes all missing (zero sd)", () => {
    // R: scale(c(5,5,5)) -> NaN column; here that maps to null (missing)
    const scaled = scaleMatrixColumns([[5, 1], [5, 2], [5, 3]]);
    assert.deepEqual(scaled.map(r => r[0]), [null, null, null]);
    // the other column is still scaled normally
    assertClose(scaled[0][1], -1);
    assertClose(scaled[2][1], 1);
});

// ---------------------------------------------------------------- pairwiseDistanceMatrix

test("pairwiseDistanceMatrix: euclidean without missing matches R's dist()", () => {
    // R: dist(rbind(c(0,0), c(3,4))) -> 5
    const d = pairwiseDistanceMatrix([[0, 0], [3, 4]]);
    assertClose(d[0][1], 5);
    assertClose(d[1][0], 5);
    assert.equal(d[0][0], 0);
    assert.equal(d[1][1], 0);
});

test("pairwiseDistanceMatrix: manhattan without missing matches R's dist()", () => {
    // R: dist(rbind(c(0,0), c(3,4)), method="manhattan") -> 7
    const d = pairwiseDistanceMatrix([[0, 0], [3, 4]], "manhattan");
    assertClose(d[0][1], 7);
});

test("pairwiseDistanceMatrix: cityblock is an alias for manhattan", () => {
    const a = pairwiseDistanceMatrix([[0, 0], [3, 4]], "manhattan");
    const b = pairwiseDistanceMatrix([[0, 0], [3, 4]], "cityblock");
    assert.deepEqual(a, b);
});

test("pairwiseDistanceMatrix: missing values use R's P/q rescaling (euclidean)", () => {
    // R: dist(rbind(c(1,2,NA), c(1,3,5))) -> sqrt((3/2) * 1) = 1.224745
    const d = pairwiseDistanceMatrix([[1, 2, null], [1, 3, 5]]);
    assertClose(d[0][1], 1.224744871391589, 1e-12);
});

test("pairwiseDistanceMatrix: missing values use R's P/q rescaling (manhattan)", () => {
    // R: dist(rbind(c(1,2,NA), c(1,3,5)), method="manhattan") -> (3/2) * 1 = 1.5
    const d = pairwiseDistanceMatrix([[1, 2, null], [1, 3, 5]], "manhattan");
    assertClose(d[0][1], 1.5);
});

test("pairwiseDistanceMatrix: NaN entries are treated as missing like null", () => {
    const a = pairwiseDistanceMatrix([[1, 2, null], [1, 3, 5]]);
    const b = pairwiseDistanceMatrix([[1, 2, NaN], [1, 3, 5]]);
    assert.deepEqual(a, b);
});

test("pairwiseDistanceMatrix: result is symmetric with a zero diagonal", () => {
    const d = pairwiseDistanceMatrix([[1, 2, null], [1, 3, 5], [0, 0, 0]]);
    for (let i = 0; i < d.length; i++) {
        assert.equal(d[i][i], 0);
        for (let j = 0; j < d.length; j++) {
            assertClose(d[i][j], d[j][i]);
        }
    }
});

test("pairwiseDistanceMatrix: a pair with no jointly-observed dimensions throws (R: NA)", () => {
    assert.throws(
        () => pairwiseDistanceMatrix([[1, null], [null, 2]]),
        /jointly-observed/
    );
});

test("pairwiseDistanceMatrix: pairs below minOverlapRatio are rejected", () => {
    const rows = [[1, 2, null], [1, 3, 5]]; // shared 2 of 3 dims = 0.667
    assert.doesNotThrow(() => pairwiseDistanceMatrix(rows, "euclidean", 0.5));
    assert.throws(() => pairwiseDistanceMatrix(rows, "euclidean", 0.7), /jointly-observed/);
});

test("pairwiseDistanceMatrix: unsupported metric throws and lists supported ones", () => {
    assert.throws(() => pairwiseDistanceMatrix([[1], [2]], "canberra"), err => {
        assert.match(err.message, /unsupported distance metric "canberra"/);
        for (const metric of SUPPORTED_DISTANCE_METRICS) {
            assert.match(err.message, new RegExp(metric));
        }
        return true;
    });
});

// ---------------------------------------------------------------- method validation

test("hclust_plot: unknown clustering method is rejected before any rendering", async () => {
    await assert.rejects(
        hclust_plot({ data: [[1, 2], [3, 4]], clusteringMethodRows: "warde" }),
        err => {
            assert.match(err.message, /unsupported clusteringMethodRows "warde"/);
            for (const method of SUPPORTED_CLUSTERING_METHODS) {
                assert.match(err.message, new RegExp(method));
            }
            return true;
        }
    );
    await assert.rejects(
        hclust_plot({ data: [[1, 2], [3, 4]], clusteringMethodCols: 42 }),
        /unsupported clusteringMethodCols/
    );
});
