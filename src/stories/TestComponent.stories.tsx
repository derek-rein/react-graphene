import React from "react";
import {TestComponent} from "../components";
import { Story } from "@storybook/react";


export default {
  title: "Test Component",
  // component: TestComponent,
};

const Template: Story<any> = args => <TestComponent />;

export const Primary = Template.bind({});
// Primary.args = {
//   children: "Primary",
//   variant: "primary",
// };

