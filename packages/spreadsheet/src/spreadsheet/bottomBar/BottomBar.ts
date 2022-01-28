import {
  createSheetSelectionDropdownContent,
  createSheetTab,
  createSheetSelectionDropdownButton,
  createSheetTabDropdownContent,
  bottomBarPrefix
} from './bottomBarHtmlElementHelpers'
import styles from './BottomBar.module.scss'
import tippy, { Instance, Props } from 'tippy.js'
import { createIconButton, IIconElements } from '../htmlElementHelpers'
import Spreadsheet from '../Spreadsheet'
import { ISheetMetadata } from '../sheets/Data'
import { getDefaultSheetMetadata } from '../utils'

export interface ISheetTabElements {
  sheetTabContainer: HTMLDivElement
  sheetTab: HTMLDivElement
  nameContainer: HTMLSpanElement
  sheetSelectionDropdownButton: HTMLButtonElement
  isActive: boolean
}

class BottomBar {
  bottomBarEl!: HTMLDivElement
  content!: HTMLDivElement
  sheetSelectionButtonContainer!: HTMLDivElement
  sheetSelectionButton!: IIconElements
  sheetSelectionDropdown!: Instance<Props>
  sheetSelectionDropdownContent!: HTMLDivElement
  createNewSheetButtonElements!: IIconElements
  tabContainer!: HTMLDivElement
  sheetTabElementsMap!: Map<number, ISheetTabElements>
  nameContainer!: HTMLSpanElement
  private _spreadsheet!: Spreadsheet

