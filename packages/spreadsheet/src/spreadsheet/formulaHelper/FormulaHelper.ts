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
   * @internal
   */
  constructor(
    private _formulas: string[],
    private _onItemClick: FormulaHelperClickHandler
  ) {
    const { formulaHelperListContainerEl, formulaHelperEl } =
      createWrapperContent()
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

  private _handleListItemClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target?.matches('li')) {
      this._onItemClick(target.textContent!)
    }
  }

  private _updateList(formulas: string[]) {
    const list = createFormulaList(formulas)
    if (this.list) {
      this.formulaHelperListContainerEl?.replaceChild(list, this.list)
    } else {
      this.formulaHelperListContainerEl.appendChild(list)
    }
    this.list = list
    this.helper.setContent(this.formulaHelperListContainerEl)

    list.addEventListener('click', this._handleListItemClick)
  }

  /**
   * Shows the formula helper.
   *
   * @param text - Filters for formulas that start with this text string
   */
  show(text?: string) {
    const formulas = this._formulas.filter(
      formula => !text || formula.startsWith(text)
    )
    if (isEmpty(formulas)) {
      this.helper.hide()
      return
    }
    this._updateList(formulas)
    this.helper.show()
  }

  /**
   * Hide the formula helper
   */
  hide() {
    this.helper.hide()
  }

  /**
   * @internal
   */
  _destroy() {
    this.helper.destroy()
    this.formulaHelperEl.remove()
  }
}

export default FormulaHelper
