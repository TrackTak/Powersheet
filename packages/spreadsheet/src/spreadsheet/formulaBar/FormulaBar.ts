import CellHighlighter from '../cellHighlighter/CellHighlighter'
import SimpleCellAddress from '../sheets/cells/cell/SimpleCellAddress'
import Spreadsheet from '../Spreadsheet'
import { prefix, saveCaretPosition } from '../utils'
import styles from './FormulaBar.module.scss'
import { createFormulaEditorArea } from './formulaBarHtmlElementHelpers'

export const formulaBarPrefix = `${prefix}-formula-bar`

class FormulaBar {
  formulaBarEl!: HTMLDivElement
  editorArea!: HTMLDivElement
  editableContentContainer!: HTMLDivElement
  editableContent!: HTMLDivElement
  cellHighlighter!: CellHighlighter
  private _spreadsheet!: Spreadsheet

  private _onInput = (e: Event) => {
    const target = e.target as HTMLDivElement
    const textContent = target.textContent

    const restoreCaretPosition = saveCaretPosition(this.editableContent)

    if (this._spreadsheet.sheets.cellEditor.getIsHidden()) {
      this._spreadsheet.sheets.cellEditor.show(
        this._spreadsheet.sheets.selector.selectedCell!
      )
    }
    this._spreadsheet.sheets.cellEditor.setContentEditable(textContent ?? null)

    restoreCaretPosition()

    this._spreadsheet.sheets.cellEditor._createPlaceholderIfNeeded(
      this.editableContent,
      this._spreadsheet.sheets.cellEditor.cellEditorEl
    )
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation()

    switch (e.key) {
      case 'Escape': {
        this._spreadsheet.sheets.cellEditor.hide()
        this.editableContent.blur()

        break
      }
      case 'Enter': {
        this._spreadsheet.sheets.cellEditor.hideAndSave()
        this.editableContent.blur()

        break
      }
    }
  }

  /**
   * @param spreadsheet - The spreadsheet that this FormulaBar is connected to.
   */
  initialize(spreadsheet: Spreadsheet) {
    this._spreadsheet = spreadsheet
    this.cellHighlighter = new CellHighlighter(this._spreadsheet)

    this.formulaBarEl = document.createElement('div')
    this.formulaBarEl.classList.add(styles.formulaBar, formulaBarPrefix)

    const { editorArea, editableContentContainer, editableContent } =
      createFormulaEditorArea()

    this.formulaBarEl.appendChild(editorArea)

    editableContentContainer.addEventListener('click', () => {
      editableContent.focus()
    })

    this.editorArea = editorArea
    this.editableContentContainer = editableContentContainer
    this.editableContent = editableContent

    this.editableContent.addEventListener('input', this._onInput)
    this.editableContent.addEventListener('keydown', this._onKeyDown)
  }

  /**
   * Clears the FormulaBar's editable content.
   */
  clear() {
    this.editableContent.textContent = null
  }

  /**
   * @internal
   */
  _render() {
    this.updateValue(
      this._spreadsheet.sheets.selector.selectedCell?.simpleCellAddress
    )
  }

  /**
   * Updates the FormulaBar's value from the passed in cell address.
   *
   * @param simpleCellAddress - The cell address that you want the value
   * to be taken from.
   */
  updateValue(simpleCellAddress: SimpleCellAddress | undefined) {
    this.clear()

    const cellEditorContentEditableChildren =
      this._spreadsheet.sheets?.cellEditor?.cellEditorEl.children

    let spanElements = cellEditorContentEditableChildren
      ? Array.from(cellEditorContentEditableChildren).map(node =>
          node.cloneNode(true)
        )
      : []

    if (simpleCellAddress) {
      const sheetName =
        this._spreadsheet.hyperformula.getSheetName(simpleCellAddress.sheet) ??
        ''

      if (this._spreadsheet.hyperformula.doesSheetExist(sheetName)) {
        const serializedValue =
          this._spreadsheet.hyperformula.getCellSerialized(simpleCellAddress)

        const tokenParts = this.cellHighlighter.getStyledTokens(
          serializedValue?.toString() ?? ''
        )

        if (tokenParts.length) {
          spanElements = tokenParts
        }
      }
    }

    spanElements.forEach(span => {
      this.editableContent.appendChild(span)
    })
  }

  /**
   * Unregister's event listeners & removes all DOM elements.
   */
  destroy() {
    this.formulaBarEl.remove()
    this.cellHighlighter.destroy()
    this.editableContent.removeEventListener('input', this._onInput)
    this.editableContent.removeEventListener('keydown', this._onKeyDown)
  }
}

export default FormulaBar
