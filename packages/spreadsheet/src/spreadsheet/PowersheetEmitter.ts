import { KonvaEventObject } from 'konva/lib/Node'
import { TypedEmitter } from 'tiny-typed-emitter'
import SelectedCell from './sheets/cells/cell/SelectedCell'
import { IPersistedData } from './sheets/Data'
import { ISelectionArea } from './sheets/Selector'

export interface PowersheetEvents {
  scrollVertical: (e: Event, scroll: number) => void
  scrollHorizontal: (e: Event, scroll: number) => void
  scrollVerticalWheel: (e: KonvaEventObject<WheelEvent>) => void
  cellEditorChange: (value: string | null) => void
  resizeRowStart: (e: KonvaEventObject<DragEvent>) => void
  resizeRowMove: (e: KonvaEventObject<DragEvent>, axis: number) => void
  resizeRowEnd: (e: KonvaEventObject<DragEvent>, size: number) => void
  resizeColStart: (e: KonvaEventObject<DragEvent>) => void
  resizeColMove: (e: KonvaEventObject<DragEvent>, axis: number) => void
  resizeColEnd: (e: KonvaEventObject<DragEvent>, size: number) => void
  historyPush: (stringifiedSpreadsheetData: string) => void
  persistData: (data: IPersistedData, done: () => void) => void
  selectCell: (simpleCellAddress: SelectedCell) => void
  startSelection: (selectionArea: SelectedCell) => void
  moveSelection: (selectionArea: ISelectionArea) => void
  endSelection: (selectionArea: ISelectionArea) => void
}

class PowersheetEmitter extends TypedEmitter<PowersheetEvents> {
  constructor() {
    super()
  }
}

export default PowersheetEmitter
