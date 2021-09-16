import { ACPController, createPicker } from 'a-color-picker';
import { sentenceCase } from 'sentence-case';
import {
  createDropdownContent,
  createIconButton,
  DropdownIconName,
} from '../htmlElementHelpers';
import { prefix } from '../utils';
import { ITextFormatMap } from './Toolbar';
import styles from './Toolbar.module.scss';

export const toolbarPrefix = `${prefix}-toolbar`;

export type ColorPickerIconName = 'backgroundColor' | 'fontColor';

export type BorderIconFirstRowsName =
  | 'borderAll'
  | 'borderInside'
  | 'borderHorizontal'
  | 'borderVertical'
  | 'borderOutside';

export type BorderIconSecondRowsName =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom'
  | 'borderNone';

export type BorderIconName = BorderIconFirstRowsName | BorderIconSecondRowsName;

export type HorizontalTextAlignName =
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight';

export type VerticalTextAlignName = 'alignTop' | 'alignMiddle' | 'alignBottom';

export type InnerDropdownIconName =
  | BorderIconName
  | HorizontalTextAlignName
  | VerticalTextAlignName;

export const borderTypes: [
  BorderIconName,
  BorderIconName,
  BorderIconName,
  BorderIconName,
  BorderIconName,
  BorderIconName
] = [
  'borderLeft',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderVertical',
  'borderHorizontal',
];

export const toggleIconNames = <const>[
  'undo',
  'redo',
  'bold',
  'italic',
  'fontColor',
  'underline',
  'strikeThrough',
  'backgroundColor',
  'merge',
  'horizontalTextAlign',
  'verticalTextAlign',
  'textWrap',
  'functions',
  'freeze',
  'ellipsis',
  'borders',
  'export',
  'formula',
];

export const fontSizeArray = <const>[6, 7, 8, 9, 10, 11, 12, 14, 18, 24, 36];

export type IconElementsName =
  | DropdownIconName
  | InnerDropdownIconName
  | typeof toggleIconNames[number];

export type FontSizes = {
  [index in typeof fontSizeArray[number]]: HTMLButtonElement;
};

export const createToolbarIconButton = (name: IconElementsName) =>
  createIconButton(name, toolbarPrefix);

export const createColorPickerContent = () => {
  const dropdownContent = createDropdownContent(toolbarPrefix);

  const colorPicker = document.createElement('div');

  colorPicker.classList.add(
    styles.colorPicker,
    `${toolbarPrefix}-color-picker`
  );

  const picker = createPicker(colorPicker, {
    palette: 'PALETTE_MATERIAL_CHROME',
    paletteEditable: true,
    showAlpha: true,
  });

  dropdownContent.appendChild(colorPicker);

  return { dropdownContent, colorPicker, picker };
};

export const createColorBar = (picker: ACPController) => {
  const colorBar = document.createElement('span');

  colorBar.classList.add(styles.colorBar, `${toolbarPrefix}-color-bar`);

  picker.on('change', (_, color) => {
    if (color) {
      colorBar.style.backgroundColor = color;
    }
  });

  return colorBar;
};

export const createBordersContent = () => {
  const dropdownContent = createDropdownContent(toolbarPrefix, styles.borders);

  const firstBordersRow = {
    borderAll: createToolbarIconButton('borderAll'),
    borderInside: createToolbarIconButton('borderInside'),
    borderHorizontal: createToolbarIconButton('borderHorizontal'),
    borderVertical: createToolbarIconButton('borderVertical'),
    borderOutside: createToolbarIconButton('borderOutside'),
  };

  const secondBordersRow = {
    borderLeft: createToolbarIconButton('borderLeft'),
    borderTop: createToolbarIconButton('borderTop'),
    borderRight: createToolbarIconButton('borderRight'),
    borderBottom: createToolbarIconButton('borderBottom'),
    borderNone: createToolbarIconButton('borderNone'),
  };

  const borderGroups: [HTMLDivElement, HTMLDivElement] = [
    document.createElement('div'),
    document.createElement('div'),
  ];

  Object.values(firstBordersRow).forEach((border) => {
    borderGroups[0].appendChild(border.buttonContainer);
  });

  Object.values(secondBordersRow).forEach((border) => {
    borderGroups[1].appendChild(border.buttonContainer);
  });

  borderGroups.forEach((borderGroup) => {
    borderGroup.classList.add(
      styles.bordersGroup,
      `${toolbarPrefix}-borders-group`
    );

    dropdownContent.appendChild(borderGroup);
  });

  return { dropdownContent, borderGroups, firstBordersRow, secondBordersRow };
};

