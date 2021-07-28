import { Story, Meta } from '@storybook/html';
import Canvas from './Canvas';

export default {
  title: 'spreadsheet/sheetsGroup/sheet/Canvas',
  argTypes: {},
} as Meta;

const Template: Story<{}> = () => {
  const canvas = new Canvas();

  return canvas.container;
};

export const Default = Template.bind({});

Default.args = {};
