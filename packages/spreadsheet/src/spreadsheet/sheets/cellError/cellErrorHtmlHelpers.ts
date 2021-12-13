import styles from './CellError.module.scss'
import { prefix } from '../../utils'

export const cellErrorPrefix = `${prefix}-cell-error`

export const createHeader = (text: string) => {
  const header = document.createElement('h3')
  header.textContent = text
  header.classList.add(styles.header, `${cellErrorPrefix}-header`)

  return header
}

export const createContent = () => {
  const content = document.createElement('div')

  content.classList.add(styles.content, `${cellErrorPrefix}-content`)

  return content
}
