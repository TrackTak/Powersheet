import { DelegateInstance, delegate } from 'tippy.js';
import styles from './FormulaHelper.module.scss';
import isEmpty from 'lodash/isEmpty';
import {
  createFormulaList,
  createWrapperContent,
} from './formulaHtmlElementHelpers';

class FormulaHelper {
  formulaHelperEl: HTMLDivElement;
  private formulaHelperListContainerEl: HTMLDivElement;
  private helper: DelegateInstance;
  private list?: HTMLUListElement;

  constructor(private formulas: string[]) {
    const { formulaHelperListContainerEl, formulaHelperEl } =
      createWrapperContent();
    this.formulaHelperListContainerEl = formulaHelperListContainerEl;
    this.formulaHelperEl = formulaHelperEl;
    this.formulas = formulas;
    this.helper = delegate(formulaHelperEl, {
      target: styles.formulaHelper,
      arrow: false,
      placement: 'bottom',
      theme: 'formula-helper',
      interactive: true,
    });
  }

  show(filterText?: string) {
    const formulas = this.formulas.filter(
      (formula) => !filterText || formula.startsWith(filterText)
    );
    if (isEmpty(formulas)) {
      this.helper.hide();
      return;
    }
    this.updateList(formulas);
    this.helper.show();
  }

  hide() {
    this.helper.hide();
  }

  destroy() {
    this.helper.destroy();
    this.formulaHelperEl.remove();
  }

  private updateList(formulas: string[]) {
    const list = createFormulaList(formulas);
    if (this.list) {
      this.formulaHelperListContainerEl?.replaceChild(list, this.list);
    } else {
      this.formulaHelperListContainerEl.appendChild(list);
    }
    this.list = list;
    this.helper.setContent(this.formulaHelperListContainerEl);
  }
}

export default FormulaHelper;