  private _setSheetTabElements(sheetId: number) {
    const { sheetTabContainer, sheetTab, nameContainer } = createSheetTab()
    const sheetSelectionDropdownButton = createSheetSelectionDropdownButton()
    const isActive = sheetId === this._spreadsheet.sheets.activeSheetId

    if (isActive) {
      sheetTab.classList.add('active')
    } else {
      sheetTab.classList.remove('active')
    }

    const sheetName = this._spreadsheet.hyperformula.getSheetName(sheetId)

    if (sheetName === undefined) {
      throw new Error('sheetName should not be undefined')
    }

    sheetSelectionDropdownButton.textContent = sheetName

    const switchSheet = () => {
      this._spreadsheet.sheets.switchSheet(sheetId)
    }

    const setTabToContentEditable = () => {
      nameContainer.contentEditable = 'true'
      nameContainer.focus()
    }

    const {
      sheetTabDropdownContent,
      deleteSheetButton,
      renameSheetButton
    } = createSheetTabDropdownContent()

    deleteSheetButton.disabled =
      this._spreadsheet.hyperformula.getSheetNames().length === 1

    const sheetTabDropdown = tippy(sheetTab, {
      placement: 'top',
      interactive: true,
      arrow: false,
      trigger: 'manual',
      theme: 'dropdown',
      showOnCreate: false,
      hideOnClick: true,
      content: sheetTabDropdownContent
    })

    sheetSelectionDropdownButton.addEventListener('click', () => {
      switchSheet()

      this.sheetSelectionDropdown.hide()
    })

    sheetTab.addEventListener('click', () => {
      if (!isActive) {
        switchSheet()
      }
    })

    sheetTab.addEventListener('dblclick', () => {
      setTabToContentEditable()
    })

    sheetTab.addEventListener('contextmenu', e => {
      e.preventDefault()

      sheetTabDropdown.show()
    })

    deleteSheetButton.addEventListener('click', () => {
      sheetTabDropdown.hide()

      this._spreadsheet.hyperformula.removeSheet(sheetId)
      this._spreadsheet.render()
      this._spreadsheet.persistData()
    })

    renameSheetButton.addEventListener('click', () => {
      sheetTabDropdown.hide()

      setTabToContentEditable()
    })

    nameContainer.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        this.renameSheet(sheetId)
      }
    })

    nameContainer.addEventListener('blur', () => {
      this.renameSheet(sheetId)
    })

    nameContainer.textContent = sheetName

    this.tabContainer.appendChild(sheetTabContainer)
    this.sheetSelectionDropdownContent.appendChild(sheetSelectionDropdownButton)

    this.sheetTabElementsMap.set(sheetId, {
      sheetTabContainer,
      sheetTab,
      nameContainer,
      sheetSelectionDropdownButton,
      isActive
    })

    this.nameContainer = nameContainer
  }

  private renameSheet(sheetId: number) {
    this.nameContainer.contentEditable = 'false'
    this.nameContainer.blur()

    this._spreadsheet.hyperformula.renameSheet(
      sheetId,
      this.nameContainer.textContent!
    )

    this._spreadsheet.render()
    this._spreadsheet.persistData()
  }

  private _sheetSelectionOnClick = () => {
    this.sheetSelectionDropdown.show()
  }

  private _createNewSheetButtonOnClick = () => {
    const sheetName = this._spreadsheet.hyperformula.addSheet<ISheetMetadata>(
      undefined,
      getDefaultSheetMetadata()
    )
    const sheetId = this._spreadsheet.hyperformula.getSheetId(sheetName)!

    this._spreadsheet.persistData()
    this._spreadsheet.sheets.switchSheet(sheetId)
  }

  /**
   * @param spreadsheet - The spreadsheet that this BottomBar is connected to.
   */
  initialize(spreadsheet: Spreadsheet) {
    this._spreadsheet = spreadsheet

    this.sheetTabElementsMap = new Map()

    this.createNewSheetButtonElements = createIconButton('add', bottomBarPrefix)
    this.createNewSheetButtonElements.buttonContainer.classList.add(
      styles.createNewSheetButtonContainer
    )
    this.createNewSheetButtonElements.button.addEventListener(
      'click',
      this._createNewSheetButtonOnClick
    )

    this.sheetSelectionButton = createIconButton('hamburger', bottomBarPrefix)
    this.sheetSelectionButton.button.addEventListener(
      'click',
      this._sheetSelectionOnClick
    )

    this.bottomBarEl = document.createElement('div')
    this.bottomBarEl.classList.add(styles.bottomBar, `${bottomBarPrefix}`)

    this.content = document.createElement('div')
    this.content.classList.add(styles.content, `${bottomBarPrefix}-content`)

    this.tabContainer = document.createElement('div')
    this.tabContainer.classList.add(
      styles.tabContainer,
      `${bottomBarPrefix}-tab-container`
    )

    this.sheetSelectionButtonContainer = document.createElement('div')
    this.sheetSelectionButtonContainer.classList.add(
      styles.sheetSelectionButtonContainer,
      `${bottomBarPrefix}-sheet-selection-button-container`
    )

    this.sheetSelectionDropdownContent = createSheetSelectionDropdownContent()

    this.sheetSelectionDropdown = tippy(this.sheetSelectionButton.button, {
      placement: 'top',
      interactive: true,
      arrow: false,
      trigger: 'manual',
      theme: 'dropdown',
      showOnCreate: false,
      hideOnClick: true,
      content: this.sheetSelectionDropdownContent
    })

    this.sheetSelectionButtonContainer.appendChild(
      this.sheetSelectionButton.button
    )
    this.content.appendChild(this.createNewSheetButtonElements.buttonContainer)
    this.content.appendChild(this.sheetSelectionButtonContainer)
    this.bottomBarEl.appendChild(this.content)
    this.bottomBarEl.appendChild(this.tabContainer)
  }

  /**
   * @internal
   */
  _render() {
    this.tabContainer.innerHTML = ''
    this.sheetSelectionDropdownContent.innerHTML = ''

    const sheetNames = this._spreadsheet.hyperformula.getSheetNames()

    sheetNames.forEach(name => {
      const sheetId = this._spreadsheet.hyperformula.getSheetId(name)!

      this._setSheetTabElements(sheetId)
    })
  }

  /**
   * Unregister's event listeners & removes all DOM elements.
   */
  destroy() {
    this.bottomBarEl.remove()
    this.createNewSheetButtonElements.button.removeEventListener(
      'click',
      this._createNewSheetButtonOnClick
    )
    this.sheetSelectionButton.button.removeEventListener(
      'click',
      this._sheetSelectionOnClick
    )
  }
}

export default BottomBar
