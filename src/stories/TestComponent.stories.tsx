import type { Meta, StoryFn } from "@storybook/react";
import type React from "react";
import { TestComponent } from "../testComponent/testComponent";

// Define the props interface matching the one in testComponent.tsx
interface TestComponentProps {
	gridLineColor?: string;
	gridLineWidth?: number;
}

export default {
	title: "TestComponent",
	component: TestComponent,
	argTypes: {
		gridLineColor: {
			control: "color",
			description: "Color of the grid lines",
			defaultValue: "#555555",
		},
		gridLineWidth: {
			control: { type: "range", min: 0.5, max: 5, step: 0.5 },
			description: "Width of the grid lines",
			defaultValue: 1,
		},
	},
} as Meta<typeof TestComponent>;

const Template: StoryFn<typeof TestComponent> = (args: TestComponentProps) => (
	<TestComponent {...args} />
);

export const Default = Template.bind({});
Default.args = {
	gridLineColor: "#555555",
	gridLineWidth: 1,
};

export const CustomGrid = Template.bind({});
CustomGrid.args = {
	gridLineColor: "#3498db",
	gridLineWidth: 2,
};

export const BoldGrid = Template.bind({});
BoldGrid.args = {
	gridLineColor: "#e74c3c",
	gridLineWidth: 3,
};
