import React from 'react';
import { Story } from '@storybook/react';
import { TouchComponent } from '../testComponent/touchComponent';


export default {
    title: 'Touch Component',
    // component: TestComponent,
};

const Template: Story<any> = (args) => <>
    <TouchComponent />

</>;

export const Primary = Template.bind({});
// Primary.args = {
//   children: "Primary",
//   variant: "primary",
// };
