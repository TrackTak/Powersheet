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
import { sentenceCase } from 'change-case';
import Cell from '../sheets/cells/cell/Cell';
import SimpleCellAddress from '../sheets/cells/cell/SimpleCellAddress';
import {
  BorderStyle,
  HorizontalTextAlign,
  ICellData,
  TextWrap,
  VerticalTextAlign,
} from '../sheets/Data';
import RangeSimpleCellAddress from '../sheets/cells/cell/RangeSimpleCellAddress';
import SelectedCell from '../sheets/cells/cell/SelectedCell';
import { SheetId } from '../sheets/Sheets';
import { HyperFormula } from 'hyperformula';

export interface IToolbarActionGroups {
  elements: HTMLElement[];
  className?: string;
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

class Toolbar {
  toolbarEl!: HTMLDivElement;
  iconElementsMap!: Record<IconElementsName, IIconElements>;
  buttonElementsMap!: Record<DropdownButtonName, IButtonElements>;
  dropdownMap!: Record<DropdownName, HTMLDivElement>;
  colorPickerElementsMap!: Record<ColorPickerIconName, IColorPickerElements>;
  borderElements!: IBorderElements;
  fontSizeElements!: IFontSizeElements;
  textFormatElements!: ITextFormatElements;
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
    this.dropdownMap = {} as Record<DropdownName, HTMLDivElement>;
    this.colorPickerElementsMap = {} as Record<
      ColorPickerIconName,
      IColorPickerElements
    >;
    this.borderElements = {} as IBorderElements;
    this.textFormatElements = {} as ITextFormatElements;
    this.functionElements = {} as IFunctionElements;
    this.buttonElementsMap = {} as Record<DropdownButtonName, IButtonElements>;

    this.setDropdownButton('textFormatPattern', true);
    this.setDropdownButton('fontSize', true);

    const { text, autosave } = createAutosave();

    this.iconElementsMap.autosave = autosave;
    this.autosaveElement = {
      text,
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

          this.setDropdownIconButton(name, true);

          this.dropdownMap.borders = dropdownContent;

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

          this.setDropdownIconButton(name, true);

          this.dropdownMap.horizontalTextAlign = dropdownContent;

          Object.keys(aligns).forEach((key) => {
            const name = key as HorizontalTextAlignName;
            const value = aligns[name];

            this.iconElementsMap[name] = value;
          });

          break;
        }
        case 'verticalTextAlign': {
          const { dropdownContent, aligns } = createVerticalTextAlignContent();

          this.setDropdownIconButton(name, true);

          this.dropdownMap.verticalTextAlign = dropdownContent;

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
              HyperFormula.getRegisteredFunctionNames('enGB').sort((a, b) =>
                a.localeCompare(b)
              )
            );

          this.setDropdownIconButton(name, true);

          this.dropdownMap.functions = dropdownContent;

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

        return this.dropdownMap[name];
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

