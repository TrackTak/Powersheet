import { prefix } from '../utils'
import { IFunctionHelperData } from './FunctionHelper'

export const functionHelperPrefix = `${prefix}-function-helper`

export const createGroupHeader = (groupHeader: string) => {
  const groupHeaderEl = document.createElement('h3')
  groupHeaderEl.classList.add(`${functionHelperPrefix}-group-header`)
  groupHeaderEl.textContent = groupHeader

  return { groupHeaderEl }
}

export const createMainHeader = (headerText: string) => {
  const mainHeaderEl = document.createElement('h1')
  mainHeaderEl.classList.add(`${functionHelperPrefix}-main-header`)
  mainHeaderEl.textContent = headerText

  return { mainHeaderEl }
}

export const createHeader = (headerText: string) => {
  const header = document.createElement('h3')
  header.classList.add(`${functionHelperPrefix}-header`)
  header.textContent = headerText

  return { header }
}

export const createSubHeader = (headerText: string) => {
  const subHeader = document.createElement('h5')
  subHeader.classList.add(`${functionHelperPrefix}-sub-header`)
  subHeader.textContent = headerText

  return { subHeader }
}

export const createCodeText = (codeText: string) => {
  const codeEl = document.createElement('p')
  const code = document.createElement('code')
  code.classList.add(`${functionHelperPrefix}-code`)
  code.textContent = codeText

  codeEl.appendChild(code)

  return { codeEl, code }
}

export const createParagraph = (paragraph: string) => {
  const paragraphEl = document.createElement('p')
  paragraphEl.classList.add(`${functionHelperPrefix}-paragraph`)
  paragraphEl.textContent = `${paragraph}`

  return { paragraphEl }
}

export const createSyntaxListItem = (
  codeText: string,
  description?: string
) => {
  const listItem = document.createElement('li')
  listItem.classList.add(`${functionHelperPrefix}-list-item`)

  const codeDescriptionEl = document.createElement('p')
  const codeStyle = document.createElement('code')

  codeStyle.textContent = codeText

  if (description) {
    codeDescriptionEl.textContent = ` - ${description}`
    codeDescriptionEl.classList.add(`${functionHelperPrefix}-paragraph`)
  }

  codeStyle.classList.add(`${functionHelperPrefix}-code-style`)

  listItem.appendChild(codeDescriptionEl)
  codeDescriptionEl.prepend(codeStyle)

  return { listItem, codeDescriptionEl, codeStyle }
}

export const createFunctionGroupSection = (name: string) => {
  const section = document.createElement('section')
  section.classList.add(`${functionHelperPrefix}-section`)

  const header = document.createElement('h2')
  header.classList.add(`${functionHelperPrefix}-section-header`)
  header.textContent = name
  section.appendChild(header)

  return { section }
}

export const createFunctionItem = (functionMetadata: IFunctionHelperData) => {
  const functionItem = document.createElement('div')
  functionItem.classList.add(`${functionHelperPrefix}-function-item-wrapper`)

  const content = document.createElement('div')
  content.classList.add(`${functionHelperPrefix}-function-item-content`)

  const nameEl = document.createElement('span')
  nameEl.classList.add(`${functionHelperPrefix}-function-item-name`)
  nameEl.textContent = functionMetadata.header
  content.appendChild(nameEl)

  const parameterEl = document.createElement('span')
  parameterEl.textContent = `${
    functionMetadata.header
  }(${functionMetadata.parameters?.join(',')})`
  parameterEl.classList.add(`${functionHelperPrefix}-function-item-parameter`)
  content.appendChild(parameterEl)

  const arrowIcon = document.createElement('span')
  arrowIcon.classList.add(`${functionHelperPrefix}-function-item-icon`)
  content.appendChild(arrowIcon)

  functionItem.appendChild(content)

  return { functionItem }
}
