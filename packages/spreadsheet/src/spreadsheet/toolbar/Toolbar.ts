import styles from './Toolbar.module.scss'
import { delegate, DelegateInstance } from 'tippy.js'
import { ACPController } from 'a-color-picker'
import {
  ColorPickerIconName,
  createAutosave,
  createBordersContent,
  createColorBar,
  createColorPickerContent,
  createFontSizeContent,
  createFunctionDropdownContent,
  createHorizontalTextAlignContent,
  createTextFormatContent,
  createVerticalTextAlignContent,
  HorizontalTextAlignName,
  IconElementsName,
  toggleIconNames,
  toolbarPrefix,
  VerticalTextAlignName
} from './toolbarHtmlElementHelpers'
import {
  createDropdownButton,
  createDropdownIconButton,
  createGroup,
  createIconButton,
  createTooltip,
  DropdownButtonName,
  DropdownIconName,
  DropdownName,
  IActionElements,
  IButtonElements,
  IIconElements
} from '../htmlElementHelpers'
import Spreadsheet from '../Spreadsheet'
import { sentenceCase } from 'change-case'
import Cell from '../sheets/cells/cell/Cell'
import SimpleCellAddress from '../sheets/cells/cell/SimpleCellAddress'
import {
  BorderStyle,
  HorizontalTextAlign,
  ICellMetadata,
  ISheetMetadata,
  TextWrap,
  VerticalTextAlign
} from '../sheets/Data'
import RangeSimpleCellAddress from '../sheets/cells/cell/RangeSimpleCellAddress'
import SelectedCell from '../sheets/cells/cell/SelectedCell'
import { ColumnRowIndex, HyperFormula } from '@tracktak/hyperformula'
import {
  MergeCellsCommand,
  SetFrozenRowColCommand,
  UnMergeCellsCommand,
  UnsetFrozenRowColCommand
} from '../Commands'
import {
  MergeCellsUndoEntry,
  SetFrozenRowColUndoEntry,
  UnMergeCellsUndoEntry,
  UnsetFrozenRowColUndoEntry
} from '../UIUndoRedo'
import Merger from '../sheets/Merger'

export interface IToolbarActionGroups {
  elements: HTMLElement[]
  className?: string
}

interface IColorPickerElements {
  picker: ACPController
  colorPicker: HTMLDivElement
  colorBar: HTMLSpanElement
}

interface IBorderElements {
  borderGroups: [HTMLDivElement, HTMLDivElement]
}

interface IFunctionElements {
  registeredFunctionButtons: HTMLButtonElement[]
}

interface IFontSizeElements {
  fontSizes: Record<number, HTMLButtonElement>
}

interface ITextFormatElements {
  textFormats: Record<string, HTMLButtonElement>
}

interface IAutosaveElement {
  text: HTMLDivElement
}

class Toolbar {
  toolbarEl!: HTMLDivElement
  iconElementsMap!: Record<IconElementsName, IIconElements>
  buttonElementsMap!: Record<DropdownButtonName, IButtonElements>
  dropdownMap!: Record<DropdownName, HTMLDivElement>
  colorPickerElementsMap!: Record<ColorPickerIconName, IColorPickerElements>
  borderElements!: IBorderElements
  fontSizeElements!: IFontSizeElements
  textFormatElements!: ITextFormatElements
  functionElements?: IFunctionElements
  autosaveElement!: IAutosaveElement
  tooltip!: DelegateInstance
  dropdown!: DelegateInstance
  private _spreadsheet!: Spreadsheet
  private _merger!: Merger

