import { bottomBarPrefix } from './BottomBar';
import styles from './BottomBar.module.scss';
import sheetIcon from '../../icons/sheet-icon.svg';
import plusIcon from '../../icons/plus-icon.svg';

export const createSheetTab = () => {
  const sheetTab = document.createElement('div');
  sheetTab.classList.add(styles.sheetTab, `${bottomBarPrefix}-sheet-tab`);

  return sheetTab;
};

export const createContextSheetTabMenu = () => {
  const contextSheetTabMenu = document.createElement('div');
  contextSheetTabMenu.classList.add(
    styles.contextSheetMenu,
    `${bottomBarPrefix}-context-sheet-menu`
  );

  return contextSheetTabMenu;
};

export const createAddSheetTab = () => {
  const buttonPlus = document.createElement('button');

  buttonPlus.classList.add(
    styles.buttonIcon,
    `${bottomBarPrefix}-plus-button-icon`
  );

  const plusImage = document.createElement('img');

  plusImage.src = plusIcon;
  plusImage.alt = 'plus';
  plusImage.classList.add(
    styles.plusImgIcon,
    `${bottomBarPrefix}-plus-img-icon`
  );
  buttonPlus.appendChild(plusImage);

  return buttonPlus;
};

export const createMenuSheetHeader = () => {
  const menuSheetHeader = document.createElement('button');
  menuSheetHeader.classList.add(
    styles.buttonIcon,
    `${bottomBarPrefix}-menu-button-icon`
  );

  menuSheetHeader.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  const menuSheetImage = document.createElement('img');

  menuSheetImage.src = sheetIcon;
  menuSheetImage.alt = 'sheet';
  menuSheetImage.classList.add(
    styles.sheetImgIcon,
    `${bottomBarPrefix}-sheet-img-icon`
  );

  menuSheetHeader.appendChild(menuSheetImage);

  return menuSheetHeader;
};

export const createMenuSheetDropdownContent = () => {
  const menuSheetDropdownContent = document.createElement('div');

  menuSheetDropdownContent.classList.add(
    styles.menusheetDropdownContent,
    `${bottomBarPrefix}-menusheet-dropdown-content`
  );

  return menuSheetDropdownContent;
};

export const createAllSheetsMenu = () => {
  const allSheetsMenu = document.createElement('button');

  allSheetsMenu.classList.add(
    styles.allSheetMenu,
    `${bottomBarPrefix}-all-sheet-menu`
  );

  return allSheetsMenu;
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
