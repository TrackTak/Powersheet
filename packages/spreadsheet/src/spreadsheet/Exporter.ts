import type { ColInfo, RowInfo, WorkSheet, XLSX$Utils } from 'xlsx'
import Spreadsheet from './Spreadsheet'
import { isNil } from 'lodash'
import numfmt from 'numfmt'
import RangeSimpleCellAddress from './sheets/cells/cell/RangeSimpleCellAddress'
import SimpleCellAddress from './sheets/cells/cell/SimpleCellAddress'
import { FunctionPluginDefinition } from '@tracktak/hyperformula'
// TODO: Make dynamic async import when https://github.com/parcel-bundler/parcel/issues/7268 is fixed
// @ts-ignore
import { writeFile, utils } from 'xlsx/dist/xlsx.mini.min'
import { ICellMetadata, ISheetMetadata } from './sheets/Data'
import Merger from './sheets/Merger'
import NP from 'number-precision'

export interface ICustomRegisteredPluginDefinition {
  implementedFunctions: FunctionPluginDefinition['implementedFunctions']
  aliases?: FunctionPluginDefinition['aliases']
}

class Exporter {
  private _spreadsheet!: Spreadsheet
  private _merger!: Merger

  /**
   *
   * @param customRegisteredPluginDefinitions Any custom functions that
   * you have defined in hyperformula won't be available in Excel
   * when you export them unless you have a plugin for them in Excel.
   * So you can pass in them here and we convert it to formulas instead.
   */
  constructor(
    public customRegisteredPluginDefinitions: ICustomRegisteredPluginDefinition[] = []
  ) {}

  private _getWorkbook(utils: XLSX$Utils) {
    const workbook = utils.book_new()
    const sheets = this._spreadsheet.hyperformula.getSheetNames()

    for (const name of sheets) {
      const sheetId = this._spreadsheet.hyperformula.getSheetId(name)!
      const worksheet = this._getWorksheet(sheetId)

      utils.book_append_sheet(workbook, worksheet, name)
    }

    return workbook
  }

