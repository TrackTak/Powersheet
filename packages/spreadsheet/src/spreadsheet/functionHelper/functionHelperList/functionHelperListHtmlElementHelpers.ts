import { Dictionary } from 'lodash'
import { prefix } from '../../utils'
import { IFunctionHelperData } from '../FunctionHelper'
import {
  createCodeText,
  createHeader,
  createParagraph,
  createSubHeader,
  createSyntaxListItem,
  functionHelperPrefix
} from '../functionHelperHtmlElementHelpers'
import './FunctionHelperList.scss'

export const functionHelperListPrefix = `${prefix}-function-helper-list`

export type ClickHandler = (event: MouseEvent) => void
export type SearchHandler = (event: Event) => void

export const createFunctionList = (
  onSearch: SearchHandler,
  onFunctionItemClick: ClickHandler,
  functionMetadataByGroup: Dictionary<
    [IFunctionHelperData, ...IFunctionHelperData[]]
  >
) => {
  const functionListEl = document.createElement('div')
  functionListEl.classList.add(`${functionHelperListPrefix}-wrapper`)
  const drawerHeaderEl = document.createElement('div')
  drawerHeaderEl.classList.add(
    `${functionHelperPrefix}-drawer-header`,
    'mdc-drawer__header'
  )
  drawerHeaderEl.dir = 'ltr'

  const headerText = document.createElement('h3')
  headerText.textContent = 'Function Helper'
  drawerHeaderEl.appendChild(headerText)

  const searchInput = document.createElement('input')
  searchInput.classList.add(`${functionHelperListPrefix}-search-input`)
  searchInput.placeholder = 'Search Function'
  searchInput.addEventListener('input', onSearch)
  drawerHeaderEl.appendChild(searchInput)

  const drawerContentEl = document.createElement('div')
  drawerContentEl.classList.add(
    `${functionHelperListPrefix}-drawer-content`,
    'mdc-drawer__content'
  )
  drawerContentEl.dir = 'ltr'

  updateFunctionList(
    drawerContentEl,
    onFunctionItemClick,
    functionMetadataByGroup
  )

  functionListEl.appendChild(drawerHeaderEl)
  functionListEl.appendChild(drawerContentEl)

  return { functionListEl, drawerHeaderEl, drawerContentEl }
}

export const updateFunctionList = (
  content: HTMLDivElement,
  onClick: ClickHandler,
  functionMetadataByGroup: Dictionary<
    [IFunctionHelperData, ...IFunctionHelperData[]]
  >,
  filter?: string
) => {
  content.replaceChildren()
  Object.keys(functionMetadataByGroup).forEach(key => {
    const filtered = functionMetadataByGroup[key].filter(
      formula =>
        !filter ||
        formula.header.toUpperCase().includes((filter ?? '').toUpperCase())
    )
    if (filtered.length > 0) {
      const { section } = createFunctionGroupSection(key)
      content.appendChild(section)
      filtered.map(formulaMetadata => {
        const { functionItem } = createFunctionItem(formulaMetadata)
        functionItem.setAttribute('data-function-name', formulaMetadata.header)
        functionItem.addEventListener('click', onClick)
        content.appendChild(functionItem)
      })
    }
  })
}

export const createFunctionGroupSection = (name: string) => {
  const section = document.createElement('section')
  section.classList.add(`${functionHelperListPrefix}-section`)

  const header = document.createElement('h2')
  header.classList.add(`${functionHelperListPrefix}-section-header`)
  header.textContent = name
  section.appendChild(header)

  return { section }
}

