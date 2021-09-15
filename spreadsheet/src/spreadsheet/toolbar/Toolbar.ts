import styles from './Toolbar.module.scss';
import { delegate, DelegateInstance } from 'tippy.js';
import { ACPController } from 'a-color-picker';
import {
  BorderStyle,
  getCellRectFromCell,
  getCellTextFromCell,
  HorizontalTextAlign,
  ICellStyle,
  TextWrap,
  VerticalTextAlign,
} from '../sheetsGroup/sheet/Sheet';
import {
  ColorPickerIconName,
  createBordersContent,
  createColorBar,
  createColorPickerContent,
  createDropdownIconButton,
  createFunctionDropdownContent,
  createHorizontalTextAlignContent,
  createTooltip,
  createVerticalTextAlignContent,
  DropdownIconName,
  HorizontalTextAlignName,
  IconElementsName,
  toggleIconNames,
  toolbarPrefix,
  VerticalTextAlignName,
} from './toolbarHtmlElementHelpers';
import {
  createGroup,
  createIconButton,
  IIconElements,
} from '../htmlElementHelpers';
import Spreadsheet from '../Spreadsheet';
import { Group } from 'konva/lib/Group';
import { Cell, CellId } from '../sheetsGroup/sheet/CellRenderer';

export interface IToolbarActionGroups {
  elements: HTMLElement[];
}

interface IDropdownElements {
  arrowContainer?: HTMLSpanElement;
  arrowIcon?: HTMLElement;
  tooltip: HTMLSpanElement;
  dropdownContent: HTMLDivElement;
}

interface IColorPickerElements {
  picker: ACPController;
  colorPicker: HTMLDivElement;
  colorBar: HTMLSpanElement;
}

interface IBorderElements {
  borderGroups: [HTMLDivElement, HTMLDivElement];
}

interface IFunctionElement {
  registeredFunctionButtons: HTMLButtonElement[];
}

class Toolbar {
  toolbarEl: HTMLDivElement;
  iconElementsMap: Record<IconElementsName, IIconElements>;
  dropdownIconMap: Record<DropdownIconName, IDropdownElements>;
  colorPickerElementsMap: Record<ColorPickerIconName, IColorPickerElements>;
  borderElements: IBorderElements;
  functionElement: IFunctionElement;
  toolbarActionGroups: IToolbarActionGroups[];
  tooltip: DelegateInstance;
  dropdown: DelegateInstance;