  private _setFunction(functionName: string) {
    const selectedCells = this._spreadsheet.sheets.selector.selectedCells

    if (selectedCells.length > 1) {
      const rangeSimpleCellAddress = this._spreadsheet.sheets._getMinMaxRangeSimpleCellAddress(
        selectedCells
      )

      const cell = new Cell(
        this._spreadsheet.sheets,
        new SimpleCellAddress(
          this._spreadsheet.sheets.activeSheetId,
          rangeSimpleCellAddress.bottomRightSimpleCellAddress.row + 1,
          rangeSimpleCellAddress.topLeftSimpleCellAddress.col
        )
      )

      const topLeftString = rangeSimpleCellAddress.topLeftSimpleCellAddress.addressToString()
      const bottomRightString = rangeSimpleCellAddress.bottomRightSimpleCellAddress.addressToString()

      const viewportVector = this._spreadsheet.sheets._getViewportVector()

      cell.group.x(cell.group.x() + viewportVector.x)
      cell.group.y(cell.group.y() + viewportVector.y)

      this._spreadsheet.sheets.cellEditor.show(cell)
      this._spreadsheet.sheets.cellEditor.setContentEditable(
        `=${functionName}(${topLeftString}:${bottomRightString})`
      )
    } else {
      const selectedCell = this._spreadsheet.sheets.selector.selectedCell!

      this._spreadsheet.sheets.cellEditor.show(selectedCell)
      this._spreadsheet.sheets.cellEditor.setContentEditable(
        `=${functionName}()`
      )
    }
  }

