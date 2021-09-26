import styles from './Toolbar.module.scss';
import { delegate, DelegateInstance } from 'tippy.js';
import { ACPController } from 'a-color-picker';
import {
  BorderStyle,
  HorizontalTextAlign,
  ICellStyle,
  TextWrap,
  VerticalTextAlign,
} from '../sheetsGroup/sheet/Sheet';
import {
  ColorPickerIconName,
  createAutosave,
  createBordersContent,
  createColorBar,
  createColorPickerContent,
  createFontSizeContent,
  createFunctionDropdownContent,
  createHorizontalTextAlignContent,
  createTextFormatContent,
  createVerticalTextAlignContent,
  HorizontalTextAlignName,
  IconElementsName,
  toggleIconNames,
  toolbarPrefix,
  VerticalTextAlignName,
} from './toolbarHtmlElementHelpers';
import {
  createDropdownButton,
  createDropdownIconButton,
  createGroup,
  createIconButton,
  createTooltip,
  DropdownButtonName,
  DropdownIconName,
  DropdownName,
  IActionElements,
  IButtonElements,
  IIconElements,
} from '../htmlElementHelpers';
import Spreadsheet from '../Spreadsheet';
import { Group } from 'konva/lib/Group';
import { Cell, CellId, getCellId } from '../sheetsGroup/sheet/CellRenderer';
import { sentenceCase } from 'sentence-case';
import { HyperFormula } from 'hyperformula';

export interface IToolbarActionGroups {
  elements: HTMLElement[];
  className?: string;
}

interface IDropdownElements {
  arrowContainer?: HTMLSpanElement;
  arrowIcon?: HTMLElement;
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

interface IFunctionElements {
  registeredFunctionButtons: HTMLButtonElement[];
}

interface IFontSizeElements {
  fontSizes: Record<number, HTMLButtonElement>;
}

interface ITextFormatElements {
  textFormats: Record<string, HTMLButtonElement>;
}

interface IAutosaveElement {
  text: HTMLDivElement;
}

export interface ITextFormatMap {
  plainText: string;
  number: string;
  percent: string;
}

class Toolbar {
  toolbarEl!: HTMLDivElement;
  iconElementsMap!: Record<IconElementsName, IIconElements>;
  buttonElementsMap!: Record<DropdownButtonName, IButtonElements>;
  dropdownMap!: Record<DropdownName, IDropdownElements>;
  colorPickerElementsMap!: Record<ColorPickerIconName, IColorPickerElements>;
  borderElements!: IBorderElements;
  fontSizeElements!: IFontSizeElements;
  textFormatElements!: ITextFormatElements;
  textFormatMap!: ITextFormatMap;
  functionElements!: IFunctionElements;
  autosaveElement!: IAutosaveElement;
  toolbarActionGroups!: IToolbarActionGroups[];
  tooltip!: DelegateInstance;
  dropdown!: DelegateInstance;
  spreadsheet!: Spreadsheet;

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.classList.add(styles.toolbar, toolbarPrefix);

    this.iconElementsMap = {} as Record<string, IIconElements>;
    this.dropdownMap = {} as Record<DropdownName, IDropdownElements>;
    this.colorPickerElementsMap = {} as Record<
      ColorPickerIconName,
      IColorPickerElements
    >;
    this.borderElements = {} as IBorderElements;
    this.textFormatElements = {} as ITextFormatElements;
    this.textFormatMap = {
      plainText: '',
      number: '#,##0.00',
      percent: '0.00%',
    };
    this.functionElements = {} as IFunctionElements;
    this.buttonElementsMap = {} as Record<DropdownButtonName, IButtonElements>;

    const { dropdownContent: fontSizeDropdownContent, fontSizes } =
      createFontSizeContent();
    const { dropdownContent: textFormatDropdownContent, textFormats } =
      createTextFormatContent(this.textFormatMap);

    this.setDropdownButtonContent('fontSize', fontSizeDropdownContent, true);
    this.setDropdownButtonContent(
      'textFormatPattern',
      textFormatDropdownContent,
      true
    );

    const { text, autosave } = createAutosave();

    this.iconElementsMap.autosave = autosave;
    this.autosaveElement = {
      text,
    };
    this.fontSizeElements = {
      fontSizes,
    };

