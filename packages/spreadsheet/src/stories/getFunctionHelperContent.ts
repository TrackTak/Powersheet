import {
  createCodeText,
  createHeader,
  createMainHeader,
  createParagraph,
  createSyntaxListItem
} from '../spreadsheet/functionHelper/functionHelperHtmlElementHelpers'

const getFunctionHelperContent = (): HTMLElement => {
  const content = document.createElement('div')

  const { mainHeaderEl } = createMainHeader('Test')
  const { paragraphEl: description } = createParagraph('Test description')
  const { header: headerUsage } = createHeader('Sample Usage')
  const { codeEl } = createCodeText('=TEST(attribute, [startDate], [endDate])')
  const codeSyntaxList = document.createElement('ul')
  const { listItem } = createSyntaxListItem('attribute', 'test attribute')

  content.appendChild(mainHeaderEl)
  content.appendChild(description)
  content.appendChild(headerUsage)
  content.appendChild(codeEl)
  content.appendChild(codeSyntaxList)
  codeSyntaxList.appendChild(listItem)

  return content
}

export default getFunctionHelperContent
