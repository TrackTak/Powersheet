import './FunctionHelperList.scss'
import { functionMetadataByGroup } from '../functionMetadata'
import {
  ClickHandler,
  createFunctionList,
  functionHelperListPrefix,
  updateFunctionList
} from './functionHelperListHtmlElementHelpers'
import { first } from 'lodash'

class FunctionHelperList {
  functionListEl!: HTMLDivElement
  drawerContentEl!: HTMLDivElement
  drawerHeaderEl!: HTMLDivElement

  constructor(private onFunctionItemClick: ClickHandler) {
    const { functionListEl, drawerHeaderEl, drawerContentEl } =
      createFunctionList(
        this._onSearch,
        this._toggleAccordion,
        functionMetadataByGroup
      )
    this.functionListEl = functionListEl
    this.drawerHeaderEl = drawerHeaderEl
    this.drawerContentEl = drawerContentEl
  }

  /**
   * @internal
   */
  private _onSearch = (e: Event) => {
    const searchText = (e.target as HTMLInputElement).value
    updateFunctionList(
      this.drawerContentEl,
      this._toggleAccordion,
      functionMetadataByGroup,
      searchText
    )
  }

  private _toggleAccordion = (e: Event) => {
    const target = e.currentTarget as HTMLElement
    const listItem = first(
      target.getElementsByClassName(
        `${functionHelperListPrefix}-function-item-content`
      )
    )
    if (!listItem) {
      return
    }
    if (listItem.classList.contains(`${functionHelperListPrefix}-expanded`)) {
      listItem.classList.remove(`${functionHelperListPrefix}-expanded`)
      target.classList.remove(`${functionHelperListPrefix}-expanded`)
    } else {
      listItem.classList.add(`${functionHelperListPrefix}-expanded`)
      target.classList.add(`${functionHelperListPrefix}-expanded`)
    }
  }

  /**
   * @internal
   */
  _destroy() {}
}

export default FunctionHelperList
