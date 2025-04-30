import React from "react";
import { Meta, StoryObj } from "@storybook/react";
import { ChartContext } from "../context/chartContext";
import { FunctionPlotGL } from "../components/plotLine";
import Background from "../components/background/background";

// Define component metadata
const meta: Meta<typeof FunctionPlotGL> = {
	title: "Components/FunctionPlotGL",
	component: FunctionPlotGL,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		color: {
			control: "color",
			description: "Color of the function plot",
			defaultValue: "#dc26ac",
		},
		lineWidth: {
			control: { type: "range", min: 0.5, max: 5, step: 0.5 },
			description: "Width of the plotted line",
			defaultValue: 1,
		},
		resolution: {
			control: { type: "range", min: 1, max: 50, step: 1 },
			description: "Resolution of the plot (points per unit on x-axis)",
			defaultValue: 10,
		},
	},
	decorators: [
		(Story) => (
			<div style={{ width: "800px", height: "400px", margin: "0 auto" }}>
				<ChartContext>
					<Background gridLineColor="#555555" gridLineWidth={1} />
					<Story />
				</ChartContext>
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof FunctionPlotGL>;

// Sine function
export const Sine: Story = {
	args: {
		func: (x) => Math.sin(x),
		color: "#36cf4d",
		lineWidth: 1.5,
		resolution: 15,
	},
};

// Parabola
export const Parabola: Story = {
	args: {
		func: (x) => (x * x) / 10,
		color: "#4dabcf",
		lineWidth: 2,
		resolution: 10,
	},
};

// More complex function
export const Complex: Story = {
	args: {
		func: (x) => Math.sin(x) * Math.cos(x * 0.5) * Math.exp(-Math.abs(x / 10)),
		color: "#dc26ac",
		lineWidth: 1.5,
		resolution: 20,
	},
};

// Function with discontinuity
export const Discontinuous: Story = {
	args: {
		func: (x) => {
			if (Math.abs(x) < 0.001) return null;
			return 1 / x;
		},
		color: "#ff5733",
		lineWidth: 1,
		resolution: 30,
	},
};
