
See the README.md file.

`npm install --save @tracktak/powersheet`
`npm install --save hyperformula`

## Javascript setup

```js
import {
  Spreadsheet,
  Toolbar,
  FormulaBar,
  Exporter,
  BottomBar
} from '@tracktak/powersheet'
import { AlwaysSparse, HyperFormula } from 'hyperformula'

const getSpreadsheet = () => {
  const hyperformula = HyperFormula.buildEmpty({
    chooseAddressMappingPolicy: new AlwaysSparse(),
    // Powersheet uses it's own undo/redo instead
    undoLimit: 0,
    licenseKey: 'gpl-v3'
  })
  const toolbar = new Toolbar()
  const formulaBar = new FormulaBar()
  const exporter = new Exporter()
  const bottomBar = new BottomBar()

  const spreadsheet = new Spreadsheet({
    hyperformula,
    toolbar,
    formulaBar,
    exporter,
    bottomBar
  })

  spreadsheet.initialize()

  spreadsheet.eventEmitter.on('persistData', (_, done) => {
    // Simulating an async API call that saves the sheet data to
    // a DB
    setTimeout(() => {
      done()
    }, 500)
  })

  toolbar.setToolbarIcons([
    {
      elements: [
        toolbar.iconElementsMap.undo.buttonContainer,
        toolbar.iconElementsMap.redo.buttonContainer
      ]
    },
    {
      elements: [toolbar.buttonElementsMap.textFormatPattern.buttonContainer]
    },
    {
      elements: [toolbar.buttonElementsMap.fontSize.buttonContainer]
    },
    {
      elements: [
        toolbar.iconElementsMap.bold.buttonContainer,
        toolbar.iconElementsMap.italic.buttonContainer,
        toolbar.iconElementsMap.underline.buttonContainer,
        toolbar.iconElementsMap.strikeThrough.buttonContainer,
        toolbar.iconElementsMap.fontColor.buttonContainer
      ]
    },
    {
      elements: [
        toolbar.iconElementsMap.backgroundColor.buttonContainer,
        toolbar.iconElementsMap.borders.buttonContainer,
        toolbar.iconElementsMap.merge.buttonContainer
      ]
    },
    {
      elements: [
        toolbar.iconElementsMap.horizontalTextAlign.buttonContainer,
        toolbar.iconElementsMap.verticalTextAlign.buttonContainer,
        toolbar.iconElementsMap.textWrap.buttonContainer
      ]
    },
    {
      elements: [
        toolbar.iconElementsMap.freeze.buttonContainer,
        toolbar.iconElementsMap.functions.buttonContainer,
        toolbar.iconElementsMap.formula.buttonContainer
      ]
    },
    {
      elements: [toolbar.iconElementsMap.export.buttonContainer]
    },
    {
      elements: [toolbar.iconElementsMap.autosave.buttonContainer]
    }
  ])

  spreadsheet.spreadsheetEl.prepend(formulaBar.formulaBarEl)
  spreadsheet.spreadsheetEl.prepend(toolbar.toolbarEl)
  spreadsheet.spreadsheetEl.appendChild(bottomBar.bottomBarEl)

  return spreadsheet
}
```

# React setup
