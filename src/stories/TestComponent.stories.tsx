import React from 'react';
import { Story } from '@storybook/react';
import { TestComponent } from '../testComponent';

export default {
    title: 'Test Component',
    // component: TestComponent,
};

const Template: Story<any> = (args) => <>
<button>Click Me</button>
    <TestComponent />

</>;

export const Primary = Template.bind({});
// Primary.args = {
//   children: "Primary",
//   variant: "primary",
// };
