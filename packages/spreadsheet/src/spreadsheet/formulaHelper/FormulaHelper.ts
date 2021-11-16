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

  constructor(
    public formulas: string[],
    public onItemClick: FormulaHelperClickHandler
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

  show(filterText?: string) {
    const formulas = this.formulas.filter(
      formula => !filterText || formula.startsWith(filterText)
    )
    if (isEmpty(formulas)) {
      this.helper.hide()
      return
    }
    this.updateList(formulas)
    this.helper.show()
  }

  hide() {
    this.helper.hide()
  }

  destroy() {
    this.helper.destroy()
    this.formulaHelperEl.remove()
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

  handleListItemClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target?.matches('li')) {
      this.onItemClick(target.textContent!)
    }
  }
}

export default FormulaHelper
