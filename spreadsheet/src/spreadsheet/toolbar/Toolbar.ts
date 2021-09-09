import styles from './Toolbar.module.scss';
import { delegate, DelegateInstance } from 'tippy.js';
import { ACPController } from 'a-color-picker';
import { Cell } from '../sheetsGroup/sheet/Sheet';
import { Rect } from 'konva/lib/shapes/Rect';
import {
  ColorPickerIconName,
  createBordersContent,
  createColorBar,
  createColorPickerContent,
  createDropdownIconButton,
  createFunctionDropdownContent,
  createHorizontalAlignContent,
  createTooltip,
  createVerticalAlignContent,
  DropdownIconName,
  HorizontalAlignName,
  IconElementsName,
  toggleIconNames,
  toolbarPrefix,
  VerticalAlignName,
} from './toolbarHtmlElementHelpers';
import {
  createGroup,
  createIconButton,
  IIconElements,
} from '../htmlElementHelpers';
import events from '../events';
import Spreadsheet from '../Spreadsheet';

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
        case 'color': {
          this.setDropdownColorPicker(name);

          this.colorPickerElementsMap.color.picker.on('change', (_, color) => {
            this.setValue(name, color);
          });
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
        case 'horizontalAlign': {
          const { dropdownContent, aligns } = createHorizontalAlignContent();

          this.setDropdownContent(name, dropdownContent, true);

          Object.keys(aligns).forEach((key) => {
            const name = key as HorizontalAlignName;
            const value = aligns[name];

            this.iconElementsMap[name] = value;
          });

          break;
        }
        case 'verticalAlign': {
          const { dropdownContent, aligns } = createVerticalAlignContent();

          this.setDropdownContent(name, dropdownContent, true);

          Object.keys(aligns).forEach((key) => {
            const name = key as VerticalAlignName;
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
          icons.fontBold.buttonContainer,
          icons.fontItalic.buttonContainer,
          icons.underline.buttonContainer,
          icons.strike.buttonContainer,
          icons.color.buttonContainer,
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
          icons.horizontalAlign.buttonContainer,
          icons.verticalAlign.buttonContainer,
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

    this.setActive(this.iconElementsMap.freeze, this.isFreezeActive());

    this.spreadsheet.spreadsheetEl.appendChild(this.toolbarEl);

    this.spreadsheet.eventEmitter.on(
      events.selector.startSelection,
      this.onStartSelection
    );
    this.spreadsheet.eventEmitter.on(
      events.selector.moveSelection,
      this.onMoveSelection
    );
  }

  onStartSelection = () => {
    this.setToolbarState();
  };

  onMoveSelection = () => {
    this.setToolbarState();
  };

  setValue = (name: IconElementsName, value?: any) => {
    const sheet = this.spreadsheet.focusedSheet!;

    switch (name) {
      case 'backgroundColor': {
        if (!value) break;

        sheet.selector.selectedCells.forEach((cell) => {
          sheet.setCellBackgroundColor(cell.id(), value);
        });
        break;
      }
      case 'merge': {
        if (this.iconElementsMap.merge.active) {
          sheet.merger.unMergeSelectedCells();
        } else if (!this.iconElementsMap.merge.button.disabled) {
          sheet.merger.mergeSelectedCells();
        }
        this.setMergedState(sheet.selector.selectedCells);

        break;
      }
      case 'freeze': {
        if (this.iconElementsMap.freeze.active) {
          delete sheet.data.frozenCells;
        } else {
          const { row, col } = sheet.selector.selectedFirstCell?.attrs;

          sheet.data.frozenCells = { row: row.x, col: col.x };
        }

        this.setActive(this.iconElementsMap.freeze, this.isFreezeActive());
        break;
      }
      case 'borderBottom': {
        sheet.setBottomBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderRight': {
        sheet.setRightBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderTop': {
        sheet.setTopBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderLeft': {
        sheet.setLeftBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderVertical': {
        sheet.setVerticalBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderHorizontal': {
        sheet.setHorizontalBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderInside': {
        sheet.setInsideBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderAll': {
        sheet.setAllBorders(sheet.selector.selectedCells);
        break;
      }
      case 'borderNone': {
        sheet.clearBorders(sheet.selector.selectedCells.map((x) => x.attrs.id));
        break;
      }
      case 'borderOutside': {
        sheet.setOutsideBorders(sheet.selector.selectedCells);
        break;
      }
    }

    if (name !== 'backgroundColor') {
      sheet.updateViewport();
    }
  };

  setToolbarState = () => {
    const sheet = this.spreadsheet.focusedSheet!;
    const selectedCells = sheet.selector.selectedCells;
    const firstSelectedCell = sheet.selector.selectedFirstCell;

    this.iconElementsMap.merge.button.disabled = true;

    if (sheet.cellsMap.has(firstSelectedCell!.id())) {
      const cell = sheet.cellsMap.get(firstSelectedCell!.id())!;
      const cellRect = cell.children?.find(
        (x) => x.attrs.type === 'cellRect'
      ) as Rect;

      this.colorPickerElementsMap.backgroundColor.colorBar.style.backgroundColor =
        cellRect.fill();
    } else {
      this.colorPickerElementsMap.backgroundColor.colorBar.style.backgroundColor =
        'white';
    }

    this.setMergedState(selectedCells);
  };

  setMergedState(selectedCells: Cell[]) {
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

  isFreezeActive() {
    return !!this.spreadsheet.focusedSheet?.data.frozenCells;
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
