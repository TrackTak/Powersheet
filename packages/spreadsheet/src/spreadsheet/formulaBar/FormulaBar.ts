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
  private spreadsheet!: Spreadsheet

  private onInput = (e: Event) => {
    const target = e.target as HTMLDivElement
    const textContent = target.textContent

    const restoreCaretPosition = saveCaretPosition(this.editableContent)

    if (this.spreadsheet.sheets.cellEditor.getIsHidden()) {
      this.spreadsheet.sheets.cellEditor.show(
        this.spreadsheet.sheets.selector.selectedCell!
      )
    }
    this.spreadsheet.sheets.cellEditor.setContentEditable(textContent ?? null)

    restoreCaretPosition()
  }

  private onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation()

    switch (e.key) {
      case 'Escape': {
        this.spreadsheet.sheets.cellEditor.hide()
        this.editableContent.blur()

        break
      }
      case 'Enter': {
        this.spreadsheet.sheets.cellEditor.hideAndSave()
        this.editableContent.blur()

        break
      }
    }
  }

  /**
   * @param spreadsheet - The spreadsheet that this FormulaBar is connected to
   */
  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet
    this.cellHighlighter = new CellHighlighter(this.spreadsheet)

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

    this.editableContent.addEventListener('input', this.onInput)
    this.editableContent.addEventListener('keydown', this.onKeyDown)
  }

  /**
   * Clears the FormulaBar's editable content
   */
  clear() {
    this.editableContent.textContent = null
  }

  /**
   * @internal
   */
  _render() {
    this.updateValue(
      this.spreadsheet.sheets.selector.selectedCell?.simpleCellAddress
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
      this.spreadsheet.sheets?.cellEditor?.cellEditorEl.children

    let spanElements = cellEditorContentEditableChildren
      ? Array.from(cellEditorContentEditableChildren).map(node =>
          node.cloneNode(true)
        )
      : []

    if (simpleCellAddress) {
      const sheetName =
        this.spreadsheet.hyperformula.getSheetName(simpleCellAddress.sheet) ??
        ''

      if (this.spreadsheet.hyperformula.doesSheetExist(sheetName)) {
        const serializedValue =
          this.spreadsheet.hyperformula.getCellSerialized(simpleCellAddress)

        const { tokenParts } =
          this.cellHighlighter.getHighlightedCellReferenceSections(
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
   * Unregister's event listeners & removes all DOM elements
   */
  destroy() {
    this.formulaBarEl.remove()
    this.cellHighlighter.destroy()
    this.editableContent.removeEventListener('input', this.onInput)
    this.editableContent.removeEventListener('keydown', this.onKeyDown)
  }
}

export default FormulaBar
