const fs = require('fs')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

;(async function () {
  try {
    const gSheetsFormulaData = fs.readFileSync(
      `./rawData/gSheetsFormulaMetadata.csv`,
      'utf8'
    )

    // 1. Read basic function description data from Google Sheets Formula Data
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

    // 2. Add Basic Google Formula Information to all Hyperformula functions
    const hfFormulaData = fs.readFileSync(
      `./rawData/hfFormulaMetadata.csv`,
      'utf8'
    )
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
          codeSyntaxElements: [],
          attributes: []
        }
      }
    })

    // 3. Add Sample Usage and Syntax from scraped Google Sheets sites to Hyperformula functions
    const incorrectFormattedFunctions = []
    const formulaDetails = fs.readFileSync(
      `./rawData/gSheetsDocumentation.csv`,
      'utf8'
    )
    const formulaDetailsLines = formulaDetails.split(/\r?\n/)
    formulaDetailsLines.forEach((line, i) => {
      const dom = new JSDOM(line)
      const functionName = dom.window.document
        .querySelector('h1')
        ?.textContent.split(' ')?.[0]

      // Only add data for functions that are in the Hyperformula library
      if (hfData[functionName]) {
        const functionData = dom.window.document.querySelector('.cc')
        const codeSyntaxUsage = []
        const codeSyntaxElements = []
        for (let i = 0; i < functionData.children.length; i++) {
          // Sample usage (codeSyntaxUsage)
          if (functionData.children[i].textContent === 'Sample usage') {
            i += 1
            while (!functionData.children[i].textContent.startsWith('Syntax')) {
              if (i === functionData.children.length) {
                break
              }
              codeSyntaxUsage.push(functionData.children[i].textContent)
              i++
            }
          }

          // Syntax (codeSyntaxElements)
          if (functionData.children[i].textContent === 'Syntax') {
            i++
            const codeSyntax = functionData.children[i]?.textContent
            i++
            const values = Array.from(
              functionData.children[i].querySelectorAll('ul > li')
            ).map(li => {
              const text = li.textContent
              const split = text.split('–')
              return {
                syntaxName: split[0]?.trim() || '',
                description: split[1]?.trim() || ''
              }
            })

            codeSyntaxElements.push({
              codeSyntax,
              values
            })
          }
        }

        if (codeSyntaxUsage.length === 0) {
          incorrectFormattedFunctions.push(functionName)
        }
        hfData[functionName].codeSyntaxUsage = codeSyntaxUsage
        hfData[functionName].codeSyntaxElements = codeSyntaxElements
      }
    })

    fs.writeFileSync(
      `./output/powersheetFormulaMetadata.json`,
      JSON.stringify(hfData)
    )
    console.log(
      `${incorrectFormattedFunctions.length} incorrectly formatted functions: ${incorrectFormattedFunctions}`
    )
  } catch (e) {
    console.error(e)
  }
})()
