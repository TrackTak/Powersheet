
# Powersheet

`npm install --save @tracktak/powersheet`

`npm install --save hyperformula`

## Motivation for creating Powersheet & Alternatives
Tracktak is the parent company of powersheet. We needed a lightning fast spreadsheet that was as good as Google Sheets with full formula support and feature rich. 

Many alternative spreadsheet solution were tried, all of them have serious drawbacks ranging from them being:

- DOM solutions (Too slow for rendering when you have large sheets)
- No full formula or custom formula support
- No full cell pattern formatting
- Poor code quality

etc etc

## All environments setup
The below code is environment agnostic.

```html
<!-- index.html -->

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, shrink-to-fit=no"
    />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

```js
// buildPowersheet.js

import {
  Spreadsheet,
  Toolbar,
  FormulaBar,
  Exporter,
  BottomBar
} from '@tracktak/powersheet'
import { AlwaysSparse, HyperFormula } from 'hyperformula'

const buildPowersheet = () => {
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

export default buildPowersheet;

```

## Javascript environment

```js
// index.js

import buildPowersheet from './buildPowersheet'

const spreadsheet = buildPowersheet();

spreadsheet.initialize()

spreadsheet.eventEmitter.on('persistData', (sheetData, done) => {
  // Call a backend API endpoint and save the sheetData to your database here

  done()
})

const root = document.getElementById('root')

root.appendChild(spreadsheet.spreadsheetEl)
```

## React environment

```js
// index.js
import React, { useEffect, useState } from 'react'
import buildPowersheet from './buildPowersheet'

const Index = () => {
  const [spreadsheet, setSpreadsheet] = useState()
  const [containerEl, setContainerEl] = useState()

  useEffect(() => {
    const spreadsheet = buildPowersheet()

    setSpreadsheet(spreadsheet)

    return () => {
      spreadsheet?.destroy()
    }
  }, [])

  useEffect(() => {
    const persistData = async (sheetData, done) => {
      // Call a backend API endpoint and save the sheetData to your database here

      done()
    }

    spreadsheet?.eventEmitter.on('persistData', persistData)

    return () => {
      spreadsheet?.eventEmitter.off('persistData', persistData)
    }
  }, [saveSheetData, spreadsheet])

  useEffect(() => {
    if (spreadsheet && containerEl) {
      containerEl.appendChild(spreadsheet.spreadsheetEl)
      spreadsheet.initialize()
    }
  }, [containerEl, spreadsheet])

  if (!spreadsheet) return null

  return <div ref={setContainerEl} />
}

ReactDOM.render(<Index />, document.getElementById('root'));
```

## Vue
Vue is similar to React and will work the same way.

If you are using Vue then please consider adding an example here.

## Advanced Examples
The above examples are all 'uncontrolled' components. I.e the user is the one that edits the spreadsheet and makes changes.
Powersheet can also be used in a 'controlled' and 'mixed' way where you provide data into powersheet directly. To see these examples, go to the file `Powersheet.stories.ts` and view the code.

## Hyperformula
Powersheet is so powerful partly because it uses Hyperformula internally. [Hyperformula](https://handsontable.github.io/hyperformula/) is a formula calculation engine written by the Handsontable team.
Whereas other spreadsheet solutions either don't support all the Excel formulas or custom user formulas, Hyperformula does and so do we.

Powersheet has a peer dependency on hyperformula and requires you to pass an instance to Powersheet. This allows you to specify your own config in the Hyperformula instance.

## Methodology
The core 3 principles by which Powersheet will abide by is (in this order):

1. Performance -> The end goal is to get the performance to be as good as Google Sheets in all scenarios. We use Html5 canvas to achieve this as it is far faster to draw on the canvas than it is to destroy and render nodes.

2. Functionality -> Powersheet is opinionated and aims to clone the functionality from Google Sheets & Microsoft Excel. This means that all future features will be aimed at bridging this gap.

3. Extensibility -> Nearly all of Powersheet is available to modify or change by developers through the API.

## Tree shaking
By default Powersheet is built in a way to include only what you use. For example if you don't need exporting then do not import the 'Exporter' component. This will reduce your JS file bundle size by quite a lot.

## Styling DOM
Powersheet DOM components all have classes on them like so: `powersheet-xxx`. This means you can target them with css and not affect other components.

## Styling Canvas
The main canvas is not DOM, it is canvas and based on [Konvajs](https://github.com/konvajs/konva).

This means you cannot use css styling for this part. Instead you can override a lot of styles with the method `spreadsheet.setStyles(yourStyles)`.

To see the default styles and the structure, open `styles.ts`.

## Event System
Powersheet uses an eventEmitter internally, it is available on `spreadsheet.eventEmitter`. See the list of support events in `PowersheetEmitter.ts`

Here are the list of support methods on the `eventEmitter`:
https://nodejs.org/dist/v11.13.0/docs/api/events.html

## Formatting numbers
See the `CustomOptions` example in storybook for an example of the custom number patterns supplied.

We use [numfmt](https://github.com/borgar/numfmt) internally to format cell values. This library is Full ECMA-376 compatible which means that any Google Sheets or Excel formatting will work with Powersheet.

## API

TODO: Add JsDoc https://github.com/jsdoc/jsdoc
