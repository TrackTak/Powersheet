import tippy, { Instance, Props } from 'tippy.js'
import isEmpty from 'lodash/isEmpty'
import {
  createFormulaList,
  createWrapperContent
} from './formulaHtmlElementHelpers'
import { HyperFormula } from '@tracktak/hyperformula'

type FormulaHelperClickHandler = (item: string) => void

class FormulaHelper {
  formulaHelperEl: HTMLDivElement
  formulaHelperListContainerEl: HTMLDivElement
  helper: Instance<Props>
  list?: HTMLUListElement

  /**
   * @internal
   */
  constructor(private _onItemClick: FormulaHelperClickHandler) {
    const {
      formulaHelperEl,
      tippyContainer,
      formulaHelperListContainerEl
    } = createWrapperContent()
    this.formulaHelperListContainerEl = formulaHelperListContainerEl
    this.formulaHelperEl = formulaHelperEl
    this.helper = tippy(tippyContainer, {
      placement: 'bottom-start',
      offset: [0, 0],
      interactive: true,
      arrow: false,
      theme: 'formula-helper',
      trigger: 'manual'
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
    const hfFormulas = HyperFormula.getRegisteredFunctionNames('enGB')
    const formulas = hfFormulas.filter(
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
