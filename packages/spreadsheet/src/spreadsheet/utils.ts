import { DataRawCellContent, SimpleCellAddress } from '@tracktak/hyperformula'
import { SheetCellAddress } from '@tracktak/hyperformula/typings/Cell'
import { GenericDataRawCellContent } from '@tracktak/hyperformula/typings/CellContentParser'
import { Maybe } from '@tracktak/hyperformula/typings/Maybe'
import { GenericSheets, Sheets } from '@tracktak/hyperformula/typings/Sheet'
import { IRect, Vector2d } from 'konva/lib/types'
import { CellId, SheetCellId } from './sheets/cells/cell/SimpleCellAddress'
import { ICellMetadata, SerializedSheets } from './sheets/Data'

export const prefix = 'powersheet'

export const rotatePoint = (
  { x, y }: { x: number; y: number },
  rad: number
) => {
  const rcos = Math.cos(rad)
  const rsin = Math.sin(rad)
  return { x: x * rcos - y * rsin, y: y * rcos + x * rsin }
}

export const dataKeysComparer = (x: string, y: string) => {
  return new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base'
  }).compare(x, y)
}

export const isStringAFormula = (str: string | null | undefined) =>
  str?.startsWith('=')

export const centerRectTwoInRectOne = (rectOne: IRect, rectTwo: IRect) => {
  const rectOneMidPoint = {
    x: rectOne.width / 2,
    y: rectOne.height / 2
  }

  const rectTwoMidPoint = {
    x: rectTwo.width / 2,
    y: rectTwo.height / 2
  }

  return {
    x: rectOneMidPoint.x - rectTwoMidPoint.x,
    y: rectOneMidPoint.y - rectTwoMidPoint.y
  }
}

export const reverseVectorsIfStartBiggerThanEnd = (
  start: Vector2d,
  end: Vector2d
) => {
  const newStart = { ...start }
  const newEnd = { ...end }

  if (start.x > end.x) {
    const temp = start.x

    newStart.x = end.x
    newEnd.x = temp
  }

  if (start.y > end.y) {
    const temp = start.y

    newStart.y = end.y
    newEnd.y = temp
  }

  return {
    start: newStart,
    end: newEnd
  }
}

export const mapFromSheetsToSerializedSheets = (
  sheets: GenericSheets<Maybe<DataRawCellContent>, any>
) => {
  const serializedSheets: SerializedSheets = {}

  for (const sheetName in sheets) {
    const sheet = sheets[sheetName]
    const cells: Record<CellId, GenericDataRawCellContent<ICellMetadata>> = {}

    sheet.cells.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const cellId = addressToCellId({ row: ri, col: ci })

        if (cell) {
          cells[cellId] = {
            cellValue: cell.cellValue,
            metadata: cell.metadata
          }
        }
      })
    })

    serializedSheets[sheetName] = {
      cells,
      sheetMetadata: sheet.sheetMetadata
    }
  }

  return serializedSheets
}

export const mapFromSerializedSheetsToSheets = (
  serializedSheets: SerializedSheets
) => {
  const sheets: Sheets = {}

  for (const sheetName in serializedSheets) {
    const sheet = serializedSheets[sheetName]
    const cells: DataRawCellContent[][] = []

    for (const key in sheet.cells) {
      const cellId = key as CellId
      const cell = sheet.cells[cellId]!
      const { row, col } = cellIdToAddress(cellId)

      if (cell) {
        if (!cells[row]) {
          cells[row] = []
        }

        cells[row][col] = cell
      }
    }

    sheets[sheetName] = {
      cells,
      sheetMetadata: {
        ...getDefaultSheetMetadata(),
        ...sheet.sheetMetadata
      }
    }
  }
  return sheets
}

export const getDefaultSheetMetadata = () => {
  return {
    rowSizes: {},
    colSizes: {},
    mergedCells: {}
  }
}

export const addressToSheetCellId = ({
  sheet,
  row,
  col
}: SimpleCellAddress): SheetCellId => {
  return `${sheet}_${row}_${col}`
}

export const addressToCellId = ({ row, col }: SheetCellAddress): CellId => {
  return `${row}_${col}`
}

export const sheetCellIdToAddress = (
  sheetCellId: SheetCellId
): SimpleCellAddress => {
  const sections = sheetCellId.split('_')
  const sheet = parseInt(sections[0], 10)
  const row = parseInt(sections[1], 10)
  const col = parseInt(sections[2], 10)

  return {
    sheet,
    row,
    col
  }
}

export const cellIdToAddress = (cellId: CellId): SheetCellAddress => {
  const sections = cellId.split('_')
  const row = parseInt(sections[0], 10)
  const col = parseInt(sections[1], 10)

  return {
    row,
    col
  }
}

// Taken from: https://codereview.stackexchange.com/questions/16124/implement-numbering-scheme-like-a-b-c-aa-ab-aaa-similar-to-converting
export const getColumnHeader = (number: number) => {
  const baseChar = 'A'.charCodeAt(0)
  let columnHeader = ''

  do {
    number -= 1
    columnHeader = String.fromCharCode(baseChar + (number % 26)) + columnHeader
    number = (number / 26) >> 0 // quick `floor`
  } while (number > 0)

  return columnHeader
}

export const setCaretToEndOfElement = (node: Node) => {
  const range = document.createRange()
  const sel = window.getSelection()

  range.selectNodeContents(node)
  range.collapse(false)

  sel?.removeAllRanges()
  sel?.addRange(range)

  range.detach()
}

export const saveCaretPosition = (node: Node) => {
  const selection = window.getSelection()
  const range = selection?.getRangeAt(0)

  range?.setStart(node, 0)

  const length = range?.toString().length

  return () => {
    if (!length) return

    const { position, node: newNode } = getTextNodeAtPosition(node, length)

    selection?.removeAllRanges()

    const range = new Range()

    range.setStart(newNode, position)
    selection?.addRange(range)
  }
}
export const getCaretPosition = (node: Node) => {
  const selection = window.getSelection()

  const range = selection?.getRangeAt(0)!
  const treeWalker = document.createTreeWalker(
    node,
    undefined,
    function (node) {
      const nodeRange = document.createRange()
      nodeRange.selectNodeContents(node)
      return nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    }
  )

  let charCount = 0,
    lastNodeLength = 0

  if (range.startContainer.nodeType == 3) {
    charCount += range.startOffset
  }

  while (treeWalker.nextNode()) {
    charCount += lastNodeLength
    lastNodeLength = 0

    if (range.startContainer != treeWalker.currentNode) {
      if (treeWalker.currentNode instanceof Text) {
        lastNodeLength += treeWalker.currentNode.length
      } else if (
        treeWalker.currentNode instanceof HTMLBRElement ||
        treeWalker.currentNode instanceof HTMLImageElement
      ) {
        lastNodeLength++
      }
    }
  }

  return charCount + lastNodeLength
}

const getTextNodeAtPosition = (node: Node, index: number) => {
  const NODE_TYPE = NodeFilter.SHOW_TEXT
  const treeWalker = document.createTreeWalker(node, NODE_TYPE, elem => {
    if (elem.textContent && index > elem.textContent.length) {
      index -= elem.textContent.length

      return NodeFilter.FILTER_REJECT
    }
    return NodeFilter.FILTER_ACCEPT
  })

  const c = treeWalker.nextNode()

  return {
    node: c ? c : node,
    position: index
  }
}
