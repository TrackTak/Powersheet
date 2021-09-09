import { bottomBarPrefix } from './BottomBar';
import styles from './BottomBar.module.scss';

export type SelectSheetsIcon = 'ellipsis';

export type AddSheetIcon = 'add';

export const createSheetTab = () => {
  const sheetTab = document.createElement('div');
  sheetTab.classList.add(styles.sheetTab, `${bottomBarPrefix}-sheet-tab`);

  return sheetTab;
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

//TO DO
// export const createScrollSlider = () => {
//   const scrollSlider = document.createElement('div');
//   scrollSlider.classList.add(
//     styles.scrollsliderArrow,
//     `${bottomBarPrefix}-scrollslider-arrow`
//   );

//   const scrollSliderContent = document.createElement('div');
//   scrollSliderContent.classList.add(
//     styles.scrollsliderContent,
//     `${bottomBarPrefix}-scrollslider-content`
//   );

//   const leftScrollSliderButton = document.createElement('button');
//   leftScrollSliderButton.classList.add(
//     styles.leftScrollslider,
//     `${bottomBarPrefix}-left-scrollslider`
//   );

//   const rightScrollSliderButton = document.createElement('button');
//   rightScrollSliderButton.classList.add(
//     styles.rightScrollslider,
//     `${bottomBarPrefix}-right-scrollslider`
//   );

//   const leftScrollImage = document.createElement('img');

//   leftScrollImage.src = leftIcon;
//   leftScrollImage.alt = 'left';
//   leftScrollImage.classList.add(
//     styles.scrollIcon,
//     `${bottomBarPrefix}-scroll-icon`
//   );
//   leftScrollSliderButton.appendChild(leftScrollImage);

//   const rightScrollImage = document.createElement('img');

//   rightScrollImage.src = rightIcon;
//   rightScrollImage.alt = 'right';
//   rightScrollImage.classList.add(
//     styles.scrollIcon,
//     `${bottomBarPrefix}-scroll-icon`
//   );
//   rightScrollSliderButton.appendChild(rightScrollImage);

//   let translate = 0;

//   leftScrollSliderButton.addEventListener('click', () => {
//     if (translate >= 0) {
//       translate += 100;
//       this.scrollsliderContainerTab.style.transform =
//         'translateX(' + translate + 'px' + ')';
//     }
//   });

//   rightScrollSliderButton.addEventListener('click', () => {
//     const scrollSliderSheetTabs = this.sheetTabs[this.sheetTabs.length - 1];

//     const totalScrollWidth = this.sheetTabs.reduce((prev, curr) => {
//       return (prev += curr.getBoundingClientRect().width);
//     }, 0);

//     const remainingScrollWidth = totalScrollWidth - this.tabContainerMaxWidth;

//     if (translate >= 0) {
//       translate -= 100;
//       this.scrollsliderContainerTab.style.transform =
//         'translateX(' + translate + 'px' + ')';
//     }
//   });

//   scrollSlider.appendChild(scrollSliderContent);
//   scrollSliderContent.appendChild(leftScrollSliderButton);
//   scrollSliderContent.appendChild(rightScrollSliderButton);

//   return scrollSlider;
// };
