import './FunctionHelperList.scss'
import {
  createFunctionList,
  functionHelperListPrefix,
  updateFunctionList
} from './functionHelperListHtmlElementHelpers'
import { Dictionary, first } from 'lodash'
import { IFunctionHelperData } from '../FunctionHelper'

class FunctionHelperList {
  functionListEl!: HTMLDivElement
  drawerContentEl!: HTMLDivElement
  drawerHeaderEl!: HTMLDivElement
  searchInput!: HTMLInputElement

  constructor(
    private functionMetadataByGroup: Dictionary<
      [IFunctionHelperData, ...IFunctionHelperData[]]
    >
  ) {
    const { functionListEl, drawerHeaderEl, drawerContentEl, searchInput } =
      createFunctionList(
        this._onSearch,
        this._handleItemClick,
        functionMetadataByGroup
      )
    this.functionListEl = functionListEl
    this.drawerHeaderEl = drawerHeaderEl
    this.drawerContentEl = drawerContentEl
    this.searchInput = searchInput
  }

  scrollToFunction(functionName: string) {
    this.searchInput.value = ''
    updateFunctionList(
      this.drawerContentEl,
      this._handleItemClick,
      this.functionMetadataByGroup
    )
    const functionEl = document.getElementById(functionName)
    if (functionEl) {
      const topPos = functionEl.offsetTop
      this.drawerContentEl.scrollTop = topPos
      this._toggleAccordion(functionEl)
    }
  }

  setFunctionMetadata(
    functionMetadataByGroup: Dictionary<
      [IFunctionHelperData, ...IFunctionHelperData[]]
    >
  ) {
    this.functionMetadataByGroup = functionMetadataByGroup
  }

  private _onSearch = (e: Event) => {
    const searchText = (e.target as HTMLInputElement).value
    updateFunctionList(
      this.drawerContentEl,
      this._handleItemClick,
      this.functionMetadataByGroup,
      searchText
    )
  }

  private _handleItemClick = (e: Event) => {
    const target = e.currentTarget as HTMLElement
    this._toggleAccordion(target)
  }

  private _toggleAccordion = (listItem: HTMLElement) => {
    const content = first(
      listItem.getElementsByClassName(
        `${functionHelperListPrefix}-function-item-content`
      )
    )
    if (content) {
      if (listItem.classList.contains(`${functionHelperListPrefix}-expanded`)) {
        listItem.classList.remove(`${functionHelperListPrefix}-expanded`)
        content.classList.remove(`${functionHelperListPrefix}-expanded`)
      } else {
        listItem.classList.add(`${functionHelperListPrefix}-expanded`)
        content.classList.add(`${functionHelperListPrefix}-expanded`)
      }
    }
  }
}

export default FunctionHelperList
