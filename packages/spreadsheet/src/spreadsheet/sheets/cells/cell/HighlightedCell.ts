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
    protected _sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress,
    public color: string
  ) {
    super(_sheets, simpleCellAddress)

    this.innerRect = new Rect({
      name: 'innerRect'
    })
    this.group.add(this.innerRect)

    this._setInnerRectProperties()
  }

  private _setInnerRectProperties() {
    const size = this.rect.size()
    const stroke = this.color

    const rectConfig: RectConfig = {
      ...this._sheets._spreadsheet.styles.highlightedCell.rect,
      fill: this.color
    }

    const innerRectConfig = getInnerRectConfig(
      {
        ...this._sheets._spreadsheet.styles.highlightedCell.innerRect,
        stroke
      },
      size
    )

    this.rect.setAttrs(rectConfig)
    this.innerRect.setAttrs(innerRectConfig)
  }

  override _setRangeCellAddress = (
    rangeSimpleCellAddress: RangeSimpleCellAddress
  ) => {
    super._setRangeCellAddress(rangeSimpleCellAddress)

    this._setInnerRectProperties()
  }
}

export default HighlightedCell