  private _getWorksheet(sheetId: number) {
    const worksheet: WorkSheet = {}

    const rangeSimpleCellAddress = new RangeSimpleCellAddress(
      new SimpleCellAddress(sheetId, 0, 0),
      new SimpleCellAddress(sheetId, 0, 0)
    )

    const sheetMetadata =
      this._spreadsheet.hyperformula.getSheetMetadata<ISheetMetadata>(sheetId)

    const { cells } = this._spreadsheet.hyperformula.getSheetValues<
      ISheetMetadata,
      ICellMetadata
    >(sheetId)

    cells.forEach((rowData, row) => {
      rowData.forEach((cell, col) => {
        if (cell) {
          const simpleCellAddress = new SimpleCellAddress(sheetId, row, col)
          const serializedCell =
            this._spreadsheet.hyperformula.getCellSerialized<ICellMetadata>(
              simpleCellAddress
            )
          const cellId = simpleCellAddress.toCellId()
          const cellString = simpleCellAddress.addressToString()
          const isMergedCell =
            this._merger.getIsCellTopLeftMergedCell(simpleCellAddress)

          rangeSimpleCellAddress.topLeftSimpleCellAddress.row = Math.min(
            simpleCellAddress.row,
            rangeSimpleCellAddress.topLeftSimpleCellAddress.row
          )
          rangeSimpleCellAddress.topLeftSimpleCellAddress.col = Math.min(
            simpleCellAddress.col,
            rangeSimpleCellAddress.topLeftSimpleCellAddress.col
          )

          rangeSimpleCellAddress.bottomRightSimpleCellAddress.row = Math.max(
            simpleCellAddress.row,
            rangeSimpleCellAddress.bottomRightSimpleCellAddress.row
          )
          rangeSimpleCellAddress.bottomRightSimpleCellAddress.col = Math.max(
            simpleCellAddress.col,
            rangeSimpleCellAddress.bottomRightSimpleCellAddress.col
          )

          worksheet[cellString] = {
            ...worksheet[cellString]
          }

          let value =
            worksheet[cellString].v ??
            serializedCell?.cellValue ??
            cell.cellValue

          if (
            this._spreadsheet.hyperformula.doesCellHaveFormula(
              simpleCellAddress
            )
          ) {
            worksheet[cellString].f = serializedCell?.cellValue
              ?.toString()
              ?.slice(1)

            const getValue = (functionName: string) => {
              const match = worksheet[cellString].f?.match(functionName)

              if (match) {
                const cellValue = cell.cellValue

                return cellValue
              }
              return
            }

            this.customRegisteredPluginDefinitions.forEach(
              ({ aliases, implementedFunctions }) => {
                for (const key in implementedFunctions ?? {}) {
                  const newValue = getValue(key)

                  if (newValue !== undefined) {
                    value = newValue
                    worksheet[cellString].f = undefined
                    return
                  }
                }

                for (const key in aliases ?? {}) {
                  const newValue = getValue(key)

                  if (newValue !== undefined) {
                    value = newValue
                    worksheet[cellString].f = undefined
                    return
                  }
                }
              }
            )
          }

          let type

          let textFormatPattern = serializedCell?.metadata?.textFormatPattern
            ? this._spreadsheet.parseDynamicPattern(
                serializedCell?.metadata?.textFormatPattern
              )
            : undefined

          const formatter = numfmt(textFormatPattern)

          const cellType =
            this._spreadsheet.hyperformula.getCellType(simpleCellAddress)

          // TODO: Fix this in HF later
          const cellValueType = isNil(cell.cellValue)
            ? 'EMPTY'
            : this._spreadsheet.hyperformula.getCellValueType(simpleCellAddress)

          // TODO: Fix this in HF later
          const cellValueDetailedType = isNil(cell.cellValue)
            ? 'EMPTY'
            : this._spreadsheet.hyperformula.getCellValueDetailedType(
                simpleCellAddress
              )

          if (
            typeof value === 'string' &&
            cellType === 'VALUE' &&
            cellValueDetailedType === 'NUMBER_RAW'
          ) {
            value = parseFloat(value)
          }

          if (
            formatter.isPercent() &&
            cellType === 'VALUE' &&
            cellValueDetailedType === 'NUMBER_PERCENT'
          ) {
            value = NP.divide(parseFloat(value.slice(0, -1)), 100)
          }

          if (cellValueType === 'EMPTY') {
            type = 'z'
          } else if (cellValueType === 'STRING') {
            type = 's'
          } else if (cellValueDetailedType === 'NUMBER_DATE') {
            type = 'd'
          } else {
            type = 'n'
          }

          if (value) {
            worksheet[cellString].v = value
          }

          worksheet[cellString].z = textFormatPattern
          worksheet[cellString].t = type

          if (isMergedCell) {
            const { width, height } = sheetMetadata.mergedCells[cellId]

            if (!worksheet['!merges']) {
              worksheet['!merges'] = []
            }

            worksheet['!merges'].push({
              s: {
                r: simpleCellAddress.row,
                c: simpleCellAddress.col
              },
              e: {
                r: simpleCellAddress.row + height - 1,
                c: simpleCellAddress.col + width - 1
              }
            })
          }
        }
      })
    })

    worksheet[
      '!ref'
    ] = `${rangeSimpleCellAddress.topLeftSimpleCellAddress.addressToString()}:${rangeSimpleCellAddress.bottomRightSimpleCellAddress.addressToString()}`

    const colInfos: ColInfo[] = []
    const rowInfos: RowInfo[] = []

    Object.keys(sheetMetadata.colSizes).forEach(key => {
      const colId = parseInt(key)
      const size = sheetMetadata.colSizes[colId]

      colInfos[colId] = {
        wpx: size
      }
    })

    Object.keys(sheetMetadata.rowSizes).forEach(key => {
      const rowId = parseInt(key)
      const size = sheetMetadata.rowSizes[rowId]

      rowInfos[rowId] = {
        hpx: size
      }
    })

    worksheet['!cols'] = colInfos
    worksheet['!rows'] = rowInfos

    return worksheet
  }

  /**
   * @param spreadsheet - The spreadsheet that this Exporter is connected to.
   */
  initialize(spreadsheet: Spreadsheet, merger: Merger) {
    this._spreadsheet = spreadsheet
    this._merger = merger
  }

  exportWorkbook() {
    const workbook = this._getWorkbook(utils)

    writeFile(
      workbook,
      this._spreadsheet.spreadsheetData.exportSpreadsheetName ??
        this._spreadsheet.options.exportSpreadsheetName
    )
  }
}

export default Exporter
