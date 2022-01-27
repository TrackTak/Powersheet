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
  constructor(private _sheets: Sheets) {
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

    this.buttonMap.comment.addEventListener('click', this._commentOnClick)
    this.buttonMap.deleteRow.addEventListener('click', this._deleteRowOnClick)
    this.buttonMap.deleteColumn.addEventListener(
      'click',
      this._deleteColOnClick
    )
    this.buttonMap.insertRow.addEventListener('click', this._insertRowOnClick)
    this.buttonMap.insertColumn.addEventListener(
      'click',
      this._insertColOnClick
    )

    this.buttonMap.cut.addEventListener('click', async () => {
      await this._sheets.clipboard.cut()
    })

    this.buttonMap.copy.addEventListener('click', async () => {
      await this._sheets.clipboard.copy()
    })

    this.buttonMap.paste.addEventListener('click', () => {
      this._sheets.clipboard.paste()
    })

    this.dropdown = tippy(this._sheets.sheetEl, {
      placement: 'bottom-start',
      interactive: true,
      arrow: false,
      delay: 100,
      offset: [0, 0],
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

  private _commentOnClick = () => {
    const simpleCellAddress = this._sheets.selector.selectedCell!
      .simpleCellAddress

    this._sheets.comment?.show(simpleCellAddress)
  }

  private _insertRowOnClick = () => {
    const { row } = this._sheets.selector.selectedCell!.simpleCellAddress

    this._sheets.rows.rowColMap.get(row)!.insert(1)
  }

  private _insertColOnClick = () => {
    const { col } = this._sheets.selector.selectedCell!.simpleCellAddress

    this._sheets.cols.rowColMap.get(col)!.insert(1)
  }

  private _deleteRowOnClick = () => {
    const { row } = this._sheets.selector.selectedCell!.simpleCellAddress

    this._sheets.rows.rowColMap.get(row)!.delete(1)
  }

  private _deleteColOnClick = () => {
    const { col } = this._sheets.selector.selectedCell!.simpleCellAddress

    this._sheets.cols.rowColMap.get(col)!.delete(1)
  }

  /**
   * @internal
   */
  _destroy() {
    this.rightClickMenuEl.remove()
    this.dropdown.destroy()
    this.buttonMap.comment.removeEventListener('click', this._commentOnClick)
    this.buttonMap.deleteRow.removeEventListener(
      'click',
      this._deleteRowOnClick
    )
    this.buttonMap.deleteColumn.removeEventListener(
      'click',
      this._deleteColOnClick
    )
    this.buttonMap.insertRow.removeEventListener(
      'click',
      this._insertRowOnClick
    )
    this.buttonMap.insertColumn.removeEventListener(
      'click',
      this._insertColOnClick
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
