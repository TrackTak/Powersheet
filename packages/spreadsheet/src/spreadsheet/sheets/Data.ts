import { RawCellContent } from '@tracktak/hyperformula'
import { Vector2d } from 'konva/lib/types'
import { isNil } from 'lodash'
import Spreadsheet from '../Spreadsheet'
import RangeSimpleCellAddress from './cells/cell/RangeSimpleCellAddress'
import RowColAddress, { SheetRowColId } from './cells/cell/RowColAddress'
import SimpleCellAddress, { CellId } from './cells/cell/SimpleCellAddress'
import { RowColId, RowColsType } from './rowCols/RowCols'
import { SheetId } from './Sheets'

export type TextWrap = 'wrap'
export type HorizontalTextAlign = 'left' | 'center' | 'right'
export type VerticalTextAlign = 'top' | 'middle' | 'bottom'
export type BorderStyle =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom'

export interface ICellData {
  id: CellId
  value?: RawCellContent
  comment?: string
  borders?: BorderStyle[]
  backgroundColor?: string
  fontColor?: string
  fontSize?: number
  textWrap?: TextWrap
  textFormatPattern?: string
  underline?: boolean
  strikeThrough?: boolean
  bold?: boolean
  italic?: boolean
  horizontalTextAlign?: HorizontalTextAlign
  verticalTextAlign?: VerticalTextAlign
}

export interface ISheetData {
  id: SheetId
  sheetName?: string
  frozenCell?: SheetId
  mergedCells?: {
    [index: CellId]: CellId
  }
  cells?: {
    [index: CellId]: CellId
  }
  rows?: {
    [index: SheetRowColId]: SheetRowColId
  }
  cols?: {
    [index: SheetRowColId]: SheetRowColId
  }
}

export interface IFrozenCellData {
  id: SheetId
  row?: RowColId
  col?: RowColId
}

export interface IMergedCellData {
  id: CellId
  row: Vector2d
  col: Vector2d
}

export interface IRowColData {
  id: SheetRowColId
  size: number
}

export interface IRowsData {
  [index: SheetRowColId]: IRowColData
}

export interface IColsData {
  [index: SheetRowColId]: IRowColData
}

export interface ICellsData {
  [index: CellId]: ICellData
}

export interface ISheetsData {
  [index: SheetId]: ISheetData
}

export interface IFrozenCellsData {
  [index: string]: IFrozenCellData
}

export interface IMergedCellsData {
  [index: CellId]: IMergedCellData
}

export interface ISpreadsheetData {
  exportSpreadsheetName?: string
  frozenCells?: IFrozenCellsData
  mergedCells?: IMergedCellsData
  rows?: IRowsData
  cols?: IColsData
  cells?: ICellsData
  sheets?: ISheetsData
  showFormulas?: boolean
}

class Data {
  /**
   * @internal
   */
  _spreadsheetData: ISpreadsheetData = {}

  /**
   * @internal
   */
  constructor(private _spreadsheet: Spreadsheet) {}

  /**
   * Checks to see if the cell is the top left merged cell
   */
  getIsCellAMergedCell(simpleCellAddress: SimpleCellAddress) {
    const mergedCells = this._spreadsheetData.mergedCells

    return !!mergedCells?.[simpleCellAddress.toCellId()]
  }

  setSheet(sheetId: SheetId, sheetData?: Partial<ISheetData>) {
    if (!this._spreadsheetData.sheets) {
      this._spreadsheetData.sheets = {}
    }

    this._spreadsheetData.sheets[sheetId] = {
      sheetName: this._spreadsheet.sheets.getSheetName(),
      ...this._spreadsheetData.sheets?.[sheetId],
      ...sheetData,
      id: sheetId
    }
  }

