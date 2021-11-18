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

  /**
   * @internal
   */
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

    this.rightClickMenuActionGroups = [
      {
        elements: [
          this.buttonMap.comment,
          this.buttonMap.copy,
          this.buttonMap.cut,
          this.buttonMap.paste
        ]
      },
      {
        elements: [this.buttonMap.insertRow, this.buttonMap.insertColumn]
      },
      {
        elements: [this.buttonMap.deleteRow, this.buttonMap.deleteColumn]
      }
    ]

    this.rightClickMenuActionGroups.forEach(({ elements }) => {
      const group = createGroup(elements, styles.group, rightClickMenuPrefix)

      content.appendChild(group)
    })

    Object.values(this.buttonMap).forEach(button => {
      button.addEventListener('click', () => {
        this.dropdown.hide()
      })
    })

    this.buttonMap.comment.addEventListener('click', this.commentOnClick)
    this.buttonMap.deleteRow.addEventListener('click', this.deleteRowOnClick)
    this.buttonMap.deleteColumn.addEventListener('click', this.deleteColOnClick)
    this.buttonMap.insertRow.addEventListener('click', this.insertRowOnClick)
    this.buttonMap.insertColumn.addEventListener('click', this.insertColOnClick)

    this.buttonMap.cut.addEventListener('click', async () => {
      await this.sheets.clipboard.cut()
    })

    this.buttonMap.copy.addEventListener('click', async () => {
      await this.sheets.clipboard.copy()
    })

    this.buttonMap.paste.addEventListener('click', () => {
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

  private commentOnClick = () => {
    const simpleCellAddress =
      this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.comment?.show(simpleCellAddress)
  }

  private insertRowOnClick = () => {
    const { row } = this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.rows.rowColMap.get(row)!.insert(1)
  }

  private insertColOnClick = () => {
    const { col } = this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.cols.rowColMap.get(col)!.insert(1)
  }

  private deleteRowOnClick = () => {
    const { row } = this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.rows.rowColMap.get(row)!.delete(1)
  }

  private deleteColOnClick = () => {
    const { col } = this.sheets.selector.selectedCell!.simpleCellAddress

    this.sheets.cols.rowColMap.get(col)!.delete(1)
  }

  /**
   * @internal
   */
  destroy() {
    this.rightClickMenuEl.remove()
    this.dropdown.destroy()
    this.buttonMap.comment.removeEventListener('click', this.commentOnClick)
    this.buttonMap.deleteRow.removeEventListener('click', this.deleteRowOnClick)
    this.buttonMap.deleteColumn.removeEventListener(
      'click',
      this.deleteColOnClick
    )
    this.buttonMap.insertRow.removeEventListener('click', this.insertRowOnClick)
    this.buttonMap.insertColumn.removeEventListener(
      'click',
      this.insertColOnClick
    )
  }

  hide() {
    this.dropdown.disable()
    this.dropdown.hide()
  }

  show() {
    this.dropdown.enable()
    this.dropdown.show()
  }
}

export default RightClickMenu
