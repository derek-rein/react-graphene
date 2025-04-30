import type { Meta, StoryObj } from "@storybook/react";
import { DataPlot, FunctionPlot } from "../components";
import { ChartContext } from "../context/chartContext";

interface PlotDemoProps {
	component: "data" | "function" | "both";
	dataColor?: string;
	functionColor?: string;
	lineWidth?: number;
	functionResolution?: number;
}

const sampleData = [
	{ x: 1, y: 10 },
	{ x: 2, y: 20 },
	{ x: 3, y: 15 },
	{ x: 4, y: 25 },
	{ x: 5, y: 30 },
	{ x: 6, y: 28 },
	{ x: 7, y: 32 },
	{ x: 8, y: 24 },
	{ x: 9, y: 18 },
	{ x: 10, y: 22 },
];

// Sample function: sin(x) + random noise
const sampleFunction = (x: number) => Math.sin(x) + Math.cos(x / 2) * 0.5;

// Component to wrap our plots in the ChartContext
const PlotDemo = ({
	component,
	dataColor = "#26dc57",
	functionColor = "#dc26ac",
	lineWidth = 1,
	functionResolution = 10,
}: PlotDemoProps) => {
	return (
		<div style={{ width: "800px", height: "400px" }}>
			<ChartContext>
				{component === "data" || component === "both" ? (
					<DataPlot data={sampleData} color={dataColor} lineWidth={lineWidth} />
				) : null}

				{component === "function" || component === "both" ? (
					<FunctionPlot
						func={sampleFunction}
						color={functionColor}
						lineWidth={lineWidth}
						resolution={functionResolution}
					/>
				) : null}
			</ChartContext>
		</div>
	);
};

// Storybook configuration
const meta: Meta<typeof PlotDemo> = {
	title: "Plots/Graph Plots",
	component: PlotDemo,
	parameters: {
		layout: "centered",
	},
	argTypes: {
		component: {
			control: "radio",
			options: ["data", "function", "both"],
			description: "The type of plot to display",
			defaultValue: "both",
		},
		dataColor: {
			control: "color",
			description: "Color of the data line",
		},
		functionColor: {
			control: "color",
			description: "Color of the function line",
		},
		lineWidth: {
			control: { type: "range", min: 0.5, max: 5, step: 0.5 },
			description: "Width of the lines",
		},
		functionResolution: {
			control: { type: "range", min: 1, max: 50, step: 1 },
			description: "Resolution of function plotting (points per unit)",
		},
	},
};

export default meta;
type Story = StoryObj<typeof PlotDemo>;

// Define specific story variants
export const DataPlotDemo: Story = {
	args: {
		component: "data",
		dataColor: "#26dc57",
		lineWidth: 1.5,
	},
};

export const FunctionPlotDemo: Story = {
	args: {
		component: "function",
		functionColor: "#dc26ac",
		lineWidth: 1.5,
		functionResolution: 20,
	},
};

export const CombinedPlotDemo: Story = {
	args: {
		component: "both",
		dataColor: "#26dc57",
		functionColor: "#dc26ac",
		lineWidth: 1.5,
		functionResolution: 20,
	},
};