  deleteSheet(sheetId: SheetId) {
    const sheet = this._spreadsheetData.sheets?.[sheetId]

    this._spreadsheet.hyperformula.removeSheet(sheetId)

    this.deleteFrozenCell(sheetId)

    for (const key in sheet?.cells) {
      const cellId = key as CellId

      this.deleteCell(SimpleCellAddress.cellIdToAddress(cellId))
    }

    for (const key in sheet?.cols) {
      const sheetRowColId = key as SheetRowColId
      const sheetRowColAddress = RowColAddress.sheetRowColIdToAddress(
        sheetRowColId
      )

      this.deleteRowCol('cols', sheetRowColAddress)
    }

    for (const key in sheet?.rows) {
      const sheetRowColId = key as SheetRowColId
      const sheetRowColAddress = RowColAddress.sheetRowColIdToAddress(
        sheetRowColId
      )

      this.deleteRowCol('rows', sheetRowColAddress)
    }

    delete this._spreadsheetData.sheets?.[sheetId]
  }

  setCell(
    simpleCellAddress: SimpleCellAddress,
    cell?: Omit<ICellData, 'id'>,
    setHyperformula = true
  ) {
    const sheetId = simpleCellAddress.sheet
    const cellId = simpleCellAddress.toCellId()

    if (!this._spreadsheetData.cells) {
      this._spreadsheetData.cells = {}
    }

    if (!this._spreadsheetData.sheets![sheetId].cells) {
      this._spreadsheetData.sheets![sheetId].cells = {}
    }

    this._spreadsheetData.sheets![sheetId].cells![cellId] = cellId

    this._spreadsheetData.cells[cellId] = {
      ...this._spreadsheetData.cells?.[cellId],
      ...cell,
      id: cellId
    }

    try {
      if (
        this._spreadsheet.hyperformula.isItPossibleToSetCellContents(
          simpleCellAddress
        ) &&
        setHyperformula
      ) {
        const { value, ...metadata } = this._spreadsheetData.cells[cellId]

        this._spreadsheet.hyperformula.setCellContents(simpleCellAddress, {
          cellValue: value,
          metadata
        })
      }
    } catch (e) {
      console.error(e, simpleCellAddress)
    }
  }

  deleteCell(
    simpleCellAddress: SimpleCellAddress,
    setHyperformula = true,
    deleteMergedCell = true
  ) {
    const sheetId = simpleCellAddress.sheet
    const cellId = simpleCellAddress.toCellId()

    if (deleteMergedCell) {
      this.deleteMergedCell(simpleCellAddress)
    }

    if (
      this._spreadsheet.hyperformula.isItPossibleToSetCellContents(
        simpleCellAddress
      ) &&
      setHyperformula
    ) {
      this._spreadsheet.hyperformula.setCellContents(
        simpleCellAddress,
        undefined
      )
    }
    delete this._spreadsheetData.cells?.[cellId]
    delete this._spreadsheetData.sheets?.[sheetId]?.cells?.[cellId]
  }

  setMergedCell(
    simpleCellAddress: SimpleCellAddress,
    mergedCell: Omit<IMergedCellData, 'id'>
  ) {
    const sheetId = simpleCellAddress.sheet
    const mergedCellId = simpleCellAddress.toCellId()

    if (!this._spreadsheetData.mergedCells) {
      this._spreadsheetData.mergedCells = {}
    }

    if (!this._spreadsheetData.sheets![sheetId].mergedCells) {
      this._spreadsheetData.sheets![sheetId].mergedCells = {}
    }

    const newMergedCell = {
      ...this._spreadsheetData.mergedCells[mergedCellId],
      row: {
        ...this._spreadsheetData.mergedCells[mergedCellId]?.row,
        ...mergedCell.row
      },
      col: {
        ...this._spreadsheetData.mergedCells[mergedCellId]?.col,
        ...mergedCell.col
      },
      id: mergedCellId
    }

    const rangeSimpleCellAddress = RangeSimpleCellAddress.mergedCellToAddress(
      newMergedCell
    )

    this._spreadsheet.hyperformula.batch(() => {
      for (const ri of rangeSimpleCellAddress.iterateFromTopToBottom('row')) {
        for (const ci of rangeSimpleCellAddress.iterateFromTopToBottom('col')) {
          const simpleCellAddress = new SimpleCellAddress(
            rangeSimpleCellAddress.topLeftSimpleCellAddress.sheet,
            ri,
            ci
          )

          const associatedTopLeftMergedCellId = this._spreadsheet.sheets.merger
            .associatedMergedCellAddressMap[simpleCellAddress.toCellId()]

          if (
            simpleCellAddress.toCellId() !== mergedCellId &&
            associatedTopLeftMergedCellId
          ) {
            this._spreadsheet.data.deleteCell(
              SimpleCellAddress.cellIdToAddress(associatedTopLeftMergedCellId)
            )
          }

          if (simpleCellAddress.toCellId() !== mergedCellId) {
            this._spreadsheet.data.deleteCell(simpleCellAddress)
          }
        }
      }
    })

    this._spreadsheetData.sheets![sheetId].mergedCells![
      mergedCellId
    ] = mergedCellId

    this._spreadsheetData.mergedCells[mergedCellId] = newMergedCell

    const mergedCellResult = this._spreadsheetData.mergedCells[mergedCellId]

    if (
      mergedCellResult.col.x === mergedCellResult.col.y &&
      mergedCellResult.row.x === mergedCellResult.row.y
    ) {
      this.deleteMergedCell(simpleCellAddress)
    }

    this._spreadsheet.sheets.merger._setAssociatedMergedCellIds(
      simpleCellAddress
    )
  }

