import { Rect, RectConfig } from 'konva/lib/shapes/Rect'
import Sheets from '../../Sheets'
import Cell from './Cell'
import { getInnerRectConfig } from './getInnerRectConfig'
import SimpleCellAddress from './SimpleCellAddress'

/**
 * @internal
 */
class SelectedCell extends Cell {
  innerRect: Rect

  constructor(
    protected sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress
  ) {
    super(sheets, simpleCellAddress)

    this.innerRect = new Rect({
      name: 'innerRect'
    })
    this.group.add(this.innerRect)

    this.setInnerRectProperties()
  }

  private setInnerRectProperties() {
    const size = this.rect.size()

    const rectConfig: RectConfig = {
      ...this.sheets.spreadsheet.styles.selectionFirstCell.rect
    }

    const innerRectConfig = getInnerRectConfig(
      this.sheets.spreadsheet.styles.selectionFirstCell.innerRect,
      size
    )

    this.rect.setAttrs(rectConfig)
    this.innerRect.setAttrs(innerRectConfig)
  }
}

export default SelectedCell
