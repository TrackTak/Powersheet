import { DelegateInstance, delegate } from 'tippy.js'
import styles from './FormulaHelper.module.scss'
import isEmpty from 'lodash/isEmpty'
import {
  createFormulaList,
  createWrapperContent
} from './formulaHtmlElementHelpers'

type FormulaHelperClickHandler = (item: string) => void

class FormulaHelper {
  formulaHelperEl: HTMLDivElement
  formulaHelperListContainerEl: HTMLDivElement
  helper: DelegateInstance
  list?: HTMLUListElement

  /**
   *
   * @param formulas - The formulas that you want to be shown
   * under the cell.
   * @param onItemClick - A callback for when the user clicks
   * on a formula item.
   */
  constructor(
    public formulas: string[],
    public onItemClick: FormulaHelperClickHandler
  ) {
    const {
      formulaHelperListContainerEl,
      formulaHelperEl
    } = createWrapperContent()
    this.formulaHelperListContainerEl = formulaHelperListContainerEl
    this.formulaHelperEl = formulaHelperEl
    this.helper = delegate(formulaHelperEl, {
      target: styles.formulaHelper,
      arrow: false,
      placement: 'bottom',
      theme: 'formula-helper',
      interactive: true
    })
  }

  private handleListItemClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target?.matches('li')) {
      this.onItemClick(target.textContent!)
    }
  }

  private updateList(formulas: string[]) {
    const list = createFormulaList(formulas)
    if (this.list) {
      this.formulaHelperListContainerEl?.replaceChild(list, this.list)
    } else {
      this.formulaHelperListContainerEl.appendChild(list)
    }
    this.list = list
    this.helper.setContent(this.formulaHelperListContainerEl)

    list.addEventListener('click', this.handleListItemClick)
  }

  /**
   * Shows the formula helper.
   *
   * @param text - Filters for formulas that start with this text string
   */
  show(text?: string) {
    const formulas = this.formulas.filter(
      formula => !text || formula.startsWith(text)
    )
    if (isEmpty(formulas)) {
      this.helper.hide()
      return
    }
    this.updateList(formulas)
    this.helper.show()
  }

  /**
   * Hide the formula helper
   */
  hide() {
    this.helper.hide()
  }

  /**
   * Unregister's event listeners & removes all DOM elements.
   */
  destroy() {
    this.helper.destroy()
    this.formulaHelperEl.remove()
  }
}

export default FormulaHelper
