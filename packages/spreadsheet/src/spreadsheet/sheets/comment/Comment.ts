import Sheets from '../Sheets'
import tippy, { Instance, Props } from 'tippy.js'
import {
  createButtonContainer,
  createCancelButton,
  createContent,
  createSuccessButton,
  createTextarea
} from './commentHtmlHelpers'
import SimpleCellAddress from '../cells/cell/SimpleCellAddress'
import Spreadsheet from '../../Spreadsheet'
import { ICellMetadata } from '../Data'

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
      placement: 'right-start',
      offset: [0, 0],
      interactive: true,
      arrow: false,
      trigger: 'manual',
      delay: 100,
      theme: 'comment',
      showOnCreate: false,
      content: this.content,
      hideOnClick: true,
      onHide: () => {
        this.textarea.value = ''
      },
      getReferenceClientRect: () =>
        this._sheets._getTippyCellReferenceClientRect()
    })

    this.hide()

    this.cancelButton.addEventListener('click', this._cancelButtonOnClick)
    this.successButton.addEventListener('click', this._successButtonOnClick)
  }

  private _cancelButtonOnClick = () => {
    this.hide()
  }

  private _successButtonOnClick = () => {
    const simpleCellAddress = this._sheets.selector.selectedCell!
      .simpleCellAddress

    const {
      metadata
    } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
      simpleCellAddress
    )

    this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(
      simpleCellAddress,
      {
        metadata: {
          ...metadata,
          comment: this.textarea.value
        }
      }
    )

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
    this.container.show()

    const {
      metadata
    } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
      simpleCellAddress
    )

    if (metadata?.comment) {
      this.textarea.value = metadata.comment
    }
  }
}

export default Comment
