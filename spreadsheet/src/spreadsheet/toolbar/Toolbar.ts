import styles from './Toolbar.module.scss';
import { delegate, DelegateInstance } from 'tippy.js';
import { ACPController } from 'a-color-picker';
import EventEmitter from 'eventemitter3';
import { IOptions } from '../options';
import events from '../events';
import Sheet, { Cell } from '../sheetsGroup/sheet/Sheet';
import { Rect } from 'konva/lib/shapes/Rect';
import {
  BorderIconName,
  ColorPickerIconName,
  createBordersContent,
  createColorBar,
  createColorPickerContent,
  createDropdownIconButton,
  createFunctionDropdownContent,
  createGroup,
  createHorizontalAlignContent,
  createIconButton,
  createTooltip,
  createVerticalAlignContent,
  DropdownIconName,
  HorizontalAlignName,
  IconElementsName,
  toggleIconNames,
  toolbarPrefix,
  VerticalAlignName,
} from './htmlElementHelpers';

export interface IToolbarActionGroups {
  elements: HTMLElement[];
}

interface IConstructor {
  registeredFunctionNames: string[];
  options: IOptions;
  eventEmitter: EventEmitter;
}

interface IIconElements {
  buttonContainer: HTMLDivElement;
  button: HTMLButtonElement;
  iconContainer: HTMLSpanElement;
  icon: HTMLElement;
  tooltip?: HTMLSpanElement;
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
  firstBordersRow: [
    IIconElements,
    IIconElements,
    IIconElements,
    IIconElements,
    IIconElements
  ];
  secondBordersRow: [
    IIconElements,
    IIconElements,
    IIconElements,
    IIconElements,
    IIconElements
  ];
}

interface IAlignElements {
  aligns: [IIconElements, IIconElements, IIconElements];
}

interface IFunctionElement {
  registeredFunctionButtons: HTMLButtonElement[];
}

class Toolbar {
  toolbarEl: HTMLDivElement;
  iconElementsMap: Record<IconElementsName, IIconElements>;
  dropdownIconMap: Record<DropdownIconName, IDropdownElements>;
  colorPickerElementsMap: Record<ColorPickerIconName, IColorPickerElements>;
  borderElementsMap: Record<BorderIconName, IBorderElements>;
  horizontalAlignElementsMap: Record<HorizontalAlignName, IAlignElements>;
  verticalAlignElementsMap: Record<VerticalAlignName, IAlignElements>;
  functionElement: IFunctionElement;
  toolbarActionGroups: IToolbarActionGroups[];
  tooltip: DelegateInstance;
  dropdown: DelegateInstance;
  registeredFunctionNames: string[];
  options: IOptions;
  eventEmitter: EventEmitter;