    this.textFormatElements = {
      textFormats,
    };

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

          this.setDropdownIconContent(name, dropdownContent, true);

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

          this.setDropdownIconContent(name, dropdownContent, true);

          Object.keys(aligns).forEach((key) => {
            const name = key as HorizontalTextAlignName;
            const value = aligns[name];

            this.iconElementsMap[name] = value;
          });

          break;
        }
        case 'verticalTextAlign': {
          const { dropdownContent, aligns } = createVerticalTextAlignContent();

          this.setDropdownIconContent(name, dropdownContent, true);

          Object.keys(aligns).forEach((key) => {
            const name = key as VerticalTextAlignName;
            const value = aligns[name];

            this.iconElementsMap[name] = value;
          });
          break;
        }
        case 'functions': {
          const registeredFunctionNames =
            HyperFormula.getRegisteredFunctionNames('enGB');

          const { dropdownContent, registeredFunctionButtons } =
            createFunctionDropdownContent(
              registeredFunctionNames.sort((a, b) => a.localeCompare(b))
            );

          this.setDropdownIconContent(name, dropdownContent, true);

          this.functionElements = {
            registeredFunctionButtons,
          };

          break;
        }
        default: {
          const iconElements = createIconButton(name, toolbarPrefix);
          const tooltip = createTooltip(name, toolbarPrefix);

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
      const name = button.dataset.name!;

      // @ts-ignore
      const actionElements = (this.buttonElementsMap[name] ??
        // @ts-ignore
        this.iconElementsMap[name]) as IActionElements;

      this.setActive(actionElements, active);
    };

