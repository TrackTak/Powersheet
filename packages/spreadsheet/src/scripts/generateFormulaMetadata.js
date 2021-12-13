const fs = require('fs')

;(async function () {
  try {
    const gSheetsFormulaData = fs.readFileSync(
      `gSheetsFormulaMetadata.csv`,
      'utf8'
    )

    const gSheetMetadata = {}
    const gSheetsLines = gSheetsFormulaData.split(/\r?\n/)
    gSheetsLines.forEach(line => {
      const data = line.split('|')
      gSheetMetadata[data[1]] = {
        type: data[0],
        name: data[1],
        parameters: data[2].split('(')[1].replace(')', ''),
        codeSyntaxElements: [
          {
            codeSyntax: `=${data[2]}`,
            values: []
          }
        ],
        description: data[3]
      }
    })

    const hfFormulaData = fs.readFileSync(`hfFormulaMetadata.csv`, 'utf8')
    const hfLines = hfFormulaData.split(/\r?\n/)
    const hfData = {}
    hfLines.forEach(line => {
      const data = line.split('|')
      const functionName = data[0]
      if (gSheetMetadata[functionName]) {
        hfData[functionName] = {
          header: functionName,
          headerDescription: data[1],
          type: gSheetMetadata[functionName].type,
          parameters: gSheetMetadata[functionName].parameters,
          codeSyntaxUsage: [],
          codeSyntaxElements: gSheetMetadata[functionName].codeSyntaxElements,
          attributes: []
        }
      }
    })

    fs.writeFileSync(
      `../spreadsheet/functionHelper/formulaMetadata.json`,
      JSON.stringify(hfData)
    )
  } catch (e) {
    console.error(e)
  }
})()
