import Sheets from '../Sheets'
import tippy, { followCursor, Instance, Props } from 'tippy.js'
import {
  createButtonContainer,
  createCancelButton,
  createContent,
  createSuccessButton,
  createTextarea
} from './commentHtmlHelpers'
import SimpleCellAddress from '../cells/cell/SimpleCellAddress'
import Spreadsheet from '../../Spreadsheet'

class Comment {
  textarea: HTMLTextAreaElement
  content: HTMLDivElement
  buttonContainer: HTMLDivElement
  successButton: HTMLButtonElement
  cancelButton: HTMLButtonElement
  container: Instance<Props>
  private _spreadsheet: Spreadsheet

  /**
   * @internal
   */
  constructor(private _sheets: Sheets) {
    this._spreadsheet = this._sheets._spreadsheet
    this.content = createContent()
    this.textarea = createTextarea()
    this.buttonContainer = createButtonContainer()
    this.successButton = createSuccessButton()
    this.cancelButton = createCancelButton()

    this.content.appendChild(this.textarea)
    this.content.appendChild(this.buttonContainer)
    this.buttonContainer.appendChild(this.successButton)
    this.buttonContainer.appendChild(this.cancelButton)

    this.container = tippy(this._sheets.sheetEl, {
      placement: 'auto',
      interactive: true,
      arrow: false,
      trigger: 'manual',
      delay: 100,
      plugins: [followCursor],
      followCursor: 'initial',
      theme: 'comment',
      showOnCreate: false,
      content: this.content,
      hideOnClick: true,
      onHide: () => {
        this.textarea.value = ''
      }
    })

    this.hide()

    this.cancelButton.addEventListener('click', this._cancelButtonOnClick)
    this.successButton.addEventListener('click', this._successButtonOnClick)
  }

  private _cancelButtonOnClick = () => {
    this.hide()
  }

  private _successButtonOnClick = () => {
    this._spreadsheet.pushToHistory(() => {
      const simpleCellAddress = this._sheets.selector.selectedCell!
        .simpleCellAddress

      this._spreadsheet.data.setCell(simpleCellAddress, {
        comment: this.textarea.value
      })
    })

    this._spreadsheet.render()
    this.hide()
  }

  /**
   * @internal
   */
  _destroy() {
    this.content.remove()
    this.container.destroy()
    this.successButton.removeEventListener('click', this._successButtonOnClick)
    this.cancelButton.removeEventListener('click', this._cancelButtonOnClick)
  }

  hide() {
    this.container.hide()
    this.textarea.value = ''
  }

  show(simpleCellAddress: SimpleCellAddress) {
    // unmount forces position to update
    this.container.unmount()
    this.container.show()

    const comment = this._spreadsheet.data._spreadsheetData.cells?.[
      simpleCellAddress.toCellId()
    ]?.comment

    if (comment) {
      this.textarea.value = comment
    }
  }
}

export default Comment