export const createFunctionItem = (functionMetadata: IFunctionHelperData) => {
  const functionItem = document.createElement('div')
  functionItem.classList.add(
    `${functionHelperListPrefix}-function-item-wrapper`
  )

  const collapsedContent = document.createElement('div')
  collapsedContent.classList.add(
    `${functionHelperListPrefix}-function-item-header`
  )

  const nameEl = document.createElement('span')
  nameEl.classList.add(`${functionHelperListPrefix}-function-item-name`)
  nameEl.textContent = functionMetadata.header
  collapsedContent.appendChild(nameEl)

  const parameterEl = document.createElement('span')
  parameterEl.textContent = `${
    functionMetadata.header
  }(${functionMetadata.parameters?.join(',')})`
  parameterEl.classList.add(
    `${functionHelperListPrefix}-function-item-parameter`
  )
  collapsedContent.appendChild(parameterEl)

  const arrowIcon = document.createElement('span')
  arrowIcon.classList.add(`${functionHelperListPrefix}-function-item-icon`)
  collapsedContent.appendChild(arrowIcon)

  functionItem.appendChild(collapsedContent)

  // const functionDetailsContent = document.createElement('div')
  // functionDetailsContent.classList.add(`${functionHelperListPrefix}-function-item-content`)
  // functionDetailsContent.appendChild(parameterEl.cloneNode(true))
  const { functionDetailsContent } =
    _createFunctionDetailsContent(functionMetadata)

  functionItem.appendChild(functionDetailsContent)

  // functionItem.addEventListener('click', onClick)

  return { functionItem }
}

const _createFunctionDetailsContent = (
  functionMetadata: IFunctionHelperData
) => {
  const functionDetailsContent = document.createElement('div')
  functionDetailsContent.classList.add(
    `${functionHelperListPrefix}-function-item-content`
  )

  const { paragraphEl: description } = createParagraph(
    functionMetadata.headerDescription
  )
  description.classList.add(`${functionHelperListPrefix}-description`)

  const { header: headerUsage } = createHeader('Sample Usage')
  const { header: headerSyntax } = createHeader('Syntax')
  const { header: headerAttributes } = createHeader('Attributes')

  // this.functionSummaryHelperListContainerEl.appendChild(mainHeaderEl)
  // this.functionSummaryHelperListContainerEl.appendChild(this.textWrapper)
  functionDetailsContent.appendChild(description)

  if (functionMetadata.codeSyntaxUsage.length) {
    functionDetailsContent.appendChild(headerUsage)
  }

  functionMetadata.codeSyntaxUsage.forEach(usageName => {
    const { codeEl } = createCodeText(usageName)
    functionDetailsContent.appendChild(codeEl)
  })

  functionMetadata.codeSyntaxElements?.length &&
    functionDetailsContent.appendChild(headerSyntax)
  functionMetadata.codeSyntaxElements.forEach(({ codeSyntax, values }) => {
    const codeSyntaxList = document.createElement('ul')
    const { codeEl } = createCodeText(codeSyntax)

    functionDetailsContent.appendChild(codeEl)
    functionDetailsContent.appendChild(codeSyntaxList)

    values.forEach(({ syntaxName, description }) => {
      const { listItem } = createSyntaxListItem(syntaxName, description)
      codeSyntaxList.appendChild(listItem)
    })
  })

  functionMetadata.attributes?.length &&
    functionDetailsContent.appendChild(headerAttributes)
  functionMetadata.attributes.forEach(({ attributeNames, header }) => {
    const attributeList = document.createElement('ul')

    functionDetailsContent.appendChild(createSubHeader(header).subHeader)
    functionDetailsContent.appendChild(attributeList)

    attributeNames.forEach(attributeName => {
      const { listItem } = createSyntaxListItem(attributeName)

      attributeList.appendChild(listItem)
    })
  })

  return { functionDetailsContent }
}

// const _toggleAccordion = (e: Event) => {
//   const target = e.currentTarget as HTMLElement
//   if (
//     target.classList.contains(
//       `${functionHelperListPrefix}-expanded`
//     )
//   ) {
//     target.classList.remove(
//       `${functionHelperListPrefix}-collapse-icon`
//     )
//     target.classList.remove(
//       `${functionHelperListPrefix}-expanded`
//     )
//   } else {
//     target.classList.add(
//       `${functionHelperListPrefix}-collapse-icon`
//     )
//     target.classList.add(`${functionHelperListPrefix}-expanded`)
//   }
// }
