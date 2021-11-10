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
import { SheetId } from '../sheets/Sheets'
import Spreadsheet from '../Spreadsheet'

interface ISheetTabElements {
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
  sheetTabElementsMap!: Map<SheetId, ISheetTabElements>
  private spreadsheet!: Spreadsheet

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet

    this.sheetTabElementsMap = new Map()

    this.createNewSheetButtonElements = createIconButton('add', bottomBarPrefix)
    this.createNewSheetButtonElements.buttonContainer.classList.add(
      styles.createNewSheetButtonContainer
    )
    this.createNewSheetButtonElements.button.addEventListener(
      'click',
      this.createNewSheetButtonOnClick
    )

    this.sheetSelectionButton = createIconButton('hamburger', bottomBarPrefix)
    this.sheetSelectionButton.button.addEventListener(
      'click',
      this.sheetSelectionOnClick
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

  setSheetTabElements(sheetId: SheetId) {
    const { sheetTabContainer, sheetTab, nameContainer } = createSheetTab()
    const sheetSelectionDropdownButton = createSheetSelectionDropdownButton()
    const isActive = sheetId === this.spreadsheet.sheets.activeSheetId

    if (isActive) {
      sheetTab.classList.add('active')
    } else {
      sheetTab.classList.remove('active')
    }

    sheetSelectionDropdownButton.textContent =
      this.spreadsheet.data.spreadsheetData.sheets![sheetId].sheetName!

    const switchSheet = () => {
      this.spreadsheet.sheets.switchSheet(sheetId)
    }

    const setTabToContentEditable = () => {
      nameContainer.contentEditable = 'true'
      nameContainer.focus()
    }

    const { sheetTabDropdownContent, deleteSheetButton, renameSheetButton } =
      createSheetTabDropdownContent()

    deleteSheetButton.disabled = this.spreadsheet.sheets.sheetIds.length === 1

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

      this.spreadsheet.sheets.deleteSheet(sheetId)
    })

    renameSheetButton.addEventListener('click', () => {
      sheetTabDropdown.hide()

      setTabToContentEditable()
    })

    nameContainer.addEventListener('blur', () => {
      nameContainer.contentEditable = 'false'
      nameContainer.blur()

      this.spreadsheet.sheets.renameSheet(sheetId, nameContainer.textContent!)
    })

    nameContainer.textContent =
      this.spreadsheet.data.spreadsheetData.sheets![sheetId].sheetName!

    this.tabContainer.appendChild(sheetTabContainer)
    this.sheetSelectionDropdownContent.appendChild(sheetSelectionDropdownButton)

    this.sheetTabElementsMap.set(sheetId, {
      sheetTabContainer,
      sheetTab,
      nameContainer,
      sheetSelectionDropdownButton,
      isActive
    })
  }

  updateSheetTabs() {
    this.tabContainer.innerHTML = ''
    this.sheetSelectionDropdownContent.innerHTML = ''

    this.spreadsheet.sheets.sheetIds.forEach(sheetId => {
      this.setSheetTabElements(sheetId)
    })
  }

  sheetSelectionOnClick = () => {
    this.sheetSelectionDropdown.show()
  }

  createNewSheetButtonOnClick = () => {
    const sheetName = this.spreadsheet.sheets.getSheetName()
    const id = this.spreadsheet.sheets.sheetIds.length

    this.spreadsheet.sheets.createNewSheet({
      id,
      sheetName
    })

    this.spreadsheet.sheets.switchSheet(id)

    this.spreadsheet.sheets.updateSize()
  }

  destroy() {
    this.bottomBarEl.remove()
    this.createNewSheetButtonElements.button.removeEventListener(
      'click',
      this.createNewSheetButtonOnClick
    )
    this.sheetSelectionButton.button.removeEventListener(
      'click',
      this.sheetSelectionOnClick
    )
  }
}

export default BottomBar
