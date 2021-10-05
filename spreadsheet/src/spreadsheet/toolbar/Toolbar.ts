import styles from './Toolbar.module.scss';
import { delegate, DelegateInstance } from 'tippy.js';
import { ACPController } from 'a-color-picker';
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
import { sentenceCase } from 'sentence-case';
import HyperFormulaModule from '../HyperFormula';
import Cell from '../sheet/cells/cell/Cell';
import SimpleCellAddress from '../sheet/cells/cell/SimpleCellAddress';
import {
  BorderStyle,
  HorizontalTextAlign,
  ICellStyle,
  TextWrap,
  VerticalTextAlign,
} from '../sheet/Data';
import RangeSimpleCellAddress from '../sheet/cells/cell/RangeSimpleCellAddress';
import SelectedCell from '../sheet/cells/cell/SelectedCell';

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
  functionElements?: IFunctionElements;
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
          if (HyperFormulaModule) {
            const { dropdownContent, registeredFunctionButtons } =
              createFunctionDropdownContent(
                this.spreadsheet
                  .getRegisteredFunctions()!
                  .sort((a, b) => a.localeCompare(b))
              );

            this.setDropdownIconContent(name, dropdownContent, true);

            this.functionElements = {
              registeredFunctionButtons,
            };
          }

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

        this.spreadsheet.getActiveSheet()?.updateViewport();
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
          ...(this.spreadsheet.hyperformula
            ? [icons.functions.buttonContainer]
            : []),
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

    this.dropdownMap.functions?.dropdownContent.addEventListener(
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
    const sheet = this.spreadsheet.getActiveSheet()!;

    if (sheet.selector.selectedCells.length > 1) {
      const rangeSimpleCellAddress = sheet.getMinMaxRangeSimpleCellAddress(
        sheet.selector.selectedCells
      );

      rangeSimpleCellAddress.bottomRightSimpleCellAddress.row += 1;

      const cell = new Cell(
        sheet,
        new SimpleCellAddress(
          sheet.sheetId,
          rangeSimpleCellAddress.bottomRightSimpleCellAddress.row,
          rangeSimpleCellAddress.topLeftSimpleCellAddress.col
        )
      );

      const topLeftString =
        rangeSimpleCellAddress.topLeftSimpleCellAddress.addressToString();
      const bottomRightString =
        rangeSimpleCellAddress.bottomRightSimpleCellAddress.addressToString();

      const viewportVector = sheet.getViewportVector();

      cell.group.x(cell.group.x() + viewportVector.x);
      cell.group.y(cell.group.y() + viewportVector.y);

      sheet.cellEditor.show(cell);
      sheet.cellEditor.setTextContent(
        `=${functionName}(${topLeftString}:${bottomRightString})`
      );
    } else {
      const selectedCell = sheet.selector.selectedCell!;

      sheet.cellEditor.show(selectedCell);
      sheet.cellEditor.setTextContent(`=${functionName}()`);
    }
  }

  private setBorderStyles(
    cells: Cell[],
    cellsFilter: (
      cell: Cell,
      rangeSimpleCellAddress: RangeSimpleCellAddress
    ) => boolean,
    borderType: BorderStyle
  ) {
    const sheet = this.spreadsheet.getActiveSheet()!;
    const borderCells = cells.filter((cell) =>
      cellsFilter(cell, sheet.getMinMaxRangeSimpleCellAddress(cells))
    );

    borderCells.forEach((cell) => {
      const borders =
        this.spreadsheet.data.getCellData(cell.simpleCellAddress)?.style
          ?.borders ?? [];

      if (borders.indexOf(borderType) === -1) {
        this.spreadsheet.data.setCellDataStyle(cell.simpleCellAddress, {
          borders: [...borders, borderType],
        });
      }
    });
  }

  setBottomBorders(cells: Cell[]) {
    this.setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress.row ===
        rangeSimpleCellAddress.bottomRightSimpleCellAddress.row,
      'borderBottom'
    );
  }

  setRightBorders(cells: Cell[]) {
    this.setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress.col ===
        rangeSimpleCellAddress.bottomRightSimpleCellAddress.col,
      'borderRight'
    );
  }

  setTopBorders(cells: Cell[]) {
    this.setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.topLeftSimpleCellAddress.row ===
        rangeSimpleCellAddress.topLeftSimpleCellAddress.row,
      'borderTop'
    );
  }

  setLeftBorders(cells: Cell[]) {
    this.setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.topLeftSimpleCellAddress.col ===
        rangeSimpleCellAddress.topLeftSimpleCellAddress.col,
      'borderLeft'
    );
  }

  setVerticalBorders(cells: Cell[]) {
    this.setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.topLeftSimpleCellAddress.col >=
          rangeSimpleCellAddress.topLeftSimpleCellAddress.col &&
        cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress.col <
          rangeSimpleCellAddress.bottomRightSimpleCellAddress.col,
      'borderRight'
    );
  }

  setHorizontalBorders(cells: Cell[]) {
    this.setBorderStyles(
      cells,
      (cell, rangeSimpleCellAddress) =>
        cell.rangeSimpleCellAddress.topLeftSimpleCellAddress.row >=
          rangeSimpleCellAddress.topLeftSimpleCellAddress.row &&
        cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress.row <
          rangeSimpleCellAddress.bottomRightSimpleCellAddress.row,
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

  clearBorders(simpleCellAddresses: SimpleCellAddress[]) {
    const sheet = this.spreadsheet.getActiveSheet()!;

    simpleCellAddresses.forEach((simpleCellAddress) => {
      sheet.spreadsheet.data.deleteCellDataStyle(simpleCellAddress, 'borders');
    });
  }

  setValue = (name: IconElementsName | DropdownButtonName, value?: any) => {
    const sheet = this.spreadsheet.getActiveSheet()!;

    function setStyle<T>(key: keyof ICellStyle, value: T) {
      sheet.selector.selectedCells.forEach((cell) => {
        sheet.spreadsheet.data.setCellDataStyle(cell.simpleCellAddress, {
          [key]: value,
        });
      });
    }

    function deleteStyle(key: keyof ICellStyle) {
      sheet.selector.selectedCells.forEach((cell) => {
        sheet.spreadsheet.data.deleteCellDataStyle(cell.simpleCellAddress, key);
      });
    }

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
        setStyle<HorizontalTextAlign>('horizontalTextAlign', 'left');
        break;
      }
      case 'alignCenter': {
        setStyle<HorizontalTextAlign>('horizontalTextAlign', 'center');
        break;
      }
      case 'alignRight': {
        setStyle<HorizontalTextAlign>('horizontalTextAlign', 'right');
        break;
      }
      case 'alignTop': {
        setStyle<VerticalTextAlign>('verticalTextAlign', 'top');
        break;
      }
      case 'alignMiddle': {
        setStyle<VerticalTextAlign>('verticalTextAlign', 'middle');
        break;
      }
      case 'alignBottom': {
        setStyle<VerticalTextAlign>('verticalTextAlign', 'bottom');
        break;
      }
      case 'fontSize': {
        setStyle<number>('fontSize', value);
        break;
      }
      case 'textWrap': {
        if (this.iconElementsMap.textWrap.active) {
          deleteStyle('textWrap');
        } else {
          setStyle<TextWrap>('textWrap', 'wrap');
        }
        break;
      }
      case 'textFormatPattern': {
        const format = value as keyof ITextFormatMap;

        setStyle<string>('textFormatPattern', this.textFormatMap[format]);
        break;
      }
      case 'backgroundColor': {
        if (!value) break;

        const backgroundColor = value;

        setStyle<string>('backgroundColor', backgroundColor);
        break;
      }
      case 'fontColor': {
        if (!value) break;

        const fontColor = value;

        setStyle<string>('fontColor', fontColor);
        break;
      }
      case 'bold': {
        if (this.iconElementsMap.bold.active) {
          deleteStyle('bold');
        } else {
          setStyle<true>('bold', true);
        }
        break;
      }
      case 'italic': {
        if (this.iconElementsMap.italic.active) {
          deleteStyle('italic');
        } else {
          setStyle<true>('italic', true);
        }
        break;
      }
      case 'strikeThrough': {
        if (this.iconElementsMap.strikeThrough.active) {
          deleteStyle('strikeThrough');
        } else {
          setStyle<true>('strikeThrough', true);
        }
        break;
      }
      case 'underline': {
        if (this.iconElementsMap.underline.active) {
          deleteStyle('underline');
        } else {
          setStyle<true>('underline', true);
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
          delete this.spreadsheet.data.getSheetData().frozenCells;
        } else {
          const simpleCellAddress =
            sheet.selector.selectedCell!.simpleCellAddress;

          this.spreadsheet.data.setSheetData({
            ...this.spreadsheet.data.getSheetData(),
            frozenCells: {
              row: simpleCellAddress.row,
              col: simpleCellAddress.col,
            },
          });
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
        this.clearBorders(
          sheet.selector.selectedCells.map((cell) => cell.simpleCellAddress)
        );
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

    sheet.updateViewport();
  };

  updateActiveStates = () => {
    const sheet = this.spreadsheet.getActiveSheet()!;

    if (!sheet) return;

    const selectedCells = sheet.selector.selectedCells;
    const selectedCell = sheet.selector.selectedCell!;

    this.setActiveColor(selectedCell, 'backgroundColor');
    this.setActiveColor(selectedCell, 'fontColor');
    this.setActive(this.iconElementsMap.freeze, this.isFreezeActive());
    this.setActive(
      this.iconElementsMap.textWrap,
      this.isActive(selectedCell, 'textWrap')
    );
    this.setActive(
      this.iconElementsMap.bold,
      this.isActive(selectedCell, 'bold')
    );
    this.setActive(
      this.iconElementsMap.italic,
      this.isActive(selectedCell, 'italic')
    );
    this.setActive(
      this.iconElementsMap.strikeThrough,
      this.isActive(selectedCell, 'strikeThrough')
    );
    this.setActive(
      this.iconElementsMap.underline,
      this.isActive(selectedCell, 'underline')
    );
    this.setActive(
      this.iconElementsMap.formula,
      this.spreadsheet.options.showFormulas
    );
    this.setActiveHorizontalIcon(selectedCell);
    this.setActiveVerticalIcon(selectedCell);
    this.setActiveFontSize(selectedCell);
    this.setActiveTextFormat(selectedCell);
    this.setActiveMergedCells(selectedCells, selectedCell);
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
    selectedCell: SelectedCell,
    colorPickerIconName: ColorPickerIconName
  ) {
    let fill;

    const style = this.spreadsheet.data.getCellData(
      selectedCell.simpleCellAddress
    )?.style;

    if (colorPickerIconName === 'backgroundColor') {
      fill = style?.backgroundColor ?? '';
    } else {
      fill = style?.fontColor ?? this.spreadsheet.styles.cell.text.fill!;
    }

    this.colorPickerElementsMap[
      colorPickerIconName
    ].colorBar.style.backgroundColor = fill;
  }

  setActiveMergedCells(selectedCells: Cell[], selectedCell: SelectedCell) {
    const isMerged = selectedCell.getIsCellPartOfMerge();

    if (isMerged) {
      this.iconElementsMap.merge.button.disabled = false;
    } else {
      this.iconElementsMap.merge.button.disabled = selectedCells.length <= 1;
    }

    this.setActive(this.iconElementsMap.merge, isMerged);
  }

  setActiveSaveState() {
    if (this.spreadsheet.data.isSaving) {
      this.autosaveElement.text.textContent = 'Saving...';
    } else {
      this.autosaveElement.text.textContent = 'Saved';
    }
  }

  setActiveHorizontalIcon(selectedCell: SelectedCell) {
    const horizontalTextAlign = this.spreadsheet.data.getCellData(
      selectedCell.simpleCellAddress
    )?.style?.horizontalTextAlign;
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

  setActiveVerticalIcon(selectedCell: SelectedCell) {
    const verticalTextAlign = this.spreadsheet.data.getCellData(
      selectedCell.simpleCellAddress
    )?.style?.verticalTextAlign;
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

  setActiveFontSize(selectedCell: SelectedCell) {
    const fontSize = this.spreadsheet.data.getCellData(
      selectedCell.simpleCellAddress
    )?.style?.fontSize;

    this.buttonElementsMap.fontSize.text.textContent = (
      fontSize ?? this.spreadsheet.styles.cell.text.fontSize!
    ).toString();
  }

  setActiveTextFormat(selectedCell: SelectedCell) {
    const textFormatPattern = this.spreadsheet.data.getCellData(
      selectedCell.simpleCellAddress
    )?.style?.textFormatPattern;

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
    return !!this.spreadsheet.data.getSheetData().frozenCells;
  }

  isActive(selectedCell: SelectedCell, key: keyof ICellStyle) {
    const style = this.spreadsheet.data.getCellData(
      selectedCell.simpleCellAddress
    )?.style?.[key];

    return !!style;
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
