import { prefix } from '../utils'
import styles from './FunctionHelper.module.scss'

export const functionHelperPrefix = `${prefix}-function-helper`

export const createMainHeader = (headerText: string) => {
  const mainHeaderEl = document.createElement('h1')
  mainHeaderEl.classList.add(styles.headerEl, `${functionHelperPrefix}`)
  mainHeaderEl.textContent = headerText

  return { mainHeaderEl }
}

export const createHeader = (headerText: string) => {
  const header = document.createElement('h3')
  header.classList.add(styles.header, `${functionHelperPrefix}`)
  header.textContent = headerText

  return { header }
}

export const createSubHeader = (headerText: string) => {
  const subHeader = document.createElement('h5')
  subHeader.classList.add(styles.subHeader, `${functionHelperPrefix}`)
  subHeader.textContent = headerText

  return { subHeader }
}

export const createCodeText = (codeText: string) => {
  const codeEl = document.createElement('p')
  const code = document.createElement('code')
  code.classList.add(styles.code, `${functionHelperPrefix}`)
  code.textContent = codeText

  codeEl.appendChild(code)

  return { codeEl, code }
}

export const createParagraph = (paragraph: string) => {
  const paragraphEl = document.createElement('p')
  paragraphEl.classList.add(styles.paragraphEl, `${functionHelperPrefix}`)
  paragraphEl.textContent = `${paragraph}`

  return { paragraphEl }
}

export const createSyntaxListItem = (
  codeText: string,
  description?: string
) => {
  const listItem = document.createElement('li')
  listItem.classList.add(styles.list, `${functionHelperPrefix}`)

  const codeDescriptionEl = document.createElement('p')
  const codeStyle = document.createElement('code')

  codeStyle.textContent = codeText

  if (description) {
    codeDescriptionEl.textContent = ` - ${description}`
  }

  codeStyle.classList.add(styles.code, `${functionHelperPrefix}`)

  listItem.appendChild(codeDescriptionEl)
  codeDescriptionEl.prepend(codeStyle)

  return { listItem, codeDescriptionEl, codeStyle }
}
