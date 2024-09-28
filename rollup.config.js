import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.js",
  output: {
    file: "bin/binance-fetch.js",
    format: "es",
    banner: "#!/usr/bin/env node",
  },
  plugins: [nodeResolve()],
  external: [/node_modules/],
};
