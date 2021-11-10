import tippy, { followCursor, Instance, Props } from 'tippy.js'
import styles from './RightClickMenu.module.scss'
import Sheets from '../Sheets'
import { createGroup } from '../../htmlElementHelpers'
import {
  createButtonContent,
  ButtonName,
  rightClickMenuPrefix
} from './rightClickMenuHtmlHelpers'

export interface IRightClickMenuActionGroups {
  elements: HTMLElement[]
}

class RightClickMenu {
  rightClickMenuEl: HTMLDivElement
  menuItem: HTMLDivElement
  dropdown: Instance<Props>
  buttonMap: Record<ButtonName, HTMLElement>
  rightClickMenuActionGroups: IRightClickMenuActionGroups[]

  constructor(private sheets: Sheets) {
    this.buttonMap = {
      comment: createButtonContent('Comment', 'comment'),
      copy: createButtonContent('Copy', 'copy'),
      cut: createButtonContent('Cut', 'cut'),
      paste: createButtonContent('Paste', 'paste'),
      insertRow: createButtonContent('Insert row', 'insert-row'),
      insertColumn: createButtonContent('Insert column', 'insert-column'),
      deleteRow: createButtonContent('Delete row', 'delete-row'),
      deleteColumn: createButtonContent('Delete column', 'delete-column')
    }
    this.rightClickMenuEl = document.createElement('div')
    this.menuItem = document.createElement('div')

    this.rightClickMenuEl.classList.add(
      styles.rightClickMenuEl,
      `${rightClickMenuPrefix}`
    )

    this.menuItem.classList.add(
      styles.menuItem,
      `${rightClickMenuPrefix}-menu-item`
    )

    const content = document.createElement('div')

    content.classList.add(styles.content, `${rightClickMenuPrefix}-content`)

    const buttons = this.buttonMap

    this.rightClickMenuActionGroups = [
      {
        elements: [buttons.comment, buttons.copy, buttons.cut, buttons.paste]
      },
      {
        elements: [buttons.insertRow, buttons.insertColumn]
      },
      {
        elements: [buttons.deleteRow, buttons.deleteColumn]
      }
    ]

    this.rightClickMenuActionGroups.forEach(({ elements }) => {
      const group = createGroup(elements, styles.group, rightClickMenuPrefix)

      content.appendChild(group)
    })

    Object.values(buttons).forEach(button => {
      button.addEventListener('click', () => {
        this.dropdown.hide()
      })
    })

    buttons.comment.addEventListener('click', this.commentOnClick)
    buttons.deleteRow.addEventListener('click', this.deleteRowOnClick)
    buttons.deleteColumn.addEventListener('click', this.deleteColOnClick)
    buttons.insertRow.addEventListener('click', this.insertRowOnClick)
    buttons.insertColumn.addEventListener('click', this.insertColOnClick)

    buttons.cut.addEventListener('click', async () => {
      await this.sheets.clipboard.cut()
    })

    buttons.copy.addEventListener('click', async () => {
      await this.sheets.clipboard.copy()
    })

    buttons.paste.addEventListener('click', () => {
      this.sheets.clipboard.paste()
    })

    this.dropdown = tippy(this.sheets.sheetEl, {
      placement: 'auto',
      interactive: true,
      arrow: false,
      delay: 0,
      trigger: 'click',
      plugins: [followCursor],
      followCursor: 'initial',
      theme: 'dropdown',
      content,
      showOnCreate: false,
      hideOnClick: true
    })

    this.hide()

    this.rightClickMenuEl.appendChild(this.menuItem)
  }

  hide() {
    this.dropdown.disable()
    this.dropdown.hide()
  }

  show() {
    this.dropdown.enable()
    this.dropdown.show()
  }

  commentOnClick = () => {
    const simpleCellAddress =
      this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.comment?.show(simpleCellAddress)
  }

  insertRowOnClick = () => {
    const { row } = this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.rows.rowColMap.get(row)!.insert(1)
  }

  insertColOnClick = () => {
    const { col } = this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.cols.rowColMap.get(col)!.insert(1)
  }

  deleteRowOnClick = () => {
    const { row } = this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.rows.rowColMap.get(row)!.delete(1)
  }

  deleteColOnClick = () => {
    const { col } = this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.cols.rowColMap.get(col)!.delete(1)
  }
}

export default RightClickMenu
