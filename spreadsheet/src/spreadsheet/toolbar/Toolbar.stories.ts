import { Story, Meta } from '@storybook/html';
import { defaultOptions, IOptions } from '../options';
import Toolbar from './Toolbar';
import { HyperFormula } from 'hyperformula';
import 'tippy.js/dist/tippy.css';
import '../tippy.scss';

export default {
  title: 'Toolbar',
} as Meta;

const Template: Story<IOptions> = () => {
  const registeredFunctionNames =
    HyperFormula.getRegisteredFunctionNames('enGB');
  const toolbar = new Toolbar(registeredFunctionNames);

  return toolbar.toolbarEl;
};

export const Default = Template.bind({});

Default.args = defaultOptions;