  constructor(params: IConstructor) {
    this.registeredFunctionNames = params.registeredFunctionNames;
    this.options = params.options;
    this.eventEmitter = params.eventEmitter;

    this.toolbarEl = document.createElement('div');
    this.toolbarEl.classList.add(styles.toolbar, toolbarPrefix);

    this.iconElementsMap = {} as Record<string, IIconElements>;
    this.dropdownIconMap = {} as Record<DropdownIconName, IDropdownElements>;
    this.colorPickerElementsMap = {} as Record<
      ColorPickerIconName,
      IColorPickerElements
    >;
    this.borderElementsMap = {} as Record<BorderIconName, IBorderElements>;
    this.horizontalAlignElementsMap = {} as Record<
      HorizontalAlignName,
      IAlignElements
    >;
    this.verticalAlignElementsMap = {} as Record<
      VerticalAlignName,
      IAlignElements
    >;
    this.functionElement = {} as IFunctionElement;

    toggleIconNames.forEach((name) => {
      switch (name) {
        case 'backgroundColor': {
          this.setDropdownColorPicker(name);
          break;
        }
        case 'color': {
          this.setDropdownColorPicker(name);
          break;
        }
        case 'borderAll': {
          const {
            dropdownContent,
            borderGroups,
            firstBordersRow,
            secondBordersRow,
          } = createBordersContent();

          this.setDropdownContent(name, dropdownContent, true);

          this.borderElementsMap[name] = {
            borderGroups,
            firstBordersRow,
            secondBordersRow,
          };
          break;
        }
        case 'alignLeft': {
          const { dropdownContent, aligns } = createHorizontalAlignContent();

          this.setDropdownContent(name, dropdownContent, true);

          this.horizontalAlignElementsMap[name] = {
            aligns,
          };
          break;
        }
        case 'alignMiddle': {
          const { dropdownContent, aligns } = createVerticalAlignContent();

          this.setDropdownContent(name, dropdownContent, true);

          this.verticalAlignElementsMap[name] = {
            aligns,
          };
          break;
        }
        case 'function': {
          const { dropdownContent, registeredFunctionButtons } =
            createFunctionDropdownContent(this.registeredFunctionNames);

          this.setDropdownContent(name, dropdownContent, true);

          this.functionElement = {
            registeredFunctionButtons,
          };

          break;
        }
        default: {
          const iconElements = createIconButton(name);
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

    this.dropdown = delegate(this.toolbarEl, {
      target: `.${toolbarPrefix}-dropdown-icon-button`,
      trigger: 'click',
      theme: 'dropdown',
      placement: 'auto',
      interactive: true,
      arrow: false,
      onHide: ({ reference }) => {
        const button = reference as HTMLButtonElement;

        delete button.dataset.active;
      },
      content: (e) => {
        const button = e as HTMLButtonElement;
        const name = button.dataset.name as DropdownIconName;

        if (!name) return '';

        button.dataset.active = 'true';

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
          icons.borderAll.buttonContainer,
          icons.merge.buttonContainer,
        ],
      },
      {
        elements: [
          icons.alignLeft.buttonContainer,
          icons.alignMiddle.buttonContainer,
          icons.textWrap.buttonContainer,
        ],
      },
      {
        elements: [
          icons.freeze.buttonContainer,
          icons.function.buttonContainer,
          icons.formula.buttonContainer,
        ],
      },
      {
        elements: [icons.export.buttonContainer],
      },
    ];

    this.toolbarActionGroups.forEach(({ elements }) => {
      const group = createGroup(elements);

      this.toolbarEl.appendChild(group);
    });

    this.setDisabled(this.iconElementsMap.merge, true);

    this.eventEmitter.on(events.selector.startSelection, this.onStartSelection);
    this.eventEmitter.on(events.selector.moveSelection, this.onMoveSelection);
  }

  onStartSelection = (sheet: Sheet, selectedCell: Cell) => {
    const selectedCellId = selectedCell.id();

    this.iconElementsMap.merge.button.disabled = true;

    if (sheet.cellsMap.has(selectedCellId)) {
      const cell = sheet.cellsMap.get(selectedCellId)!;
      const cellRect = cell.children?.find(
        (x) => x.attrs.type === 'cellRect'
      ) as Rect;

      this.colorPickerElementsMap.backgroundColor.colorBar.style.backgroundColor =
        cellRect.fill();

      if (cell.attrs.isMerged) {
        this.iconElementsMap.merge.button.disabled = false;
      }
    } else {
      this.colorPickerElementsMap.backgroundColor.colorBar.style.backgroundColor =
        'white';
    }
  };

  onMoveSelection = (sheet: Sheet, selectedCells: Cell[]) => {
    this.iconElementsMap.merge.button.disabled = selectedCells.length <= 1;
  };

  destroy() {
    this.eventEmitter.off(events.selector.startSelection);
    this.eventEmitter.off(events.selector.moveSelection);

    this.toolbarEl.remove();
    this.tooltip.destroy();
  }

  setDropdownContent(
    name: DropdownIconName,
    dropdownContent: HTMLDivElement,
    createArrow?: boolean
  ) {
    const { iconButtonValues, arrowIconValues } = createDropdownIconButton(
      name,
      createArrow
    );

    this.iconElementsMap[name] = iconButtonValues;

    this.dropdownIconMap[name] = {
      dropdownContent,
      ...arrowIconValues,
    };
  }

  setDropdownColorPicker(name: ColorPickerIconName) {
    const { dropdownContent, colorPicker, picker } = createColorPickerContent();

    this.setDropdownContent(name, dropdownContent);

    const colorBar = createColorBar(picker);

    picker.on('change', (_, color) => {
      this.eventEmitter.emit(events.toolbar.change, name, color);
    });

    this.iconElementsMap[name].button.appendChild(colorBar);

    this.colorPickerElementsMap[name] = {
      colorBar,
      picker,
      colorPicker,
    };
  }

  setDisabled(iconElements: IIconElements, disabled: boolean) {
    iconElements.button.disabled = disabled;
  }
}

export default Toolbar;
