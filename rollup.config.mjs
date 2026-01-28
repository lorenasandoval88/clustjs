import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/sdk.mjs",
  output: {
    file: "dist/sdk.mjs",
    format: "es",
    sourcemap: true,
    inlineDynamicImports: true
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    json(),
    terser()
  ]
};
