import { prefix } from '../utils';
import styles from './BottomBar.module.scss';

export type SelectSheetsIcon = 'hamburger';

export type AddSheetIcon = 'add';

export const bottomBarPrefix = `${prefix}-bottom-bar`;

export const createSheetTab = () => {
  const sheetTabContainer = document.createElement('div');
  const sheetTab = document.createElement('div');
  const nameContainer = document.createElement('span');

  sheetTabContainer.classList.add(
    styles.sheetTabContainer,
    `${bottomBarPrefix}-sheet-tab-container`
  );
  sheetTab.classList.add(styles.sheetTab, `${bottomBarPrefix}-sheet-tab`);
  nameContainer.classList.add(
    styles.nameContainer,
    `${bottomBarPrefix}-name-container`
  );

  sheetTab.appendChild(nameContainer);
  sheetTabContainer.appendChild(sheetTab);

  return { sheetTabContainer, sheetTab, nameContainer };
};

export const createSheetTabDropdownContent = () => {
  const sheetTabDropdownContent = document.createElement('div');

  sheetTabDropdownContent.classList.add(
    styles.sheetTabDropdownContent,
    `${bottomBarPrefix}-sheet-tab-dropdown-content`
  );

  const deleteSheetButton = document.createElement('button');

  deleteSheetButton.classList.add(
    styles.deleteSheetButton,
    `${bottomBarPrefix}-delete-sheet-button`
  );

  deleteSheetButton.textContent = 'Delete';

  const renameSheetButton = document.createElement('button');

  renameSheetButton.classList.add(
    styles.renameSheetButton,
    `${bottomBarPrefix}-rename-sheet-button`
  );
  renameSheetButton.textContent = 'Rename';

  sheetTabDropdownContent.appendChild(deleteSheetButton);
  sheetTabDropdownContent.appendChild(renameSheetButton);

  return { sheetTabDropdownContent, deleteSheetButton, renameSheetButton };
};

export const createSheetSelectionDropdownContent = () => {
  const sheetSelectionDropdownContent = document.createElement('div');

  sheetSelectionDropdownContent.classList.add(
    styles.sheetSelectionDropdownContent,
    `${bottomBarPrefix}-sheet-selection-dropdown-content`
  );

  return sheetSelectionDropdownContent;
};

export const createSheetSelectionDropdownButton = () => {
  const sheetSelectionDropdownButton = document.createElement('button');

  sheetSelectionDropdownButton.classList.add(
    styles.sheetSelectionDropdownButton,
    `${bottomBarPrefix}-sheet-selection-dropdown-button`
  );

  return sheetSelectionDropdownButton;
};
