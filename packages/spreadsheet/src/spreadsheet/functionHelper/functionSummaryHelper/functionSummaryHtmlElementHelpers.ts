import './FunctionSummaryHelper.scss'
import { prefix } from '../../utils'

export const functionSummaryHelperPrefix = `${prefix}-function-summary-helper`

export interface IParameterSyntaxElement {
  element: HTMLSpanElement
  isInfiniteParameter: boolean
}

export const createWrapperContent = () => {
  const functionSummaryHelperContainerEl = document.createElement('div')
  const functionSummaryHelperEl = document.createElement('div')
  functionSummaryHelperEl.appendChild(functionSummaryHelperContainerEl)

  return {
    functionSummaryHelperContainerEl,
    functionSummaryHelperEl
  }
}

export const createMainHeader = (headerText: string, parameters: string[]) => {
  const mainHeaderEl = document.createElement('div')

  const headerEl = document.createElement('h1')
  headerEl.classList.add(`${functionSummaryHelperPrefix}-main-header`)
  headerEl.textContent = headerText
  mainHeaderEl.appendChild(headerEl)

  const parameterContainerEl = document.createElement('div')
  parameterContainerEl.classList.add(
    `${functionSummaryHelperPrefix}-parameters`
  )
  const openingBracketEl = document.createElement('span')
  openingBracketEl.textContent = '('
  parameterContainerEl.appendChild(openingBracketEl)
  const closingBracketEl = document.createElement('span')
  closingBracketEl.textContent = ')'
  const parameterSyntaxElements: IParameterSyntaxElement[] = []

  parameters.forEach((parameter, index) => {
    const parameterEl = document.createElement('span')
    parameterEl.classList.add(`${functionSummaryHelperPrefix}-parameter`)
    parameterEl.textContent = parameter
    parameterSyntaxElements.push({
      element: parameterEl,
      isInfiniteParameter: parameter.includes('[')
    })
    parameterContainerEl.appendChild(parameterEl)
    if (index !== parameters.length - 1) {
      const commaEl = document.createElement('span')
      commaEl.textContent = ', '
      parameterContainerEl.appendChild(commaEl)
    }
  })
  parameterContainerEl.appendChild(closingBracketEl)
  mainHeaderEl.appendChild(parameterContainerEl)

  return { mainHeaderEl, parameterSyntaxElements }
}

export const createButton = (buttonText: string) => {
  const button = document.createElement('button')
  button.classList.add(`${functionSummaryHelperPrefix}-button`)
  button.textContent = buttonText

  return { button }
}
