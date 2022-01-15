import type { ColInfo, RowInfo, WorkSheet, XLSX$Utils } from 'xlsx'
import Spreadsheet from './Spreadsheet'
import { isNil } from 'lodash'
import { isText, isDate, isPercent } from 'numfmt'
import RangeSimpleCellAddress from './sheets/cells/cell/RangeSimpleCellAddress'
import SimpleCellAddress from './sheets/cells/cell/SimpleCellAddress'
import {
  CellType,
  CellValue,
  FunctionPluginDefinition
} from '@tracktak/hyperformula'
// TODO: Make dynamic async import when https://github.com/parcel-bundler/parcel/issues/7268 is fixed
// @ts-ignore
import { writeFile, utils } from 'xlsx/dist/xlsx.mini.min'
import { ICellMetadata, ISheetMetadata } from './sheets/Data'
import Merger from './sheets/Merger'
import RowColAddress, { SheetRowColId } from './sheets/cells/cell/RowColAddress'

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

  private async _getWorkbook(utils: XLSX$Utils) {
    const workbook = utils.book_new()
    const sheets = this._spreadsheet.hyperformula.getSheetNames()

    for (const name in sheets) {
      const sheetId = this._spreadsheet.hyperformula.getSheetId(name)!
      const worksheet = await this._getWorksheet(sheetId)

      utils.book_append_sheet(workbook, worksheet, name)
    }

    return workbook
  }

  private async _getWorksheet(sheetId: number) {
    const worksheet: WorkSheet = {}

    const rangeSimpleCellAddress = new RangeSimpleCellAddress(
      new SimpleCellAddress(sheetId, 0, 0),
      new SimpleCellAddress(sheetId, 0, 0)
    )

    const sheetMetadata = this._spreadsheet.hyperformula.getSheetMetadata<ISheetMetadata>(
      sheetId
    )

    const { cells } = this._spreadsheet.hyperformula.getSheetSerialized<
      ISheetMetadata,
      ICellMetadata
    >(sheetId)

    for (let row = 0; row < cells.length; row++) {
      const rowData = cells[row]

      for (let col = 0; col < rowData.length; col++) {
        const cell = rowData[col]

        if (!cell) continue

        const simpleCellAddress = new SimpleCellAddress(sheetId, row, col)
        const cellId = simpleCellAddress.toCellId()
        const cellString = simpleCellAddress.addressToString()
        const isMergedCell = this._merger.getIsCellTopLeftMergedCell(
          simpleCellAddress
        )

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

        if (
          this._spreadsheet.hyperformula.doesCellHaveFormula(simpleCellAddress)
        ) {
          worksheet[cellString].f = cell.cellValue?.toString()?.slice(1)

          const setFormula = async (functionName: string) => {
            // TODO: Not perfect regex, doesn't handle nested custom functions
            const regex = new RegExp(`${functionName}\\(.*?\\)`, 'g')
            const matches = worksheet[cellString].f?.match(regex) ?? []

            // Replace any custom function calls with
            // the actual value because excel won't support
            // custom functions natively
            for (const match of matches) {
              // TODO: await promise when we fix HF
              let [
                formulaResult
              ] = this._spreadsheet.hyperformula.calculateFormula(
                `=${match}`,
                simpleCellAddress.sheet
              )

              let cellType = this._spreadsheet.hyperformula.getCellType(
                simpleCellAddress
              )

              if (
                cellType === CellType.ARRAY ||
                cellType === CellType.ARRAYFORMULA
              ) {
                ;(formulaResult as CellValue[][]).forEach((colData, row) => {
                  colData.forEach((data, col) => {
                    const cellString = new SimpleCellAddress(
                      simpleCellAddress.sheet,
                      simpleCellAddress.row + row,
                      simpleCellAddress.col + col
                    ).addressToString()

                    let type

                    if (isNil(data)) {
                      type = 'z'
                    } else if (isNaN(Number(data))) {
                      type = 's'
                    } else {
                      type = 'n'
                    }

                    worksheet[cellString] = {
                      ...worksheet[cellString],
                      t: type,
                      v: data
                    }
                  })
                })
                delete worksheet[cellString].f
                delete cell.cellValue
              } else if (cellType === CellType.FORMULA) {
                if (typeof formulaResult === 'string') {
                  if (formulaResult) {
                    formulaResult = `"${formulaResult}"`
                  } else {
                    formulaResult = '0'
                  }
                }

                worksheet[cellString].f = worksheet[cellString].f?.replace(
                  match,
                  formulaResult?.toString() ?? ''
                )

                worksheet[cellString].t = 's'
              }
            }
          }

          for (const { aliases, implementedFunctions } of this
            .customRegisteredPluginDefinitions) {
            for (const key in aliases ?? {}) {
              await setFormula(key)
            }

            for (const key in implementedFunctions ?? {}) {
              await setFormula(key)
            }
          }
        }

        const value = worksheet[cellString].v ?? cell?.cellValue

        let type

        let textFormatPattern = cell?.metadata?.textFormatPattern

        if (isPercent(value)) {
          textFormatPattern = undefined
        }

        if (isNil(value) && isNil(textFormatPattern)) {
          type = 'z'
        } else if (isText(textFormatPattern) || isNil(textFormatPattern)) {
          type = 's'
        } else if (isDate(textFormatPattern)) {
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
              r: simpleCellAddress.row + height,
              c: simpleCellAddress.col + width
            }
          })
        }
      }
    }

    worksheet[
      '!ref'
    ] = `${rangeSimpleCellAddress.topLeftSimpleCellAddress.addressToString()}:${rangeSimpleCellAddress.bottomRightSimpleCellAddress.addressToString()}`

    const colInfos: ColInfo[] = []
    const rowInfos: RowInfo[] = []

    Object.keys(sheetMetadata.colSizes).forEach(key => {
      const sheetColId = key as SheetRowColId
      const address = RowColAddress.sheetRowColIdToAddress(sheetColId)
      const size = sheetMetadata.colSizes[address.rowCol]

      colInfos[address.rowCol] = {
        wpx: size
      }
    })

    Object.keys(sheetMetadata.rowSizes).forEach(key => {
      const sheetRowId = key as SheetRowColId
      const address = RowColAddress.sheetRowColIdToAddress(sheetRowId)
      const size = sheetMetadata.rowSizes[address.rowCol]

      rowInfos[address.rowCol] = {
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

  async exportWorkbook() {
    const workbook = await this._getWorkbook(utils)

    writeFile(
      workbook,
      this._spreadsheet.spreadsheetData.exportSpreadsheetName ??
        this._spreadsheet.options.exportSpreadsheetName
    )
  }
}

export default Exporter
