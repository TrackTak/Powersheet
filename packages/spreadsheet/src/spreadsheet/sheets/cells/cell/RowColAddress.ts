import { RowColId } from '../../rowCols/RowCols';
import { SheetId } from '../../Sheets';

export type SheetRowColId = `${SheetId}_${RowColId}`;

class RowColAddress {
  constructor(public sheet: number, public rowCol: number) {
    this.sheet = sheet;
    this.rowCol = rowCol;
  }

  static sheetRowColIdToAddress(sheetRowColId: SheetRowColId) {
    const sections = sheetRowColId.split('_');
    const sheet = parseInt(sections[0], 10);
    const rowCol = parseInt(sections[1], 10);

    return new RowColAddress(sheet, rowCol);
  }

  toSheetRowColId(): SheetRowColId {
    return `${this.sheet}_${this.rowCol}`;
  }
}

export default RowColAddress;