  private _setBorderStyles(
    cells: Cell[],
    cellsFilter: (
      cell: Cell,
      rangeSimpleCellAddress: RangeSimpleCellAddress
    ) => boolean,
    borderType: BorderStyle
  ) {
    const borderCells = cells.filter(cell =>
      cellsFilter(
        cell,
        this._spreadsheet.sheets._getMinMaxRangeSimpleCellAddress(cells)
      )
    )

    borderCells.forEach(cell => {
      const {
        metadata
      } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
        cell.simpleCellAddress
      )

      const borders = metadata?.borders ?? []

      if (borders.indexOf(borderType) === -1) {
        this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(
          cell.simpleCellAddress,
          {
            metadata: {
              ...metadata,
              borders: [...borders, borderType]
            }
          }
        )
      }
    })
  }

  private _setBottomBorders(cells: Cell[]) {
    this._setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress.row ===
        rangeSimpleCellAddress.bottomRightSimpleCellAddress.row,
      'borderBottom'
    )
  }

  private _setRightBorders(cells: Cell[]) {
    this._setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress.col ===
        rangeSimpleCellAddress.bottomRightSimpleCellAddress.col,
      'borderRight'
    )
  }

  private _setTopBorders(cells: Cell[]) {
    this._setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.topLeftSimpleCellAddress.row ===
        rangeSimpleCellAddress.topLeftSimpleCellAddress.row,
      'borderTop'
    )
  }

  private _setLeftBorders(cells: Cell[]) {
    this._setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.topLeftSimpleCellAddress.col ===
        rangeSimpleCellAddress.topLeftSimpleCellAddress.col,
      'borderLeft'
    )
  }

  private _setVerticalBorders(cells: Cell[]) {
    this._setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) => {
        return (
          cell.rangeSimpleCellAddress.topLeftSimpleCellAddress.col >=
            rangeSimpleCellAddress.topLeftSimpleCellAddress.col &&
          cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress.col <
            rangeSimpleCellAddress.bottomRightSimpleCellAddress.col
        )
      },
      'borderRight'
    )
  }

  private _setHorizontalBorders(cells: Cell[]) {
    this._setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.topLeftSimpleCellAddress.row >=
          rangeSimpleCellAddress.topLeftSimpleCellAddress.row &&
        cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress.row <
          rangeSimpleCellAddress.bottomRightSimpleCellAddress.row,
      'borderBottom'
    )
  }

  private _setInsideBorders(cells: Cell[]) {
    this._setHorizontalBorders(cells)
    this._setVerticalBorders(cells)
  }

  private _setOutsideBorders(cells: Cell[]) {
    this._setBottomBorders(cells)
    this._setLeftBorders(cells)
    this._setRightBorders(cells)
    this._setTopBorders(cells)
  }

  private _setAllBorders(cells: Cell[]) {
    this._setOutsideBorders(cells)
    this._setInsideBorders(cells)
  }

  private _clearBorders(simpleCellAddresses: SimpleCellAddress[]) {
    simpleCellAddresses.forEach(simpleCellAddress => {
      const {
        metadata
      } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
        simpleCellAddress
      )

      delete metadata?.borders

      this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(
        simpleCellAddress,
        {
          metadata
        }
      )
    })
  }

  private _setTextFormatPatterns() {
    const {
      dropdownContent: textFormatDropdownContent,
      textFormats
    } = createTextFormatContent(this._spreadsheet.options.textPatternFormats)

    this.dropdownMap.textFormatPattern = textFormatDropdownContent

    this.textFormatElements = {
      textFormats
    }

    Object.keys(this.textFormatElements.textFormats).forEach(key => {
      this.textFormatElements.textFormats[key].addEventListener('click', () => {
        this.setValue('textFormatPattern', key)
      })
    })
  }

  private _setFontSizes() {
    const sortedFontSizes = this._spreadsheet.options.fontSizes.sort(
      (a, b) => a - b
    )
    const {
      dropdownContent: fontSizeDropdownContent,
      fontSizes
    } = createFontSizeContent(sortedFontSizes)

    this.dropdownMap.fontSize = fontSizeDropdownContent

    this.fontSizeElements = {
      fontSizes
    }

    Object.keys(this.fontSizeElements.fontSizes).forEach(key => {
      const fontSize = parseInt(key, 10)

      this.fontSizeElements.fontSizes[fontSize].addEventListener(
        'click',
        () => {
          this.setValue('fontSize', fontSize)
        }
      )
    })
  }

  private _setDropdownIconButton(
    name: DropdownIconName,
    createArrow?: boolean
  ) {
    const {
      iconButtonValues,
      arrowIconValues,
      tooltip
    } = createDropdownIconButton(name, toolbarPrefix, createArrow)

    this.iconElementsMap[name] = {
      ...iconButtonValues,
      ...arrowIconValues,
      tooltip
    }
  }

  private _setDropdownButton(name: DropdownButtonName, createArrow?: boolean) {
    const {
      buttonContainer,
      button,
      text,
      arrowIconValues,
      tooltip
    } = createDropdownButton(name, toolbarPrefix, createArrow)

    this.buttonElementsMap[name] = {
      buttonContainer,
      button,
      text,
      tooltip,
      ...arrowIconValues
    }
  }

  private _setDropdownColorPicker(name: ColorPickerIconName) {
    const { dropdownContent, colorPicker, picker } = createColorPickerContent()

    this._setDropdownIconButton(name)

    this.dropdownMap[name] = dropdownContent

    const colorBar = createColorBar(picker)

    this.iconElementsMap[name].button.appendChild(colorBar)

    this.colorPickerElementsMap[name] = {
      colorBar,
      picker,
      colorPicker
    }
  }

  private _setActiveColor(
    selectedCell: SelectedCell,
    colorPickerIconName: ColorPickerIconName
  ) {
    let fill

    const {
      metadata
    } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
      selectedCell.simpleCellAddress
    )

    if (colorPickerIconName === 'backgroundColor') {
      fill = metadata?.backgroundColor ?? ''
    } else {
      fill = metadata?.fontColor ?? this._spreadsheet.styles.cell.text.fill!
    }

    this.colorPickerElementsMap[
      colorPickerIconName
    ].colorBar.style.backgroundColor = fill
  }

  private _setActiveMergedCells(
    selectedCells: Cell[],
    selectedCell: SelectedCell
  ) {
    const isCellPartOfMerge = this._merger.getIsCellPartOfMerge(
      selectedCell.simpleCellAddress
    )
    const isTopLeftMergedCell = this._merger.getIsCellTopLeftMergedCell(
      selectedCell.simpleCellAddress
    )
    const isMerged =
      (isCellPartOfMerge || isTopLeftMergedCell) && selectedCells.length === 1

    if (isMerged) {
      this.iconElementsMap.merge.button.disabled = false
    } else {
      this.iconElementsMap.merge.button.disabled = selectedCells.length <= 1
    }

    this._setActive(this.iconElementsMap.merge, isMerged)
  }

  private _setActiveSaveState() {
    if (this._spreadsheet.isSaving) {
      this.autosaveElement.text.textContent = 'Saving...'
    } else {
      this.autosaveElement.text.textContent = 'Saved'
    }
  }

  private _setActiveHorizontalIcon(selectedCell: SelectedCell) {
    const {
      metadata
    } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
      selectedCell.simpleCellAddress
    )
    const icon = this.iconElementsMap.horizontalTextAlign.icon

    switch (metadata?.horizontalTextAlign) {
      case 'center':
        icon.dataset.activeIcon = 'center'
        break
      case 'right':
        icon.dataset.activeIcon = 'right'
        break
      default:
        icon.dataset.activeIcon = 'left'
        break
    }
  }

  private _setActiveVerticalIcon(selectedCell: SelectedCell) {
    const {
      metadata
    } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
      selectedCell.simpleCellAddress
    )

    const icon = this.iconElementsMap.verticalTextAlign.icon

    switch (metadata?.verticalTextAlign) {
      case 'top':
        icon.dataset.activeIcon = 'top'
        break
      case 'bottom':
        icon.dataset.activeIcon = 'bottom'
        break
      default:
        icon.dataset.activeIcon = 'middle'
        break
    }
  }

  private _setActiveFontSize(selectedCell: SelectedCell) {
    const {
      metadata
    } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
      selectedCell.simpleCellAddress
    )

    this.buttonElementsMap.fontSize.text.textContent = (
      metadata?.fontSize ?? this._spreadsheet.styles.cell.text.fontSize!
    ).toString()
  }

  private _setActiveTextFormat(selectedCell: SelectedCell) {
    const {
      metadata
    } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
      selectedCell.simpleCellAddress
    )

    let textFormat = 'plainText'

    Object.keys(this._spreadsheet.options.textPatternFormats).forEach(key => {
      const value = this._spreadsheet.options.textPatternFormats[key]

      if (metadata?.textFormatPattern === value) {
        textFormat = key
      }
    })

    this.buttonElementsMap.textFormatPattern.text.textContent = sentenceCase(
      textFormat
    )
  }

  private _setActiveHistoryIcons() {
    this._setDisabled(
      this.iconElementsMap.undo,
      !this._spreadsheet.hyperformula.isThereSomethingToUndo()
    )
    this._setDisabled(
      this.iconElementsMap.redo,
      !this._spreadsheet.hyperformula.isThereSomethingToRedo()
    )
  }

  private _setActive(actionElements: IActionElements, active: boolean) {
    actionElements.active = active

    if (active) {
      actionElements.button.classList.add('active')
    } else {
      actionElements.button.classList.remove('active')
    }
  }

  private _setDisabled(iconElements: IIconElements, disabled: boolean) {
    iconElements.button.disabled = disabled
  }

  /**
   * @param spreadsheet - The spreadsheet that this Toolbar is connected to.
   */
  initialize(spreadsheet: Spreadsheet, merger: Merger) {
    this._spreadsheet = spreadsheet
    this._merger = merger
    this.toolbarEl = document.createElement('div')
    this.toolbarEl.classList.add(styles.toolbar, toolbarPrefix)

    this.iconElementsMap = {} as Record<string, IIconElements>
    this.dropdownMap = {} as Record<DropdownName, HTMLDivElement>
    this.colorPickerElementsMap = {} as Record<
      ColorPickerIconName,
      IColorPickerElements
    >
    this.borderElements = {} as IBorderElements
    this.textFormatElements = {} as ITextFormatElements
    this.functionElements = {} as IFunctionElements
    this.buttonElementsMap = {} as Record<DropdownButtonName, IButtonElements>

    this._setDropdownButton('textFormatPattern', true)
    this._setDropdownButton('fontSize', true)

    const { text, autosave } = createAutosave()

    this.iconElementsMap.autosave = autosave
    this.autosaveElement = {
      text
    }

    toggleIconNames.forEach(name => {
      switch (name) {
        case 'backgroundColor': {
          this._setDropdownColorPicker(name)

          this.colorPickerElementsMap.backgroundColor.picker.on(
            'change',
            (_, color) => {
              this.setValue(name, color)
            }
          )
          break
        }
        case 'fontColor': {
          this._setDropdownColorPicker(name)

          this.colorPickerElementsMap.fontColor.picker.on(
            'change',
            (_, fontColor) => {
              this.setValue(name, fontColor)
            }
          )
          break
        }
        case 'borders': {
          const {
            dropdownContent,
            borderGroups,
            firstBordersRow,
            secondBordersRow
          } = createBordersContent()

          this._setDropdownIconButton(name, true)

          this.dropdownMap.borders = dropdownContent

          this.borderElements = {
            borderGroups
          }

          const setBorders = (bordersRow: Object) => {
            Object.keys(bordersRow).forEach(key => {
              const name = key as IconElementsName
              // @ts-ignore
              const value = bordersRow[key]

              this.iconElementsMap[name] = value
            })
          }

          setBorders(firstBordersRow)
          setBorders(secondBordersRow)

          break
        }
        case 'horizontalTextAlign': {
          const { dropdownContent, aligns } = createHorizontalTextAlignContent()

          this._setDropdownIconButton(name, true)

          this.dropdownMap.horizontalTextAlign = dropdownContent

          Object.keys(aligns).forEach(key => {
            const name = key as HorizontalTextAlignName
            const value = aligns[name]

            this.iconElementsMap[name] = value
          })

          break
        }
        case 'verticalTextAlign': {
          const { dropdownContent, aligns } = createVerticalTextAlignContent()

          this._setDropdownIconButton(name, true)

          this.dropdownMap.verticalTextAlign = dropdownContent

          Object.keys(aligns).forEach(key => {
            const name = key as VerticalTextAlignName
            const value = aligns[name]

            this.iconElementsMap[name] = value
          })
          break
        }
        case 'functions': {
          const {
            dropdownContent,
            registeredFunctionButtons
          } = createFunctionDropdownContent(
            HyperFormula.getRegisteredFunctionNames('enGB').sort((a, b) =>
              a.localeCompare(b)
            )
          )

          this._setDropdownIconButton(name, true)

          this.dropdownMap.functions = dropdownContent

          this.functionElements = {
            registeredFunctionButtons
          }
          break
        }
        default: {
          const iconElements = createIconButton(name, toolbarPrefix)
          const tooltip = createTooltip(name, toolbarPrefix)

          iconElements.button.appendChild(tooltip)

          this.iconElementsMap[name] = {
            ...iconElements,
            tooltip
          }
          break
        }
      }
    })

    this.tooltip = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-tooltip`,
      touch: false,
      delay: 300
    })

    const setDropdownActive = (element: HTMLButtonElement, active: boolean) => {
      const button = element as HTMLButtonElement
      const name = button.dataset.name!

      // @ts-ignore
      const actionElements = (this.buttonElementsMap[name] ??
        // @ts-ignore
        this.iconElementsMap[name]) as IActionElements

      this._setActive(actionElements, active)
    }

    this.dropdown = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-dropdown-button`,
      trigger: 'click',
      theme: 'dropdown',
      placement: 'auto',
      interactive: true,
      arrow: false,
      onHide: ({ reference }) => {
        setDropdownActive(reference as HTMLButtonElement, false)

        this._spreadsheet.render()
      },
      onShow: ({ reference }) => {
        setDropdownActive(reference as HTMLButtonElement, true)
      },
      content: e => {
        const button = e as HTMLButtonElement
        const name = button.dataset.name as DropdownIconName

        if (!name) return ''

        setDropdownActive(e as HTMLButtonElement, true)

        return this.dropdownMap[name]
      }
    })

    Object.keys(this.iconElementsMap).forEach(key => {
      const name = key as IconElementsName

      if (!this.dropdownMap[key as DropdownName]) {
        this.iconElementsMap[name].button.addEventListener('click', () => {
          this.setValue(name)
        })
      }
    })

    this.dropdownMap.functions?.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (target?.matches('button')) {
        const functionName = target.dataset.function

        this.setValue('functions', functionName)
      }
    })
  }

  /**
   *
   * @param toolbarActionGroups The toolbar icon elements that
   * you want to be displayed.
   */
  setToolbarIcons(toolbarActionGroups: IToolbarActionGroups[]) {
    toolbarActionGroups.forEach(({ elements }) => {
      const group = createGroup(elements, styles.group, toolbarPrefix)

      this.toolbarEl.appendChild(group)
    })
  }

  /**
   *
   * @param name The name of the toolbar element to set.
   * @param value Some styles require this value and it depends on
   * the element as to what value this should be.
   */
  setValue = (name: IconElementsName | DropdownButtonName, value?: any) => {
    const selectedCell = this._spreadsheet.sheets.selector.selectedCell
    const selectedCells = this._spreadsheet.sheets.selector.selectedCells
    const sheetMetadata = this._spreadsheet.hyperformula.getSheetMetadata<ISheetMetadata>(
      this._spreadsheet.sheets.activeSheetId
    )
    const setStyle = <T>(key: keyof ICellMetadata, value: T) => {
      this._spreadsheet.hyperformula.batchUndoRedo(() => {
        selectedCells.forEach(({ simpleCellAddress }) => {
          const {
            metadata
          } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
            simpleCellAddress
          )

          let cellValue: number | string | undefined

          this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(
            simpleCellAddress,
            {
              cellValue,
              metadata: {
                ...metadata,
                [key]: value
              }
            }
          )
        })
      })
      this._spreadsheet.persistData()
    }

    const deleteStyle = (key: keyof ICellMetadata) => {
      selectedCells.forEach(cell => {
        const {
          metadata
        } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
          cell.simpleCellAddress
        )

        if (metadata) {
          delete metadata[key]
        }

        this._spreadsheet.hyperformula.setCellContents<ICellMetadata>(
          cell.simpleCellAddress,
          {
            metadata
          }
        )
      })

      this._spreadsheet.persistData()
    }

    switch (name) {
      case 'functions': {
        this._setFunction(value)
        break
      }
      case 'functionHelper': {
        this._spreadsheet.options.showFunctionHelper = !this._spreadsheet
          .options.showFunctionHelper
        break
      }
      case 'formula': {
        this._spreadsheet.spreadsheetData.showFormulas = !this._spreadsheet
          .spreadsheetData.showFormulas
        this._spreadsheet.persistData()
        break
      }
      case 'alignLeft': {
        setStyle<HorizontalTextAlign>('horizontalTextAlign', 'left')
        break
      }
      case 'alignCenter': {
        setStyle<HorizontalTextAlign>('horizontalTextAlign', 'center')
        break
      }
      case 'alignRight': {
        setStyle<HorizontalTextAlign>('horizontalTextAlign', 'right')
        break
      }
      case 'alignTop': {
        setStyle<VerticalTextAlign>('verticalTextAlign', 'top')
        break
      }
      case 'alignMiddle': {
        setStyle<VerticalTextAlign>('verticalTextAlign', 'middle')
        break
      }
      case 'alignBottom': {
        setStyle<VerticalTextAlign>('verticalTextAlign', 'bottom')
        break
      }
      case 'fontSize': {
        setStyle<number>('fontSize', value)
        break
      }
      case 'textWrap': {
        if (this.iconElementsMap.textWrap.active) {
          deleteStyle('textWrap')
        } else {
          setStyle<TextWrap>('textWrap', 'wrap')
        }
        break
      }
      case 'textFormatPattern': {
        const format = value

        setStyle<string>(
          'textFormatPattern',
          this._spreadsheet.options.textPatternFormats[format]
        )
        break
      }
      case 'backgroundColor': {
        if (!value) break

        const backgroundColor = value

        setStyle<string>('backgroundColor', backgroundColor)
        break
      }
      case 'fontColor': {
        if (!value) break

        const fontColor = value

        setStyle<string>('fontColor', fontColor)
        break
      }
      case 'bold': {
        if (this.iconElementsMap.bold.active) {
          deleteStyle('bold')
        } else {
          setStyle<true>('bold', true)
        }
        break
      }
      case 'italic': {
        if (this.iconElementsMap.italic.active) {
          deleteStyle('italic')
        } else {
          setStyle<true>('italic', true)
        }
        break
      }
      case 'strikeThrough': {
        if (this.iconElementsMap.strikeThrough.active) {
          deleteStyle('strikeThrough')
        } else {
          setStyle<true>('strikeThrough', true)
        }
        break
      }
      case 'underline': {
        if (this.iconElementsMap.underline.active) {
          deleteStyle('underline')
        } else {
          setStyle<true>('underline', true)
        }
        break
      }
      case 'merge': {
        if (!selectedCells.length) return

        if (this.iconElementsMap.merge.active) {
          const { sheet, row, col } = selectedCell!.simpleCellAddress
          const mergedCellAddress = new SimpleCellAddress(sheet, row, col)
          const mergedCellId = mergedCellAddress.toCellId()
          const mergedCell = sheetMetadata.mergedCells[mergedCellId]
          const command = new UnMergeCellsCommand(
            mergedCellAddress,
            mergedCell.width,
            mergedCell.height
          )

          this._spreadsheet.hyperformula.batchUndoRedo(() => {
            this._spreadsheet.operations.unMergeCells(mergedCellAddress)
            this._spreadsheet.uiUndoRedo.saveOperation(
              new UnMergeCellsUndoEntry(this._spreadsheet.hyperformula, command)
            )
          })
        } else {
          const rangeSimpleCellAddress = this._spreadsheet.sheets._getMinMaxRangeSimpleCellAddress(
            selectedCells
          )
          const width = rangeSimpleCellAddress.width()
          const height = rangeSimpleCellAddress.height()

          this._spreadsheet.hyperformula.batchUndoRedo(() => {
            const removedMergedCells = this._spreadsheet.operations.mergeCells(
              rangeSimpleCellAddress.topLeftSimpleCellAddress,
              width,
              height
            )

            const command = new MergeCellsCommand(
              rangeSimpleCellAddress.topLeftSimpleCellAddress,
              width,
              height,
              removedMergedCells
            )

            this._spreadsheet.uiUndoRedo.saveOperation(
              new MergeCellsUndoEntry(this._spreadsheet.hyperformula, command)
            )
          })
        }

        this._spreadsheet.hyperformula.clearRedoStack()
        this._spreadsheet.persistData()

        break
      }
      case 'freeze': {
        const { sheet, row, col } = selectedCell!.simpleCellAddress

        if (this.iconElementsMap.freeze.active) {
          const { frozenRow, frozenCol } = sheetMetadata
          const indexes: ColumnRowIndex = [frozenRow!, frozenCol!]
          const command = new UnsetFrozenRowColCommand(sheet, indexes)

          this._spreadsheet.operations.unsetFrozenRowCol(sheet)
          this._spreadsheet.uiUndoRedo.saveOperation(
            new UnsetFrozenRowColUndoEntry(
              this._spreadsheet.hyperformula,
              command
            )
          )
        } else {
          const indexes: ColumnRowIndex = [row, col]
          const command = new SetFrozenRowColCommand(sheet, indexes)

          this._spreadsheet.operations.setFrozenRowCol(sheet, command.indexes)
          this._spreadsheet.uiUndoRedo.saveOperation(
            new SetFrozenRowColUndoEntry(
              this._spreadsheet.hyperformula,
              command
            )
          )
        }

        this._spreadsheet.hyperformula.clearRedoStack()
        this._spreadsheet.sheets.cols.scrollBar.scrollBarEl.scrollTo(0, 0)
        this._spreadsheet.sheets.rows.scrollBar.scrollBarEl.scrollTo(0, 0)
        this._spreadsheet.persistData()

        break
      }
      case 'export': {
        this._spreadsheet.exporter?.exportWorkbook()
        break
      }
      case 'borderBottom': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._setBottomBorders(selectedCells)
        })
        this._spreadsheet.persistData()
        break
      }
      case 'borderRight': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._setRightBorders(selectedCells)
        })
        this._spreadsheet.persistData()
        break
      }
      case 'borderTop': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._setTopBorders(selectedCells)
        })
        this._spreadsheet.persistData()
        break
      }
      case 'borderLeft': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._setLeftBorders(selectedCells)
        })
        this._spreadsheet.persistData()
        break
      }
      case 'borderVertical': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._setVerticalBorders(selectedCells)
        })
        this._spreadsheet.persistData()
        break
      }
      case 'borderHorizontal': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._setHorizontalBorders(selectedCells)
        })
        this._spreadsheet.persistData()
        break
      }
      case 'borderInside': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._setInsideBorders(selectedCells)
        })
        this._spreadsheet.persistData()
        break
      }
      case 'borderOutside': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._setOutsideBorders(selectedCells)
        })
        this._spreadsheet.persistData()
        break
      }
      case 'borderAll': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._setAllBorders(selectedCells)
        })
        this._spreadsheet.persistData()
        break
      }
      case 'borderNone': {
        this._spreadsheet.hyperformula.batchUndoRedo(() => {
          this._clearBorders(selectedCells.map(cell => cell.simpleCellAddress))
        })
        this._spreadsheet.persistData()
        break
      }
      case 'undo': {
        this._spreadsheet.undo()
        break
      }
      case 'redo': {
        this._spreadsheet.redo()
        break
      }
    }

    this._spreadsheet.render()
  }

  /**
   * @internal
   */
  _render = () => {
    const selectedCells = this._spreadsheet.sheets.selector.selectedCells
    const selectedCell = this._spreadsheet.sheets.selector.selectedCell!

    this._setTextFormatPatterns()
    this._setFontSizes()

    this._setActiveColor(selectedCell, 'backgroundColor')
    this._setActiveColor(selectedCell, 'fontColor')
    this._setActive(
      this.iconElementsMap.freeze,
      this.isFreezeActive(this._spreadsheet.sheets.activeSheetId)
    )
    this._setActive(
      this.iconElementsMap.textWrap,
      this.isActive(selectedCell, 'textWrap')
    )
    this._setActive(
      this.iconElementsMap.bold,
      this.isActive(selectedCell, 'bold')
    )
    this._setActive(
      this.iconElementsMap.italic,
      this.isActive(selectedCell, 'italic')
    )
    this._setActive(
      this.iconElementsMap.strikeThrough,
      this.isActive(selectedCell, 'strikeThrough')
    )
    this._setActive(
      this.iconElementsMap.underline,
      this.isActive(selectedCell, 'underline')
    )
    this._setActive(
      this.iconElementsMap.formula,
      this._spreadsheet.spreadsheetData.showFormulas ?? false
    )
    this._setActive(
      this.iconElementsMap.functionHelper,
      this._spreadsheet.options.showFunctionHelper
    )
    this._setActiveHorizontalIcon(selectedCell)
    this._setActiveVerticalIcon(selectedCell)
    this._setActiveFontSize(selectedCell)
    this._setActiveTextFormat(selectedCell)
    this._setActiveMergedCells(selectedCells, selectedCell)
    this._setActiveHistoryIcons()
    this._setActiveSaveState()
  }

  /**
   * Unregister's event listeners & removes all DOM elements.
   */
  destroy() {
    this.toolbarEl.remove()
    this.tooltip.destroy()
  }

  isFreezeActive(sheetId: number) {
    const sheetMetadata = this._spreadsheet.hyperformula.getSheetMetadata<ISheetMetadata>(
      sheetId
    )
    const { frozenRow, frozenCol } = sheetMetadata

    return frozenRow !== undefined || frozenCol !== undefined
  }

  isActive(selectedCell: SelectedCell, key: keyof ICellMetadata) {
    const {
      metadata
    } = this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
      selectedCell.simpleCellAddress
    )

    const style = metadata?.[key]

    return !!style
  }
}

export default Toolbar
