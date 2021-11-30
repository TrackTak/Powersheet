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
    protected _sheets: Sheets,
    public simpleCellAddress: SimpleCellAddress
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

    const rectConfig: RectConfig = {
      ...this._sheets._spreadsheet.styles.selectionFirstCell.rect
    }

    const innerRectConfig = getInnerRectConfig(
      this._sheets._spreadsheet.styles.selectionFirstCell.innerRect,
      size
    )

    this.rect.setAttrs(rectConfig)
    this.innerRect.setAttrs(innerRectConfig)
  }
}

export default SelectedCell
