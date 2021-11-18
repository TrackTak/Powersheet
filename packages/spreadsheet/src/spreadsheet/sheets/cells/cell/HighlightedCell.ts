import { Rect, RectConfig } from 'konva/lib/shapes/Rect'
import Sheets from '../../Sheets'
import Cell from './Cell'
import { getInnerRectConfig } from './getInnerRectConfig'
import RangeSimpleCellAddress from './RangeSimpleCellAddress'
import SimpleCellAddress from './SimpleCellAddress'

/**
 * @internal
 */
class HighlightedCell extends Cell {
  innerRect: Rect

  constructor(
    protected sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress,
    public color: string
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
    const stroke = this.color

    const rectConfig: RectConfig = {
      ...this.sheets.spreadsheet.styles.highlightedCell.rect,
      fill: this.color
    }

    const innerRectConfig = getInnerRectConfig(
      {
        ...this.sheets.spreadsheet.styles.highlightedCell.innerRect,
        stroke
      },
      size
    )

    this.rect.setAttrs(rectConfig)
    this.innerRect.setAttrs(innerRectConfig)
  }

  override setRangeCellAddress = (
    rangeSimpleCellAddress: RangeSimpleCellAddress
  ) => {
    super.setRangeCellAddress(rangeSimpleCellAddress)

    this.setInnerRectProperties()
  }
}

export default HighlightedCell
