import { ACPController, createPicker } from 'a-color-picker'
import { sentenceCase } from 'change-case'
import {
  createDropdownContent,
  createIconButton,
  createTooltip,
  DropdownIconName
} from '../htmlElementHelpers'
import { ITextPatternFormats } from '../options'
import { prefix } from '../utils'
import styles from './Toolbar.module.scss'

export const toolbarPrefix = `${prefix}-toolbar`

export type ColorPickerIconName = 'backgroundColor' | 'fontColor'

export type BorderIconFirstRowsName =
  | 'borderAll'
  | 'borderInside'
  | 'borderHorizontal'
  | 'borderVertical'
  | 'borderOutside'

export type BorderIconSecondRowsName =
  | 'borderLeft'
  | 'borderTop'
  | 'borderRight'
  | 'borderBottom'
  | 'borderNone'

export type BorderIconName = BorderIconFirstRowsName | BorderIconSecondRowsName

export type HorizontalTextAlignName = 'alignLeft' | 'alignCenter' | 'alignRight'

export type VerticalTextAlignName = 'alignTop' | 'alignMiddle' | 'alignBottom'

export type InnerDropdownIconName =
  | BorderIconName
  | HorizontalTextAlignName
  | VerticalTextAlignName

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
  'borderHorizontal'
]

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
  'freeze',
  'ellipsis',
  'borders',
  'export',
  'formula',
  'functionHelper'
]

export type IconElementsName =
  | DropdownIconName
  | InnerDropdownIconName
  | typeof toggleIconNames[number]
  | 'autosave'

export type FontSizes = {
  [index: number]: HTMLButtonElement
}

export const createToolbarIconButton = (name: IconElementsName) =>
  createIconButton(name, toolbarPrefix)

export const createColorPickerContent = () => {
  const dropdownContent = createDropdownContent(toolbarPrefix)

  const colorPicker = document.createElement('div')

  colorPicker.classList.add(styles.colorPicker, `${toolbarPrefix}-color-picker`)

  const picker = createPicker(colorPicker, {
    palette: 'PALETTE_MATERIAL_CHROME',
    paletteEditable: true
  })

  dropdownContent.appendChild(colorPicker)

  return { dropdownContent, colorPicker, picker }
}

export const createColorBar = (picker: ACPController) => {
  const colorBar = document.createElement('span')

  colorBar.classList.add(styles.colorBar, `${toolbarPrefix}-color-bar`)

  picker.on('change', (_, color) => {
    if (color) {
      colorBar.style.backgroundColor = color
    }
  })

  return colorBar
}

export const createAutosave = () => {
  const name = 'autosave'
  const iconButton = createIconButton(name, toolbarPrefix)

  const autosave = {
    ...iconButton,
    tooltip: createTooltip(name, toolbarPrefix)
  }

  const text = document.createElement('div')

  text.classList.add(styles.autosaveText, `${toolbarPrefix}-autosave-text`)

  autosave.button.appendChild(text)
  autosave.button.appendChild(autosave.tooltip)

  return { autosave, text }
}

export const createBordersContent = () => {
  const dropdownContent = createDropdownContent(toolbarPrefix, styles.borders)

  const firstBordersRow = {
    borderAll: createToolbarIconButton('borderAll'),
    borderInside: createToolbarIconButton('borderInside'),
    borderHorizontal: createToolbarIconButton('borderHorizontal'),
    borderVertical: createToolbarIconButton('borderVertical'),
    borderOutside: createToolbarIconButton('borderOutside')
  }

  const secondBordersRow = {
    borderLeft: createToolbarIconButton('borderLeft'),
    borderTop: createToolbarIconButton('borderTop'),
    borderRight: createToolbarIconButton('borderRight'),
    borderBottom: createToolbarIconButton('borderBottom'),
    borderNone: createToolbarIconButton('borderNone')
  }

  const borderGroups: [HTMLDivElement, HTMLDivElement] = [
    document.createElement('div'),
    document.createElement('div')
  ]

  Object.values(firstBordersRow).forEach(border => {
    borderGroups[0].appendChild(border.buttonContainer)
  })

  Object.values(secondBordersRow).forEach(border => {
    borderGroups[1].appendChild(border.buttonContainer)
  })

  borderGroups.forEach(borderGroup => {
    borderGroup.classList.add(
      styles.bordersGroup,
      `${toolbarPrefix}-borders-group`
    )

    dropdownContent.appendChild(borderGroup)
  })

  return { dropdownContent, borderGroups, firstBordersRow, secondBordersRow }
}

export const createVerticalTextAlignContent = () => {
  const dropdownContent = createDropdownContent(toolbarPrefix)

  const aligns = {
    alignTop: createToolbarIconButton('alignTop'),
    alignMiddle: createToolbarIconButton('alignMiddle'),
    alignBottom: createToolbarIconButton('alignBottom')
  }

  Object.values(aligns).forEach(align => {
    dropdownContent.appendChild(align.buttonContainer)
  })

  return { dropdownContent, aligns }
}

export const createHorizontalTextAlignContent = () => {
  const dropdownContent = createDropdownContent(toolbarPrefix)

  const aligns = {
    alignLeft: createToolbarIconButton('alignLeft'),
    alignCenter: createToolbarIconButton('alignCenter'),
    alignRight: createToolbarIconButton('alignRight')
  }

  Object.values(aligns).forEach(align => {
    dropdownContent.appendChild(align.buttonContainer)
  })

  return { dropdownContent, aligns }
}

export const createTextFormatContent = (textFormatMap: ITextPatternFormats) => {
  const dropdownContent = createDropdownContent(
    toolbarPrefix,
    styles.textFormats
  )

  const createTextFormatButton = (textFormat: string) => {
    const textFormatButton = document.createElement('button')

    textFormatButton.textContent = sentenceCase(textFormat)

    textFormatButton.classList.add(
      `${toolbarPrefix}-format`,
      styles.textFormatButton,
      textFormat
    )

    return textFormatButton
  }

  const textFormats: Record<string, HTMLButtonElement> = {}

  Object.keys(textFormatMap).forEach(key => {
    const textFormatButton = createTextFormatButton(key)

    textFormats[key] = textFormatButton
    dropdownContent.appendChild(textFormatButton)
  })

  return { dropdownContent, textFormats }
}

export const createFontSizeContent = (fontSizes: number[]) => {
  const dropdownContent = createDropdownContent(toolbarPrefix, styles.fontSizes)

  const createFontSizeButton = (fontSize: number) => {
    const fontSizeButton = document.createElement('button')

    fontSizeButton.textContent = fontSize.toString()

    fontSizeButton.classList.add(
      `${toolbarPrefix}-font-size`,
      styles.fontSizeButton,
      fontSize.toString()
    )

    return fontSizeButton
  }

  const fontSizeMap: FontSizes = {}

  fontSizes.forEach(fontSize => {
    const fontSizeButton = createFontSizeButton(fontSize)

    fontSizeMap[fontSize] = fontSizeButton

    dropdownContent.appendChild(fontSizeButton)
  })

  return { dropdownContent, fontSizes: fontSizeMap }
}
