import { prefix } from './../spreadsheet/utils';
import { Spreadsheet } from '..';
import styles from './FunctionHelper.module.scss';

const functionHelperPrefix = `${prefix}-function-helper`;

class FunctionHelper {
  functionHelperEl!: HTMLDivElement;
  spreadsheet!: Spreadsheet;

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;

    this.functionHelperEl = document.createElement('div');
    this.functionHelperEl.classList.add(
      styles.functionHelper,
      `${functionHelperPrefix}`
    );
  }
}

export default FunctionHelper;
