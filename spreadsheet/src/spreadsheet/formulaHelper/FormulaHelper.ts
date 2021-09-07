import { DelegateInstance, delegate } from 'tippy.js';
import styles from './FormulaHelper.module.scss';
import { prefix } from './../utils';
import isEmpty from 'lodash/isEmpty';

export const formulaHelperPrefix = `${prefix}-formula-helper`;

class FormulaHelper {
  formulaHelperContainerEl: HTMLDivElement;
  private formulaHelperEl: HTMLDivElement;
  private formulaHelperListContainerEl: HTMLDivElement;
  private helper: DelegateInstance;
  private list?: HTMLUListElement;

  constructor(private formulas: string[]) {
    this.formulaHelperListContainerEl = document.createElement("div");
    this.formulaHelperListContainerEl.classList.add(styles.formulaHelperListContainer);

    this.formulaHelperEl = document.createElement('div');
    this.formulaHelperEl.classList.add(styles.formulaHelper, formulaHelperPrefix);
    this.formulaHelperEl.appendChild(this.formulaHelperListContainerEl)

    this.formulaHelperContainerEl = document.createElement("div");
    this.formulaHelperContainerEl.appendChild(this.formulaHelperEl);

    this.formulas = formulas;
    this.helper = delegate(this.formulaHelperEl, {
      target: styles.formulaHelper,
      arrow: false,
      placement: 'bottom',
      theme: 'formula-helper',
      interactive: true,
    });
  }

  show(filterText?: string) {
    const formulas = this.formulas.filter(formula => !filterText || formula.startsWith(filterText));
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

  private updateList(formulas: string[]) {
    // this.list?.remove
    const list = document.createElement("ul");
    list.classList.add(styles.list);
    formulas.forEach((formula) => {
      const listItem = document.createElement("li");
      listItem.textContent = formula;
      list.appendChild(listItem);
    });
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