    this.dropdownMap.functions?.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target?.matches('button')) {
        const functionName = target.dataset.function;

        this.setValue('functions', functionName);
      }
    });
  }

  setFunction(functionName: string) {
    if (this.spreadsheet.sheets.selector.selectedCells.length > 1) {
      const rangeSimpleCellAddress =
        this.spreadsheet.sheets.getMinMaxRangeSimpleCellAddress(
          this.spreadsheet.sheets.selector.selectedCells
        );

      const cell = new Cell(
        this.spreadsheet.sheets,
        new SimpleCellAddress(
          this.spreadsheet.sheets.activeSheetId,
          rangeSimpleCellAddress.bottomRightSimpleCellAddress.row + 1,
          rangeSimpleCellAddress.topLeftSimpleCellAddress.col
        )
      );

      const topLeftString =
        rangeSimpleCellAddress.topLeftSimpleCellAddress.addressToString();
      const bottomRightString =
        rangeSimpleCellAddress.bottomRightSimpleCellAddress.addressToString();

      const viewportVector = this.spreadsheet.sheets.getViewportVector();

      cell.group.x(cell.group.x() + viewportVector.x);
      cell.group.y(cell.group.y() + viewportVector.y);

      this.spreadsheet.sheets.cellEditor.show(cell);
      this.spreadsheet.sheets.cellEditor.setContentEditable(
        `=${functionName}(${topLeftString}:${bottomRightString})`
      );
    } else {
      const selectedCell = this.spreadsheet.sheets.selector.selectedCell!;

      this.spreadsheet.sheets.cellEditor.show(selectedCell);
      this.spreadsheet.sheets.cellEditor.setContentEditable(
        `=${functionName}()`
      );
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
    const borderCells = cells.filter((cell) =>
      cellsFilter(
        cell,
        this.spreadsheet.sheets.getMinMaxRangeSimpleCellAddress(cells)
      )
    );

    borderCells.forEach((cell) => {
      const cellId = cell.simpleCellAddress.toCellId();
      const borders =
        this.spreadsheet.data.spreadsheetData.cells?.[cellId]?.borders ?? [];

      if (borders.indexOf(borderType) === -1) {
        this.spreadsheet.data.setCell(cell.simpleCellAddress, {
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
      (cell, rangeSimpleCellAddress) => {
        return (
          cell.rangeSimpleCellAddress.topLeftSimpleCellAddress.col >=
            rangeSimpleCellAddress.topLeftSimpleCellAddress.col &&
          cell.rangeSimpleCellAddress.bottomRightSimpleCellAddress.col <
            rangeSimpleCellAddress.bottomRightSimpleCellAddress.col
        );
      },
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
    simpleCellAddresses.forEach((simpleCellAddress) => {
      const cellId = simpleCellAddress.toCellId();

      delete this.spreadsheet.data.spreadsheetData.cells?.[cellId].borders;
    });
  }

  setValue = (name: IconElementsName | DropdownButtonName, value?: any) => {
    const setStyle = <T>(key: keyof ICellData, value: T) => {
      this.spreadsheet.pushToHistory(() => {
        this.spreadsheet.sheets.selector.selectedCells.forEach((cell) => {
          this.spreadsheet.data.setCell(cell.simpleCellAddress, {
            [key]: value,
          });
        });
      });
    };

    const deleteStyle = (key: keyof ICellData) => {
      this.spreadsheet.pushToHistory(() => {
        this.spreadsheet.sheets.selector.selectedCells.forEach((cell) => {
          const cellId = cell.simpleCellAddress.toCellId();

          delete this.spreadsheet.data.spreadsheetData.cells?.[cellId][key];
        });
      });
    };

    switch (name) {
      case 'functions': {
        this.setFunction(value);
        break;
      }
      case 'formula': {
        this.spreadsheet.pushToHistory(() => {
          this.spreadsheet.data.spreadsheetData.showFormulas =
            !this.spreadsheet.data.spreadsheetData.showFormulas;
        });
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
        const format = value;

        setStyle<string>(
          'textFormatPattern',
          this.spreadsheet.options.textPatternFormats[format]
        );
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
          this.spreadsheet.sheets.merger.unMergeSelectedCells();
        } else if (!this.iconElementsMap.merge.button.disabled) {
          this.spreadsheet.sheets.merger.mergeSelectedCells();
        }

        break;
      }
      case 'freeze': {
        this.spreadsheet.pushToHistory(() => {
          if (this.iconElementsMap.freeze.active) {
            this.spreadsheet.data.deleteFrozenCell(
              this.spreadsheet.sheets.activeSheetId
            );
          } else {
            const simpleCellAddress =
              this.spreadsheet.sheets.selector.selectedCell!.simpleCellAddress;

            this.spreadsheet.data.setFrozenCell(simpleCellAddress.sheet, {
              row: simpleCellAddress.row,
              col: simpleCellAddress.col,
            });
          }
        });

        this.spreadsheet.sheets.cols.scrollBar.scrollBarEl.scrollTo(0, 0);
        this.spreadsheet.sheets.rows.scrollBar.scrollBarEl.scrollTo(0, 0);

        break;
      }
      case 'export': {
        this.spreadsheet.exporter?.exportWorkbook();
        break;
      }
      case 'borderBottom': {
        this.spreadsheet.pushToHistory(() => {
          this.setBottomBorders(this.spreadsheet.sheets.selector.selectedCells);
        });
        break;
      }
      case 'borderRight': {
        this.spreadsheet.pushToHistory(() => {
          this.setRightBorders(this.spreadsheet.sheets.selector.selectedCells);
        });
        break;
      }
      case 'borderTop': {
        this.spreadsheet.pushToHistory(() => {
          this.setTopBorders(this.spreadsheet.sheets.selector.selectedCells);
        });
        break;
      }
      case 'borderLeft': {
        this.spreadsheet.pushToHistory(() => {
          this.setLeftBorders(this.spreadsheet.sheets.selector.selectedCells);
        });
        break;
      }
      case 'borderVertical': {
        this.spreadsheet.pushToHistory(() => {
          this.setVerticalBorders(
            this.spreadsheet.sheets.selector.selectedCells
          );
        });
        break;
      }
      case 'borderHorizontal': {
        this.spreadsheet.pushToHistory(() => {
          this.setHorizontalBorders(
            this.spreadsheet.sheets.selector.selectedCells
          );
        });
        break;
      }
      case 'borderInside': {
        this.spreadsheet.pushToHistory(() => {
          this.setInsideBorders(this.spreadsheet.sheets.selector.selectedCells);
        });
        break;
      }
      case 'borderOutside': {
        this.spreadsheet.pushToHistory(() => {
          this.setOutsideBorders(
            this.spreadsheet.sheets.selector.selectedCells
          );
        });
        break;
      }
      case 'borderAll': {
        this.spreadsheet.pushToHistory(() => {
          this.setAllBorders(this.spreadsheet.sheets.selector.selectedCells);
        });
        break;
      }
      case 'borderNone': {
        this.spreadsheet.pushToHistory(() => {
          this.clearBorders(
            this.spreadsheet.sheets.selector.selectedCells.map(
              (cell) => cell.simpleCellAddress
            )
          );
        });
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

  private setTextFormatPatterns() {
    const { dropdownContent: textFormatDropdownContent, textFormats } =
      createTextFormatContent(this.spreadsheet.options.textPatternFormats);

    this.dropdownMap.textFormatPattern = textFormatDropdownContent;

    this.textFormatElements = {
      textFormats,
    };

    Object.keys(this.textFormatElements.textFormats).forEach((key) => {
      this.textFormatElements.textFormats[key].addEventListener('click', () => {
        this.setValue('textFormatPattern', key);
      });
    });
  }

  private setFontSizes() {
    const sortedFontSizes = this.spreadsheet.options.fontSizes.sort(
      (a, b) => a - b
    );
    const { dropdownContent: fontSizeDropdownContent, fontSizes } =
      createFontSizeContent(sortedFontSizes);

    this.dropdownMap.fontSize = fontSizeDropdownContent;

    this.fontSizeElements = {
      fontSizes,
    };

    Object.keys(this.fontSizeElements.fontSizes).forEach((key) => {
      const fontSize = parseInt(key, 10);

      this.fontSizeElements.fontSizes[fontSize].addEventListener(
        'click',
        () => {
          this.setValue('fontSize', fontSize);
        }
      );
    });
  }

  updateActiveStates = () => {
    const selectedCells = this.spreadsheet.sheets.selector.selectedCells;
    const selectedCell = this.spreadsheet.sheets.selector.selectedCell!;

    this.setTextFormatPatterns();
    this.setFontSizes();

    this.setActiveColor(selectedCell, 'backgroundColor');
    this.setActiveColor(selectedCell, 'fontColor');
    this.setActive(
      this.iconElementsMap.freeze,
      this.isFreezeActive(this.spreadsheet.sheets.activeSheetId)
    );
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
      this.spreadsheet.data.spreadsheetData.showFormulas ?? false
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

  setDropdownIconButton(name: DropdownIconName, createArrow?: boolean) {
    const { iconButtonValues, arrowIconValues, tooltip } =
      createDropdownIconButton(name, toolbarPrefix, createArrow);

    this.iconElementsMap[name] = {
      ...iconButtonValues,
      ...arrowIconValues,
      tooltip,
    };
  }

  setDropdownButton(name: DropdownButtonName, createArrow?: boolean) {
    const { buttonContainer, button, text, arrowIconValues, tooltip } =
      createDropdownButton(name, toolbarPrefix, createArrow);

    this.buttonElementsMap[name] = {
      buttonContainer,
      button,
      text,
      tooltip,
      ...arrowIconValues,
    };
  }

  setDropdownColorPicker(name: ColorPickerIconName) {
    const { dropdownContent, colorPicker, picker } = createColorPickerContent();

    this.setDropdownIconButton(name);

    this.dropdownMap[name] = dropdownContent;

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

    const cellId = selectedCell.simpleCellAddress.toCellId();
    const cell = this.spreadsheet.data.spreadsheetData.cells?.[cellId];

    if (colorPickerIconName === 'backgroundColor') {
      fill = cell?.backgroundColor ?? '';
    } else {
      fill = cell?.fontColor ?? this.spreadsheet.styles.cell.text.fill!;
    }

    this.colorPickerElementsMap[
      colorPickerIconName
    ].colorBar.style.backgroundColor = fill;
  }

  setActiveMergedCells(selectedCells: Cell[], selectedCell: SelectedCell) {
    const isMerged =
      this.spreadsheet.sheets.merger.getIsCellPartOfMerge(
        selectedCell.simpleCellAddress
      ) && selectedCells.length === 1;

    if (isMerged) {
      this.iconElementsMap.merge.button.disabled = false;
    } else {
      this.iconElementsMap.merge.button.disabled = selectedCells.length <= 1;
    }

    this.setActive(this.iconElementsMap.merge, isMerged);
  }

  setActiveSaveState() {
    if (this.spreadsheet.isSaving) {
      this.autosaveElement.text.textContent = 'Saving...';
    } else {
      this.autosaveElement.text.textContent = 'Saved';
    }
  }

  setActiveHorizontalIcon(selectedCell: SelectedCell) {
    const cellId = selectedCell.simpleCellAddress.toCellId();
    const horizontalTextAlign =
      this.spreadsheet.data.spreadsheetData.cells?.[cellId]
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

  setActiveVerticalIcon(selectedCell: SelectedCell) {
    const cellId = selectedCell.simpleCellAddress.toCellId();
    const verticalTextAlign =
      this.spreadsheet.data.spreadsheetData.cells?.[cellId]?.verticalTextAlign;
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
    const cellId = selectedCell.simpleCellAddress.toCellId();
    const fontSize =
      this.spreadsheet.data.spreadsheetData.cells?.[cellId]?.fontSize;

    this.buttonElementsMap.fontSize.text.textContent = (
      fontSize ?? this.spreadsheet.styles.cell.text.fontSize!
    ).toString();
  }

  setActiveTextFormat(selectedCell: SelectedCell) {
    const cellId = selectedCell.simpleCellAddress.toCellId();
    const textFormatPattern =
      this.spreadsheet.data.spreadsheetData.cells?.[cellId]?.textFormatPattern;

    let textFormat = 'plainText';

    Object.keys(this.spreadsheet.options.textPatternFormats).forEach((key) => {
      const value = this.spreadsheet.options.textPatternFormats[key];

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

  isFreezeActive(sheetId: SheetId) {
    return !!this.spreadsheet.data.spreadsheetData.frozenCells?.[sheetId];
  }

  isActive(selectedCell: SelectedCell, key: keyof ICellData) {
    const cellId = selectedCell.simpleCellAddress.toCellId();
    const style = this.spreadsheet.data.spreadsheetData.cells?.[cellId]?.[key];

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
