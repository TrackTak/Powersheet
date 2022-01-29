import { prefix } from '../../utils'
import './Autocomplete.scss'

export const autocompleteHelperPrefix = `${prefix}-autocomplete`

export type LabelValue = {
  label: string
  value: string
}

export const createAutocompleteList = (labelValues: LabelValue[]) => {
  const list = document.createElement('ul')
  list.classList.add(`${autocompleteHelperPrefix}-list`)

  labelValues.forEach(({ label, value }) => {
    const listItem = document.createElement('li')

    listItem.textContent = label
    listItem.dataset.value = value

    list.appendChild(listItem)
  })

  return list
}

export const createWrapperContent = () => {
  const dropdownEl = document.createElement('div')
  const listContainerEl = document.createElement('div')
  const tippyContainer = document.createElement('div')

  dropdownEl.appendChild(listContainerEl)
  dropdownEl.appendChild(tippyContainer)

  dropdownEl.classList.add(autocompleteHelperPrefix)
  listContainerEl.classList.add(`${autocompleteHelperPrefix}-list-container`)
  tippyContainer.classList.add(`${autocompleteHelperPrefix}-tippy-container`)

  return {
    dropdownEl,
    listContainerEl,
    tippyContainer
  }
}
