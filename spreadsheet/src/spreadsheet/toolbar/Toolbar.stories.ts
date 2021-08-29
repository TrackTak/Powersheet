import { Story, Meta } from '@storybook/html';
import { defaultOptions, IOptions } from '../options';
import Toolbar from './Toolbar';
import 'tippy.js/dist/tippy.css';

export default {
  title: 'Toolbar',
} as Meta;

const Template: Story<IOptions> = () => {
  const toolbar = new Toolbar();

  return toolbar.toolbarEl;
};

export const Default = Template.bind({});

Default.args = defaultOptions;