  deleteMergedCell(simpleCellAddress: SimpleCellAddress) {
    const sheetId = simpleCellAddress.sheet
    const mergedCellId = simpleCellAddress.toCellId()

    this._spreadsheet.sheets.merger._deleteAssociatedMergedCellIds(
      simpleCellAddress
    )

    delete this._spreadsheetData.sheets?.[sheetId].mergedCells?.[mergedCellId]
    delete this._spreadsheetData.mergedCells?.[mergedCellId]
  }

  setFrozenCell(sheetId: SheetId, frozenCell?: Omit<IFrozenCellData, 'id'>) {
    if (!this._spreadsheetData.frozenCells) {
      this._spreadsheetData.frozenCells = {}
    }

    this._spreadsheetData.sheets![sheetId].frozenCell = sheetId

    this._spreadsheetData.frozenCells[sheetId] = {
      ...this._spreadsheetData.frozenCells?.[sheetId],
      ...frozenCell,
      id: sheetId
    }

    const frozenCellResult = this._spreadsheetData.frozenCells?.[sheetId]

    if (!isNil(frozenCellResult?.col) && frozenCellResult?.col < 0) {
      delete frozenCellResult?.col
    }

    if (!isNil(frozenCellResult?.row) && frozenCellResult?.row < 0) {
      delete frozenCellResult?.row
    }

    if (isNil(frozenCellResult?.col) && isNil(frozenCellResult?.row)) {
      this.deleteFrozenCell(sheetId)
    }
  }

  deleteFrozenCell(sheetId: SheetId) {
    delete this._spreadsheetData.sheets?.[sheetId].frozenCell
    delete this._spreadsheetData.frozenCells?.[sheetId]
  }

  setRowCol(
    pluralType: RowColsType,
    rowColAddress: RowColAddress,
    rowColData?: Omit<IRowColData, 'id'>
  ) {
    const sheetId = rowColAddress.sheet
    const sheetRowColId = rowColAddress.toSheetRowColId()

    if (!this._spreadsheetData[pluralType]) {
      this._spreadsheetData[pluralType] = {}
    }

    if (!this._spreadsheetData.sheets![sheetId][pluralType]) {
      this._spreadsheetData.sheets![sheetId][pluralType] = {}
    }

    this._spreadsheetData.sheets![sheetId][pluralType]![
      sheetRowColId
    ] = sheetRowColId

    this._spreadsheetData[pluralType]![sheetRowColId] = {
      ...this._spreadsheetData[pluralType]![sheetRowColId],
      ...rowColData,
      id: sheetRowColId
    }
  }

  deleteRowCol(pluralType: RowColsType, rowColAddress: RowColAddress) {
    const sheetId = rowColAddress.sheet
    const sheetRowColId = rowColAddress.toSheetRowColId()

    delete this._spreadsheetData.sheets?.[sheetId]?.[pluralType]?.[
      sheetRowColId
    ]
    delete this._spreadsheetData?.[pluralType]?.[sheetRowColId]
  }
}

export default Data