export const createVerticalTextAlignContent = () => {
  const dropdownContent = createDropdownContent(toolbarPrefix);

  const aligns = {
    alignTop: createToolbarIconButton('alignTop'),
    alignMiddle: createToolbarIconButton('alignMiddle'),
    alignBottom: createToolbarIconButton('alignBottom'),
  };

  Object.values(aligns).forEach((align) => {
    dropdownContent.appendChild(align.buttonContainer);
  });

  return { dropdownContent, aligns };
};

export const createHorizontalTextAlignContent = () => {
  const dropdownContent = createDropdownContent(toolbarPrefix);

  const aligns = {
    alignLeft: createToolbarIconButton('alignLeft'),
    alignCenter: createToolbarIconButton('alignCenter'),
    alignRight: createToolbarIconButton('alignRight'),
  };

  Object.values(aligns).forEach((align) => {
    dropdownContent.appendChild(align.buttonContainer);
  });

  return { dropdownContent, aligns };
};

export const createTextFormatContent = (textFormatMap: ITextFormatMap) => {
  const dropdownContent = createDropdownContent(
    toolbarPrefix,
    styles.textFormats
  );

  const createTextFormatButton = (textFormat: keyof ITextFormatMap) => {
    const textFormatButton = document.createElement('button');

    textFormatButton.textContent = sentenceCase(textFormat);

    textFormatButton.classList.add(
      `${toolbarPrefix}-format`,
      styles.textFormatButton,
      textFormat
    );

    return textFormatButton;
  };

  const textFormats: Record<string, HTMLButtonElement> = {};

  Object.keys(textFormatMap).forEach((key) => {
    const textFormat = key as keyof ITextFormatMap;
    const textFormatButton = createTextFormatButton(textFormat);

    textFormats[key] = textFormatButton;
    dropdownContent.appendChild(textFormatButton);
  });

  return { dropdownContent, textFormats };
};

export const createFontSizeContent = () => {
  const dropdownContent = createDropdownContent(
    toolbarPrefix,
    styles.fontSizes
  );

  const createFontSizeButton = (fontSize: number) => {
    const fontSizeButton = document.createElement('button');

    fontSizeButton.textContent = fontSize.toString();

    fontSizeButton.classList.add(
      `${toolbarPrefix}-font-size`,
      styles.fontSizeButton,
      fontSize.toString()
    );

    return fontSizeButton;
  };

  const fontSizes: FontSizes = {} as FontSizes;

  fontSizeArray.forEach((fontSize) => {
    const fontSizeButton = createFontSizeButton(fontSize);

    fontSizes[fontSize] = fontSizeButton;

    dropdownContent.appendChild(fontSizeButton);
  });

  return { dropdownContent, fontSizes };
};

export const createFunctionDropdownContent = (
  registeredFunctionNames: string[]
) => {
  const dropdownContent = createDropdownContent(
    toolbarPrefix,
    styles.functions
  );

  const registeredFunctionButtons = registeredFunctionNames.map(
    (functionName) => {
      const button = document.createElement('button');

      button.classList.add(functionName, styles.functionNameButton);

      button.textContent = functionName;

      dropdownContent.appendChild(button);

      return button;
    }
  );

  return { dropdownContent, registeredFunctionButtons };
};
