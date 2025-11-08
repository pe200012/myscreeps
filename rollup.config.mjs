import clear from "rollup-plugin-clear";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import screeps from "rollup-plugin-screeps";
import { readFileSync } from "fs";

let cfg;
const dest = process.env.DEST;
if (!dest) {
    console.log("No destination specified - code will be compiled but not uploaded");
} else {
    const screepsConfig = JSON.parse(readFileSync("./screeps.json", "utf8"));
    cfg = screepsConfig[dest];
    if (cfg == null) {
        throw new Error("Invalid upload destination");
    }
}

export default {
    input: "src/main.ts",
    output: {
        file: "dist/main.js",
        format: "cjs",
        sourcemap: true,
    },

    plugins: [
        clear({ targets: ["dist"] }),
        resolve({ rootDir: "src" }),
        commonjs(),
        typescript({ tsconfig: "./tsconfig.json" }),
        screeps({ config: cfg, dryRun: cfg == null }),
    ],
};
