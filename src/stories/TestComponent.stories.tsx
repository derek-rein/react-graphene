import type { Meta, Story } from "@storybook/react";
import type React from "react";
import { TestComponent } from "../testComponent/testComponent";

export default {
	title: "TestComponent",
	component: TestComponent,
} as Meta;

const Template: Story = (args) => (
	<>
		<button type="button">Click Me</button>
		<TestComponent />
	</>
);

export const Primary = Template.bind({});

Primary.args = {};
