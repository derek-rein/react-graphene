import type { Meta, StoryFn } from "@storybook/react-vite";
import type { Decorator, StoryObj } from "@storybook/react-vite";
import React from "react";
import Background from "../components/background/background";
import { FunctionPlot, FunctionPlotGL } from "../components/plotLine";
import { ChartContext } from "../context/chartContext";

// Define func type expected by plot components
type PlotFunction = (x: number) => number;

// Type the props for ComparisonComponent
interface ComparisonComponentProps {
	func: PlotFunction;
	canvasColor?: string;
	glColor?: string;
	resolution?: number;
	lineWidth?: number;
}

// Wrapper component for the comparison
const ComparisonComponent = ({
	func,
	canvasColor = "#dc26ac",
	glColor = "#26dc57",
	resolution = 10,
	lineWidth = 1,
}: ComparisonComponentProps) => (
	<div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
		<h3 style={{ textAlign: "center", margin: "0 0 10px 0" }}>
			Canvas vs WebGL Function Plotting
		</h3>
		<div style={{ display: "flex", gap: "20px", width: "100%" }}>
			<div style={{ flex: 1 }}>
				<h4 style={{ textAlign: "center", margin: "0 0 5px 0" }}>
					Canvas Renderer
				</h4>
				<div
					style={{ width: "100%", height: "400px", border: "1px solid #444" }}
				>
					<ChartContext>
						<Background gridLineColor="#555555" gridLineWidth={1} />
						<FunctionPlot
							func={func}
							color={canvasColor}
							resolution={resolution}
							lineWidth={lineWidth}
						/>
					</ChartContext>
				</div>
			</div>
			<div style={{ flex: 1 }}>
				<h4 style={{ textAlign: "center", margin: "0 0 5px 0" }}>
					WebGL Renderer
				</h4>
				<div
					style={{ width: "100%", height: "400px", border: "1px solid #444" }}
				>
					<ChartContext>
						<Background gridLineColor="#555555" gridLineWidth={1} />
						<FunctionPlotGL
							func={func}
							color={glColor}
							resolution={resolution}
							lineWidth={lineWidth}
						/>
					</ChartContext>
				</div>
			</div>
		</div>
		<div
			style={{
				textAlign: "center",
				margin: "10px 0 0 0",
				fontSize: "0.9em",
				color: "#888",
			}}
		>
			Pan and zoom both charts to compare performance and rendering quality
		</div>
	</div>
);

// Define component metadata
const meta = {
	title: "Comparisons/Function Plotting",
	component: ComparisonComponent,
	parameters: {
		layout: "fullscreen",
		componentSubtitle: "Compare Canvas vs WebGL Function Plotting Performance",
	},
	argTypes: {
		func: { control: false },
		canvasColor: {
			control: "color",
			name: "Canvas Color",
			description: "Color for the Canvas renderer",
		},
		glColor: {
			control: "color",
			name: "WebGL Color",
			description: "Color for the WebGL renderer",
		},
		resolution: {
			control: { type: "range", min: 1, max: 50, step: 1 },
			description: "Resolution of the plots",
		},
		lineWidth: {
			control: { type: "range", min: 0.5, max: 5, step: 0.5 },
			description: "Width of the plotted lines",
		},
	},
	decorators: [
		(Story: StoryFn) => (
			<div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ComparisonComponent>;

// Sine wave comparison
export const SineWave: Story = {
	args: {
		func: (x: number) => Math.sin(x),
		canvasColor: "#dc26ac",
		glColor: "#26dc57",
		resolution: 10,
		lineWidth: 1.5,
	},
};

// Complex function comparison
export const ComplexFunction: Story = {
	args: {
		func: (x: number) =>
			Math.sin(x * 0.3) * Math.cos(x * 0.2) * Math.exp(-Math.abs(x / 20)),
		canvasColor: "#4dabcf",
		glColor: "#ff8c00",
		resolution: 15,
		lineWidth: 2,
	},
};

// Heavy computation function
export const HighResolutionPlot: Story = {
	args: {
		func: (x: number) => {
			// Compute-intensive function
			const iterations = 20;
			let result = 0;
			for (let i = 1; i <= iterations; i++) {
				result += Math.sin((x * i) / iterations) / i;
			}
			return result;
		},
		canvasColor: "#8a2be2",
		glColor: "#00bfff",
		resolution: 30,
		lineWidth: 1,
	},
};
