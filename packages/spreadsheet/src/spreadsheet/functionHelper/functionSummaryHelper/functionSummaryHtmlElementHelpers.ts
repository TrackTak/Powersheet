import './FunctionSummaryHelper.scss'
import { prefix } from '../../utils'

export const functionSummaryHelperPrefix = `${prefix}-function-summary-helper`

export const createWrapperContent = () => {
  const functionSummaryHelperContainerEl = document.createElement('div')
  const functionSummaryHelperEl = document.createElement('div')
  functionSummaryHelperEl.appendChild(functionSummaryHelperContainerEl)

  return {
    functionSummaryHelperContainerEl,
    functionSummaryHelperEl
  }
}

export const createMainHeader = (
  headerText: string,
  parameterText: string,
  inputText: string
) => {
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

  const currentParameterIndex = inputText.split(',').length - 1
  const parameterArray = parameterText.split(',')
  parameterArray.forEach((parameter, index) => {
    const parameterEl = document.createElement('span')
    if (currentParameterIndex === index) {
      parameterEl.classList.add(`${functionSummaryHelperPrefix}-highlight`)
    }
    parameterEl.textContent = parameter
    parameterContainerEl.appendChild(parameterEl)
    if (index !== parameterArray.length - 1) {
      const commaEl = document.createElement('span')
      commaEl.textContent = ', '
      parameterContainerEl.appendChild(commaEl)
    }
  })

  parameterContainerEl.appendChild(closingBracketEl)
  mainHeaderEl.appendChild(parameterContainerEl)

  return { mainHeaderEl }
}

export const createButton = (buttonText: string) => {
  const button = document.createElement('button')
  button.classList.add(`${functionSummaryHelperPrefix}-button`)
  button.textContent = buttonText

  return { button }
}
