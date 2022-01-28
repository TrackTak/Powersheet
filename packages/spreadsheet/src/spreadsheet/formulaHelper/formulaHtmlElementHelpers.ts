import styles from './FormulaHelper.module.scss'
import { prefix } from '../utils'

export const formulaHelperPrefix = `${prefix}-formula-helper`

export const createFormulaList = (formulas: string[]) => {
  const list = document.createElement('ul')
  list.classList.add(styles.list, `${formulaHelperPrefix}-list`)
  formulas.forEach(formula => {
    const listItem = document.createElement('li')
    listItem.textContent = formula
    list.appendChild(listItem)
  })

  return list
}

export const createWrapperContent = () => {
  const formulaHelperListContainerEl = document.createElement('div')
  const formulaHelperEl = document.createElement('div')
  const tippyContainer = document.createElement('div')

  formulaHelperEl.appendChild(formulaHelperListContainerEl)
  formulaHelperEl.appendChild(tippyContainer)

  formulaHelperListContainerEl.classList.add(styles.formulaHelperListContainer)
  formulaHelperEl.classList.add(styles.formulaHelper)
  tippyContainer.classList.add(styles.tippyContainer)

  return {
    formulaHelperListContainerEl,
    formulaHelperEl,
    tippyContainer
  }
}