    this.dropdown = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-dropdown-button`,
      trigger: 'click',
      theme: 'dropdown',
      placement: 'auto',
      interactive: true,
      arrow: false,
      onHide: ({ reference }) => {
        setDropdownActive(reference as HTMLButtonElement, false);

        this.spreadsheet.updateViewport();
      },
      onShow: ({ reference }) => {
        setDropdownActive(reference as HTMLButtonElement, true);
      },
      content: (e) => {
        const button = e as HTMLButtonElement;
        const name = button.dataset.name as DropdownIconName;

        if (!name) return '';

        setDropdownActive(e as HTMLButtonElement, true);

        return this.dropdownMap[name].dropdownContent;
      },
    });

    const icons = this.iconElementsMap;

    this.toolbarActionGroups = [
      {
        elements: [icons.undo.buttonContainer, icons.redo.buttonContainer],
      },
      {
        elements: [this.buttonElementsMap.textFormatPattern.buttonContainer],
      },
      {
        elements: [this.buttonElementsMap.fontSize.buttonContainer],
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
      {
        elements: [icons.autosave.buttonContainer],
      },
    ];

    this.toolbarActionGroups.forEach(({ elements }) => {
      const group = createGroup(elements, styles.group, toolbarPrefix);

      this.toolbarEl.appendChild(group);
    });

    Object.keys(this.iconElementsMap).forEach((key) => {
      const name = key as IconElementsName;

      if (!this.dropdownMap[key as DropdownName]) {
        this.iconElementsMap[name].button.addEventListener('click', () => {
          this.setValue(name);
        });
      }
    });

    Object.keys(this.fontSizeElements.fontSizes).forEach((key) => {
      const fontSize = parseInt(key, 10);

      this.fontSizeElements.fontSizes[fontSize].addEventListener(
        'click',
        () => {
          this.setValue('fontSize', fontSize);
        }
      );
    });

    Object.keys(this.textFormatElements.textFormats).forEach((key) => {
      this.textFormatElements.textFormats[key].addEventListener('click', () => {
        this.setValue('textFormatPattern', key);
      });
    });

    this.dropdownMap.functions.dropdownContent.addEventListener(
      'click',
      (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        if (target?.matches('button')) {
          const functionName = target.dataset.function;

          this.setValue('functions', functionName);
        }
      }
    );
  }

  setFunction(functionName: string) {
    const sheet = this.spreadsheet.focusedSheet!;

    if (sheet.selector.selectedCells.length > 1) {
      const rowRange = sheet.row.convertFromCellsToRange(
        sheet.selector.selectedCells
      );
      const colRange = sheet.col.convertFromCellsToRange(
        sheet.selector.selectedCells
      );

      const ri = rowRange.y + 1;
      const ci = colRange.x;

      const cell = sheet.cellRenderer.convertFromCellIdToCell(
        getCellId(ri, ci)
      );

      const viewportVector = sheet.getViewportVector();

      const xCellId = getCellId(rowRange.x, colRange.x);
      const yCellId = getCellId(rowRange.y, colRange.y);

      const xAddress = sheet.cellRenderer.getCellHyperformulaAddress(xCellId);
      const yAddress = sheet.cellRenderer.getCellHyperformulaAddress(yCellId);

      const xCellAddress =
        this.spreadsheet.hyperformula?.simpleCellAddressToString(
          xAddress,
          xAddress.sheet
        );
      const yCellAddress =
        this.spreadsheet.hyperformula?.simpleCellAddressToString(
          yAddress,
          yAddress.sheet
        );

      cell.x(cell.x() + viewportVector.x);
      cell.y(cell.y() + viewportVector.y);

      sheet.cellEditor.show(cell);
      sheet.cellEditor.setTextContent(
        `=${functionName}(${xCellAddress}:${yCellAddress})`
      );
    } else {
      const selectedFirstCell = sheet.selector.selectedFirstCell!;

      sheet.cellEditor.show(selectedFirstCell);
      sheet.cellEditor.setTextContent(`=${functionName}()`);
    }
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

  setValue = (name: IconElementsName | DropdownButtonName, value?: any) => {
    const sheet = this.spreadsheet.focusedSheet!;

    switch (name) {
      case 'functions': {
        this.setFunction(value);
        break;
      }
      case 'formula': {
        this.spreadsheet.options.showFormulas =
          !this.spreadsheet.options.showFormulas;
        break;
      }
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
      case 'fontSize': {
        this.setStyleForSelectedCells<number>('fontSize', value);
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
      case 'textFormatPattern': {
        const format = value as keyof ITextFormatMap;

        this.setStyleForSelectedCells<string>(
          'textFormatPattern',
          this.textFormatMap[format]
        );
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

          sheet.setData({ frozenCells: { row: row.x, col: col.x } });
        }
        break;
      }
      case 'export': {
        this.spreadsheet.exporter?.exportWorkbook();
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
      case 'undo': {
        this.spreadsheet.undo();
        break;
      }
      case 'redo': {
        this.spreadsheet.redo();
        break;
      }
    }

    this.spreadsheet.updateViewport();
  };

  updateActiveStates = () => {
    const sheet = this.spreadsheet.focusedSheet!;

    if (!sheet) return;

    const selectedCells = sheet.selector.selectedCells;
    const selectedFirstCell = sheet.selector.selectedFirstCell;
    const selectedFirstCellId = selectedFirstCell!.id();

    this.setActiveColor(selectedFirstCellId, 'backgroundColor');
    this.setActiveColor(selectedFirstCellId, 'fontColor');
    this.setActive(this.iconElementsMap.freeze, this.isFreezeActive());
    this.setActive(
      this.iconElementsMap.textWrap,
      this.isActive(selectedFirstCellId, 'textWrap')
    );
    this.setActive(
      this.iconElementsMap.bold,
      this.isActive(selectedFirstCellId, 'bold')
    );
    this.setActive(
      this.iconElementsMap.italic,
      this.isActive(selectedFirstCellId, 'italic')
    );
    this.setActive(
      this.iconElementsMap.strikeThrough,
      this.isActive(selectedFirstCellId, 'strikeThrough')
    );
    this.setActive(
      this.iconElementsMap.underline,
      this.isActive(selectedFirstCellId, 'underline')
    );
    this.setActive(
      this.iconElementsMap.formula,
      this.spreadsheet.options.showFormulas
    );
    this.setActiveHorizontalIcon(selectedFirstCellId);
    this.setActiveVerticalIcon(selectedFirstCellId);
    this.setActiveFontSize(selectedFirstCellId);
    this.setActiveTextFormat(selectedFirstCellId);
    this.setActiveMergedCells(selectedCells);
    this.setActiveHistoryIcons(this.spreadsheet.history);
    this.setActiveSaveState();
  };

  destroy() {
    this.toolbarEl.remove();
    this.tooltip.destroy();
  }

  setDropdownIconContent(
    name: DropdownIconName,
    dropdownContent: HTMLDivElement,
    createArrow?: boolean
  ) {
    const { iconButtonValues, arrowIconValues, tooltip } =
      createDropdownIconButton(name, toolbarPrefix, createArrow);

    this.iconElementsMap[name] = {
      ...iconButtonValues,
      tooltip,
    };

    this.dropdownMap[name] = {
      dropdownContent,
      ...arrowIconValues,
    };
  }

  setDropdownButtonContent(
    name: DropdownButtonName,
    dropdownContent: HTMLDivElement,
    createArrow?: boolean
  ) {
    const { buttonContainer, button, text, arrowIconValues, tooltip } =
      createDropdownButton(name, toolbarPrefix, createArrow);

    this.buttonElementsMap[name] = {
      buttonContainer,
      button,
      text,
      tooltip,
    };

    this.dropdownMap[name] = {
      dropdownContent,
      ...arrowIconValues,
    };
  }

  setDropdownColorPicker(name: ColorPickerIconName) {
    const { dropdownContent, colorPicker, picker } = createColorPickerContent();

    this.setDropdownIconContent(name, dropdownContent);

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
    let fill;

    if (colorPickerIconName === 'backgroundColor') {
      fill =
        this.spreadsheet.focusedSheet?.cellRenderer.getCellData(cellId)?.style
          ?.backgroundColor ?? '';
    } else {
      fill =
        this.spreadsheet.focusedSheet?.cellRenderer.getCellData(cellId)?.style
          ?.fontColor ?? this.spreadsheet.styles.cell.text.fill!;
    }

    this.colorPickerElementsMap[
      colorPickerIconName
    ].colorBar.style.backgroundColor = fill;
  }

  setActiveMergedCells(selectedCells: Cell[]) {
    const cell = selectedCells[0];
    const isMerged = this.spreadsheet.focusedSheet!.merger.getIsCellPartOfMerge(
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

  setActiveSaveState() {
    if (this.spreadsheet.focusedSheet!.isSaving) {
      this.autosaveElement.text.textContent = 'Saving...';
    } else {
      this.autosaveElement.text.textContent = 'Saved';
    }
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

  setActiveFontSize(cellId: CellId) {
    const fontSize =
      this.spreadsheet.focusedSheet?.cellRenderer.getCellData(cellId)?.style
        ?.fontSize;

    this.buttonElementsMap.fontSize.text.textContent = (
      fontSize ?? this.spreadsheet.styles.cell.text.fontSize!
    ).toString();
  }

  setActiveTextFormat(cellId: CellId) {
    const textFormatPattern =
      this.spreadsheet.focusedSheet?.cellRenderer.getCellData(cellId)?.style
        ?.textFormatPattern;

    let textFormat = 'plainText';

    Object.keys(this.textFormatMap).forEach((key) => {
      const value = this.textFormatMap[key as keyof ITextFormatMap];

      if (textFormatPattern === value) {
        textFormat = key;
      }
    });

    this.buttonElementsMap.textFormatPattern.text.textContent =
      sentenceCase(textFormat);
  }

  setActiveHistoryIcons(history: any) {
    this.setDisabled(this.iconElementsMap.undo, !history.canUndo);
    this.setDisabled(this.iconElementsMap.redo, !history.canRedo);
  }

  isFreezeActive() {
    return !!this.spreadsheet.focusedSheet?.getData().frozenCells;
  }

  isActive(cellId: CellId, key: keyof ICellStyle) {
    return !!this.spreadsheet.focusedSheet?.cellRenderer.getCellData(cellId)
      ?.style?.[key];
  }

  setActive(actionElements: IActionElements, active: boolean) {
    actionElements.active = active;

    if (active) {
      actionElements.button.classList.add('active');
    } else {
      actionElements.button.classList.remove('active');
    }
  }

  setDisabled(iconElements: IIconElements, disabled: boolean) {
    iconElements.button.disabled = disabled;
  }
}

export default Toolbar;
