import { defineConfig } from "vite";
import camelCase from "camelcase";
import * as path from "node:path";
import * as fs from "node:fs";
import dts from "vite-plugin-dts";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" assert { type: "json" };

const getEntry = () => {
	const tsxFile = path.resolve(__dirname, "src/index.tsx");
	if (fs.existsSync(tsxFile)) return tsxFile;
	const tsFile = path.resolve(__dirname, "src/index.ts");
	if (fs.existsSync(tsFile)) return tsFile;
	throw new Error("Cannot find entry. (src/index.tsx or src/index.ts)");
};

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		// eslint({ fix: true }), // not work?
		dts({ tsConfigFilePath: "./tsconfig.build.json", insertTypesEntry: true }),
	],
	build: {
		lib: {
			entry: getEntry(),
			name: camelCase(path.basename(pkg.name)),
			fileName: (format) => `index.${format}.js`,
		},
		rollupOptions: {
			external: ["react", "react-dom"],
			output: {
				globals: {
					react: "React",
					"react-dom": "ReactDOM",
				},
			},
		},
	},
});
