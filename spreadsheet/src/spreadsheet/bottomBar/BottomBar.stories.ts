import { Story, Meta } from '@storybook/html';
import BottomBar, { IBottomBar } from './BottomBar';

export default {
  title: 'Components/BottomBar',
} as Meta;

const Template: Story<IBottomBar> = (args: any) => {
  const bottomBar = new BottomBar();

  return bottomBar.element;
};

export const Default = Template.bind({});
Default.args = {};