  constructor(private spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.classList.add(styles.toolbar, toolbarPrefix);

    this.iconElementsMap = {} as Record<string, IIconElements>;
    this.dropdownIconMap = {} as Record<DropdownIconName, IDropdownElements>;
    this.colorPickerElementsMap = {} as Record<
      ColorPickerIconName,
      IColorPickerElements
    >;
    this.borderElements = {} as IBorderElements;
    this.functionElement = {} as IFunctionElement;

    toggleIconNames.forEach((name) => {
      switch (name) {
        case 'backgroundColor': {
          this.setDropdownColorPicker(name);

          this.colorPickerElementsMap.backgroundColor.picker.on(
            'change',
            (_, color) => {
              this.setValue(name, color);
            }
          );
          break;
        }
        case 'fontColor': {
          this.setDropdownColorPicker(name);

          this.colorPickerElementsMap.fontColor.picker.on(
            'change',
            (_, fontColor) => {
              this.setValue(name, fontColor);
            }
          );
          break;
        }
        case 'borders': {
          const {
            dropdownContent,
            borderGroups,
            firstBordersRow,
            secondBordersRow,
          } = createBordersContent();

          this.setDropdownContent(name, dropdownContent, true);

          this.borderElements = {
            borderGroups,
          };

          const setBorders = (bordersRow: Object) => {
            Object.keys(bordersRow).forEach((key) => {
              const name = key as IconElementsName;
              // @ts-ignore
              const value = bordersRow[key];

              this.iconElementsMap[name] = value;
            });
          };

          setBorders(firstBordersRow);
          setBorders(secondBordersRow);

          break;
        }
        case 'horizontalTextAlign': {
          const { dropdownContent, aligns } =
            createHorizontalTextAlignContent();

          this.setDropdownContent(name, dropdownContent, true);

          Object.keys(aligns).forEach((key) => {
            const name = key as HorizontalTextAlignName;
            const value = aligns[name];

            this.iconElementsMap[name] = value;
          });

          break;
        }
        case 'verticalTextAlign': {
          const { dropdownContent, aligns } = createVerticalTextAlignContent();

          this.setDropdownContent(name, dropdownContent, true);

          Object.keys(aligns).forEach((key) => {
            const name = key as VerticalTextAlignName;
            const value = aligns[name];

            this.iconElementsMap[name] = value;
          });
          break;
        }
        case 'functions': {
          const { dropdownContent, registeredFunctionButtons } =
            createFunctionDropdownContent(
              this.spreadsheet.registeredFunctionNames
            );

          this.setDropdownContent(name, dropdownContent, true);

          this.functionElement = {
            registeredFunctionButtons,
          };

          break;
        }
        default: {
          const iconElements = createIconButton(name, toolbarPrefix);
          const tooltip = createTooltip(name);

          iconElements.button.appendChild(tooltip);

          this.iconElementsMap[name] = {
            ...iconElements,
            tooltip,
          };
          break;
        }
      }
    });

    this.tooltip = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-tooltip`,
      touch: false,
      delay: 300,
    });

    const setDropdownActive = (element: HTMLButtonElement, active: boolean) => {
      const button = element as HTMLButtonElement;
      const name = button.dataset.name as DropdownIconName;

      this.setActive(this.iconElementsMap[name], active);
    };

    this.dropdown = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-dropdown-icon-button`,
      trigger: 'click',
      theme: 'dropdown',
      placement: 'auto',
      interactive: true,
      arrow: false,
      onHide: ({ reference }) => {
        setDropdownActive(reference as HTMLButtonElement, false);

        this.spreadsheet.focusedSheet?.updateViewport();
      },
      onShow: ({ reference }) => {
        setDropdownActive(reference as HTMLButtonElement, true);
      },
      content: (e) => {
        const button = e as HTMLButtonElement;
        const name = button.dataset.name as DropdownIconName;

        if (!name) return '';

        setDropdownActive(e as HTMLButtonElement, true);

        return this.dropdownIconMap[name].dropdownContent;
      },
    });

    const icons = this.iconElementsMap;

    this.toolbarActionGroups = [
      {
        elements: [icons.redo.buttonContainer, icons.undo.buttonContainer],
      },
      {
        elements: [
          icons.bold.buttonContainer,
          icons.italic.buttonContainer,
          icons.underline.buttonContainer,
          icons.strikeThrough.buttonContainer,
          icons.fontColor.buttonContainer,
        ],
      },
      {
        elements: [
          icons.backgroundColor.buttonContainer,
          icons.borders.buttonContainer,
          icons.merge.buttonContainer,
        ],
      },
      {
        elements: [
          icons.horizontalTextAlign.buttonContainer,
          icons.verticalTextAlign.buttonContainer,
          icons.textWrap.buttonContainer,
        ],
      },
      {
        elements: [
          icons.freeze.buttonContainer,
          icons.functions.buttonContainer,
          icons.formula.buttonContainer,
        ],
      },
      {
        elements: [icons.export.buttonContainer],
      },
    ];

    this.toolbarActionGroups.forEach(({ elements }) => {
      const group = createGroup(elements, styles.group, toolbarPrefix);

      this.toolbarEl.appendChild(group);
    });

    Object.keys(this.iconElementsMap).forEach((key) => {
      const name = key as IconElementsName;

      this.iconElementsMap[name].button.addEventListener('click', () => {
        this.setValue(name);
      });
    });

    this.spreadsheet.spreadsheetEl.appendChild(this.toolbarEl);
  }

  private setBorderStyles(
    cells: Cell[],
    cellsFilter: (value: Group, index: number, array: Group[]) => boolean,
    borderType: BorderStyle
  ) {
    const sheet = this.spreadsheet.focusedSheet!;
    const borderCells = cells.filter(cellsFilter);

    borderCells.forEach((cell) => {
      const id = cell.id();

      sheet.cellRenderer.setBorderStyle(id, borderType);
    });
  }

  setBottomBorders(cells: Cell[]) {
    const sheet = this.spreadsheet.focusedSheet!;
    const row = sheet.row.convertFromCellsToRange(cells);

    this.setBorderStyles(
      cells,
      (cell) => cell.attrs.row.y === row.y,
      'borderBottom'
    );
  }

  setRightBorders(cells: Cell[]) {
    const sheet = this.spreadsheet.focusedSheet!;
    const col = sheet.col.convertFromCellsToRange(cells);

    this.setBorderStyles(
      cells,
      (cell) => cell.attrs.col.y === col.y,
      'borderRight'
    );
  }

  setTopBorders(cells: Cell[]) {
    const sheet = this.spreadsheet.focusedSheet!;
    const row = sheet.row.convertFromCellsToRange(cells);

    this.setBorderStyles(
      cells,
      (cell) => cell.attrs.row.x === row.x,
      'borderTop'
    );
  }

  setLeftBorders(cells: Cell[]) {
    const sheet = this.spreadsheet.focusedSheet!;
    const col = sheet.col.convertFromCellsToRange(cells);

    this.setBorderStyles(
      cells,
      (cell) => cell.attrs.col.x === col.x,
      'borderLeft'
    );
  }

  setVerticalBorders(cells: Cell[]) {
    const sheet = this.spreadsheet.focusedSheet!;
    const col = sheet.col.convertFromCellsToRange(cells);

    this.setBorderStyles(
      cells,
      (cell) => cell.attrs.col.x >= col.x && cell.attrs.col.y < col.y,
      'borderRight'
    );
  }

  setHorizontalBorders(cells: Cell[]) {
    const sheet = this.spreadsheet.focusedSheet!;
    const row = sheet.row.convertFromCellsToRange(cells);

    this.setBorderStyles(
      cells,
      (cell) => cell.attrs.row.x >= row.x && cell.attrs.row.y < row.y,
      'borderBottom'
    );
  }

  setInsideBorders(cells: Cell[]) {
    this.setHorizontalBorders(cells);
    this.setVerticalBorders(cells);
  }

  setOutsideBorders(cells: Cell[]) {
    this.setBottomBorders(cells);
    this.setLeftBorders(cells);
    this.setRightBorders(cells);
    this.setTopBorders(cells);
  }

  setAllBorders(cells: Cell[]) {
    this.setOutsideBorders(cells);
    this.setInsideBorders(cells);
  }

  clearBorders(ids: CellId[]) {
    const sheet = this.spreadsheet.focusedSheet!;

    ids.forEach((id) => {
      sheet.cellRenderer.deleteCellStyle(id, 'borders');
    });
  }

  private deleteStyleForSelectedCells(key: keyof ICellStyle) {
    const sheet = this.spreadsheet.focusedSheet!;

    sheet.selector.selectedCells.forEach((cell) => {
      const id = cell.id();

      sheet.cellRenderer.deleteCellStyle(id, key);
    });
  }

  private setStyleForSelectedCells<T>(key: keyof ICellStyle, value: T) {
    const sheet = this.spreadsheet.focusedSheet!;

    sheet.selector.selectedCells.forEach((cell) => {
      const id = cell.id();

      sheet.cellRenderer.setCellDataStyle(id, {
        [key]: value,
      });
    });
  }

  setValue = (name: IconElementsName, value?: any) => {
    const sheet = this.spreadsheet.focusedSheet!;

    switch (name) {
      case 'alignLeft': {
        this.setStyleForSelectedCells<HorizontalTextAlign>(
          'horizontalTextAlign',
          'left'
        );
        break;
      }
      case 'alignCenter': {
        this.setStyleForSelectedCells<HorizontalTextAlign>(
          'horizontalTextAlign',
          'center'
        );
        break;
      }
      case 'alignRight': {
        this.setStyleForSelectedCells<HorizontalTextAlign>(
          'horizontalTextAlign',
          'right'
        );
        break;
      }
      case 'alignTop': {
        this.setStyleForSelectedCells<VerticalTextAlign>(
          'verticalTextAlign',
          'top'
        );
        break;
      }
      case 'alignMiddle': {
        this.setStyleForSelectedCells<VerticalTextAlign>(
          'verticalTextAlign',
          'middle'
        );
        break;
      }
      case 'alignBottom': {
        this.setStyleForSelectedCells<VerticalTextAlign>(
          'verticalTextAlign',
          'bottom'
        );
        break;
      }
      case 'textWrap': {
        if (this.iconElementsMap.textWrap.active) {
          this.deleteStyleForSelectedCells('textWrap');
        } else {
          this.setStyleForSelectedCells<TextWrap>('textWrap', 'wrap');
        }
        break;
      }
      case 'backgroundColor': {
        if (!value) break;

        const backgroundColor = value;

        this.setStyleForSelectedCells<string>(
          'backgroundColor',
          backgroundColor
        );
        break;
      }
      case 'fontColor': {
        if (!value) break;

        const fontColor = value;

        this.setStyleForSelectedCells<string>('fontColor', fontColor);
        break;
      }
      case 'bold': {
        if (this.iconElementsMap.bold.active) {
          this.deleteStyleForSelectedCells('bold');
        } else {
          this.setStyleForSelectedCells<true>('bold', true);
        }
        break;
      }
      case 'italic': {
        if (this.iconElementsMap.italic.active) {
          this.deleteStyleForSelectedCells('italic');
        } else {
          this.setStyleForSelectedCells<true>('italic', true);
        }
        break;
      }
      case 'strikeThrough': {
        if (this.iconElementsMap.strikeThrough.active) {
          this.deleteStyleForSelectedCells('strikeThrough');
        } else {
          this.setStyleForSelectedCells<true>('strikeThrough', true);
        }
        break;
      }
      case 'underline': {
        if (this.iconElementsMap.underline.active) {
          this.deleteStyleForSelectedCells('underline');
        } else {
          this.setStyleForSelectedCells<true>('underline', true);
        }
        break;
      }
      case 'merge': {
        if (this.iconElementsMap.merge.active) {
          sheet.merger.unMergeSelectedCells();
        } else if (!this.iconElementsMap.merge.button.disabled) {
          sheet.merger.mergeSelectedCells();
        }

        break;
      }
      case 'freeze': {
        if (this.iconElementsMap.freeze.active) {
          delete sheet.getData().frozenCells;
        } else {
          const { row, col } = sheet.selector.selectedFirstCell?.attrs;

          sheet.getData().frozenCells = { row: row.x, col: col.x };
        }
        break;
      }
      case 'borderBottom': {
        this.setBottomBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderRight': {
        this.setRightBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderTop': {
        this.setTopBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderLeft': {
        this.setLeftBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderVertical': {
        this.setVerticalBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderHorizontal': {
        this.setHorizontalBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderInside': {
        this.setInsideBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderOutside': {
        this.setOutsideBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderAll': {
        this.setAllBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderNone': {
        this.clearBorders(sheet.selector.selectedCells.map((x) => x.attrs.id));
        break;
      }
    }

    sheet.updateViewport();
  };

  updateActiveStates = () => {
    const sheet = this.spreadsheet.focusedSheet!;

    if (!sheet) return;

    const selectedCells = sheet.selector.selectedCells;
    const firstSelectedCell = sheet.selector.selectedFirstCell;
    const firstSelectedCellId = firstSelectedCell!.id();

    this.setActiveColor(firstSelectedCellId, 'backgroundColor');
    this.setActiveColor(firstSelectedCellId, 'fontColor');
    this.setActive(this.iconElementsMap.freeze, this.isFreezeActive());
    this.setActive(
      this.iconElementsMap.textWrap,
      this.isActive(firstSelectedCellId, 'textWrap')
    );
    this.setActive(
      this.iconElementsMap.bold,
      this.isActive(firstSelectedCellId, 'bold')
    );
    this.setActive(
      this.iconElementsMap.italic,
      this.isActive(firstSelectedCellId, 'italic')
    );
    this.setActive(
      this.iconElementsMap.strikeThrough,
      this.isActive(firstSelectedCellId, 'strikeThrough')
    );
    this.setActive(
      this.iconElementsMap.underline,
      this.isActive(firstSelectedCellId, 'underline')
    );
    this.setActiveHorizontalIcon(firstSelectedCellId);
    this.setActiveVerticalIcon(firstSelectedCellId);
    this.setActiveMergedCells(selectedCells);
  };

  destroy() {
    this.toolbarEl.remove();
    this.tooltip.destroy();
  }

  setDropdownContent(
    name: DropdownIconName,
    dropdownContent: HTMLDivElement,
    createArrow?: boolean
  ) {
    const { iconButtonValues, arrowIconValues, tooltip } =
      createDropdownIconButton(name, createArrow);

    this.iconElementsMap[name] = iconButtonValues;

    this.dropdownIconMap[name] = {
      dropdownContent,
      tooltip,
      ...arrowIconValues,
    };
  }

  setDropdownColorPicker(name: ColorPickerIconName) {
    const { dropdownContent, colorPicker, picker } = createColorPickerContent();

    this.setDropdownContent(name, dropdownContent);

    const colorBar = createColorBar(picker);

    this.iconElementsMap[name].button.appendChild(colorBar);

    this.colorPickerElementsMap[name] = {
      colorBar,
      picker,
      colorPicker,
    };
  }

  private setActiveColor(
    cellId: CellId,
    colorPickerIconName: ColorPickerIconName
  ) {
    const isBackgroundColor = colorPickerIconName === 'backgroundColor';
    const sheet = this.spreadsheet.focusedSheet!;
    const defaultFill = isBackgroundColor ? '' : 'black';

    if (sheet.cellRenderer.cellsMap.has(cellId)) {
      const cell = sheet.cellRenderer.cellsMap.get(cellId)!;
      const shape = isBackgroundColor
        ? getCellRectFromCell(cell)
        : getCellTextFromCell(cell);

      this.colorPickerElementsMap[
        colorPickerIconName
      ].colorBar.style.backgroundColor = shape?.fill() ?? defaultFill;
    } else {
      this.colorPickerElementsMap[
        colorPickerIconName
      ].colorBar.style.backgroundColor = defaultFill;
    }
  }

  setActiveMergedCells(selectedCells: Cell[]) {
    const cell = selectedCells[0];
    const isMerged = this.spreadsheet.focusedSheet!.merger.getIsCellMerged(
      cell.id()
    );
    const isActive = selectedCells.length === 1 && isMerged;

    if (isActive) {
      this.iconElementsMap.merge.button.disabled = false;
    } else {
      this.iconElementsMap.merge.button.disabled = selectedCells.length <= 1;
    }

    this.setActive(this.iconElementsMap.merge, isActive);
  }

  setActiveHorizontalIcon(cellId: CellId) {
    const horizontalTextAlign =
      this.spreadsheet.focusedSheet?.cellRenderer.getCellData(cellId)?.style
        ?.horizontalTextAlign;
    const icon = this.iconElementsMap.horizontalTextAlign.icon;

    switch (horizontalTextAlign) {
      case 'center':
        icon.dataset.activeIcon = 'center';
        break;
      case 'right':
        icon.dataset.activeIcon = 'right';
        break;
      default:
        icon.dataset.activeIcon = 'left';
        break;
    }
  }

  setActiveVerticalIcon(cellId: CellId) {
    const verticalTextAlign =
      this.spreadsheet.focusedSheet?.cellRenderer.getCellData(cellId)?.style
        ?.verticalTextAlign;
    const icon = this.iconElementsMap.verticalTextAlign.icon;

    switch (verticalTextAlign) {
      case 'top':
        icon.dataset.activeIcon = 'top';
        break;
      case 'bottom':
        icon.dataset.activeIcon = 'bottom';
        break;
      default:
        icon.dataset.activeIcon = 'middle';
        break;
    }
  }

  isFreezeActive() {
    return !!this.spreadsheet.focusedSheet?.getData().frozenCells;
  }

  isActive(cellId: CellId, key: keyof ICellStyle) {
    return !!this.spreadsheet.focusedSheet?.cellRenderer.getCellData(cellId)
      ?.style?.[key];
  }

  setActive(iconElements: IIconElements, active: boolean) {
    iconElements.active = active;

    if (active) {
      iconElements.button.classList.add('active');
    } else {
      iconElements.button.classList.remove('active');
    }
  }

  setDisabled(iconElements: IIconElements, disabled: boolean) {
    iconElements.button.disabled = disabled;
  }
}

export default Toolbar;
