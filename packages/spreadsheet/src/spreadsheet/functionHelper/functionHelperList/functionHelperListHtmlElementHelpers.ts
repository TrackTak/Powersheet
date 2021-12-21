import { Dictionary } from 'lodash'
import { prefix } from '../../utils'
import { IFunctionHelperData } from '../FunctionHelper'
import { functionHelperPrefix } from '../functionHelperHtmlElementHelpers'
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

  // const closeIcon = document.createElement('span')
  //   this.closeIcon.classList.add(`${functionHelperListPrefix}-close-icon`)
  //   this.closeButton = document.createElement('button')
  //   this.closeButton.classList.add(`${functionHelperListPrefix}-close-button`)
  //   this.closeButton.addEventListener('click', () => {
  //     this._spreadsheet.options.showFunctionHelper = false

  //     this._spreadsheet.render()
  //   })
  //   this.closeButton.append(this.closeIcon)
  //   drawerHeaderEl.appendChild(this.closeButton)

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

  const content = document.createElement('div')
  content.classList.add(`${functionHelperListPrefix}-function-item-content`)

  const nameEl = document.createElement('span')
  nameEl.classList.add(`${functionHelperListPrefix}-function-item-name`)
  nameEl.textContent = functionMetadata.header
  content.appendChild(nameEl)

  const parameterEl = document.createElement('span')
  parameterEl.textContent = `${
    functionMetadata.header
  }(${functionMetadata.parameters?.join(',')})`
  parameterEl.classList.add(
    `${functionHelperListPrefix}-function-item-parameter`
  )
  content.appendChild(parameterEl)

  const arrowIcon = document.createElement('span')
  arrowIcon.classList.add(`${functionHelperListPrefix}-function-item-icon`)
  content.appendChild(arrowIcon)

  functionItem.appendChild(content)

  return { functionItem }
}
