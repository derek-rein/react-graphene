import type { Meta, StoryObj } from "@storybook/react";
import type React from "react";
import {
	TestComponent,
	TestComponentProps,
} from "../testComponent/testComponent";

const meta: Meta<typeof TestComponent> = {
	title: "TestComponent",
	component: TestComponent,
	argTypes: {
		gridLineColor: {
			control: "color",
			description: "Color of the grid lines",
		},
		gridLineWidth: {
			control: { type: "range", min: 0.5, max: 5, step: 0.5 },
			description: "Width of the grid lines",
		},
	},
	args: {
		gridLineColor: "#555555",
		gridLineWidth: 1,
	},
};

export default meta;
type Story = StoryObj<typeof TestComponent>;

export const Default: Story = {
	args: {
		gridLineColor: "#555555",
		gridLineWidth: 1,
	},
};

export const CustomGrid: Story = {
	args: {
		gridLineColor: "#3498db",
		gridLineWidth: 2,
	},
};

export const BoldGrid: Story = {
	args: {
		gridLineColor: "#e74c3c",
		gridLineWidth: 3,
	},
};
