import type { Meta, Story } from "@storybook/react";
import type React from "react";
import { TouchComponent } from "../testComponent/touchComponent";

export default {
	title: "TouchComponent",
	component: TouchComponent,
} as Meta;

const Template: Story = (args) => (
	<>
		<TouchComponent />
	</>
);

export const Primary = Template.bind({});
// Primary.args = {
//   children: "Primary",
//   variant: "primary",
// };
