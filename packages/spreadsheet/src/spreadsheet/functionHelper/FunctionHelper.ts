import { Spreadsheet } from '../..';
import styles from './FunctionHelper.module.scss';
import { MDCDrawer } from '@material/drawer';
import closeIcon from './close-icon.svg';
import {
  createCodeText,
  createHeader,
  createParagraph,
  createSubHeader,
  createSyntaxListItem,
  functionHelperPrefix,
} from './functionHelperHtmlElementHelpers';

interface ICodeSyntaxElement {
  syntaxName: string;
  description: string;
}

interface ICodeSyntaxCode {
  codeSyntax: string;
  values: ICodeSyntaxElement[];
}
interface IAttribute {
  header: string;
  attributeNames: string[];
}

export interface IFunctionHelperData {
  header: string;
  headerDescription: string;
  codeSyntaxUsage: string[];
  codeSyntaxElements: ICodeSyntaxCode[];
  attributes: IAttribute[];
}

class FunctionHelper {
  functionHelperEl!: HTMLDivElement;
  drawerContentEl!: HTMLDivElement;
  topAppBarEl!: HTMLDivElement;
  drawer!: MDCDrawer;
  closeIcon!: HTMLImageElement;
  closeButton!: HTMLButtonElement;
  headerEl!: HTMLHeadElement;
  textWrapper!: HTMLDivElement;
  spreadsheet!: Spreadsheet;

  constructor(public data: IFunctionHelperData) {
    this.data = data;
  }

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;

    this.functionHelperEl = document.createElement('div');
    this.functionHelperEl.classList.add(
      styles.functionHelper,
      `${functionHelperPrefix}`,
      'mdc-drawer',
      'mdc-drawer--dismissible'
    );

    this.drawerContentEl = document.createElement('div');
    this.drawerContentEl.classList.add(
      styles.drawerContent,
      `${functionHelperPrefix}`,
      'mdc-drawer__content'
    );

    this.drawerContentEl.dir = 'ltr';

    this.functionHelperEl.appendChild(this.drawerContentEl);

    this.functionHelperEl.dir = 'rtl';

    this.closeIcon = document.createElement('img');
    this.closeIcon.classList.add(styles.closeIcon, `${functionHelperPrefix}`);
    this.closeIcon.src = closeIcon;

    this.closeButton = document.createElement('button');
    this.closeButton.classList.add(
      styles.closeButton,
      `${functionHelperPrefix}`
    );

    this.closeButton.addEventListener('click', () => {
      const isOpen = this.drawer.open;
      this.drawer.open = !isOpen;
    });

    this.drawerContentEl.appendChild(this.closeButton);
    this.closeButton.append(this.closeIcon);

    this.textWrapper = document.createElement('div');
    this.textWrapper.classList.add(
      styles.textWrapper,
      `${functionHelperPrefix}`
    );

    this.headerEl = document.createElement('h1');
    this.headerEl.classList.add(styles.headerEl, `${functionHelperPrefix}`);
    this.headerEl.textContent = this.data.header;

    const { paragraphEl: description } = createParagraph(
      this.data.headerDescription
    );

    const { header: headerUsage } = createHeader('Sample Usage');
    const { header: headerSyntax } = createHeader('Syntax');
    const { header: headerAttributes } = createHeader('Attributes');

    this.drawerContentEl.appendChild(this.textWrapper);
    this.textWrapper.appendChild(this.headerEl);
    this.textWrapper.appendChild(description);
    this.textWrapper.appendChild(headerUsage);

    this.data.codeSyntaxUsage.forEach((usageName) => {
      const { codeEl } = createCodeText(usageName);
      this.textWrapper.appendChild(codeEl);
    });

    this.textWrapper.appendChild(headerSyntax);

    this.data.codeSyntaxElements.forEach(({ codeSyntax, values }) => {
      const codeSyntaxList = document.createElement('ul');
      const { codeEl } = createCodeText(codeSyntax);

      this.textWrapper.appendChild(codeEl);
      this.textWrapper.appendChild(codeSyntaxList);

      values.forEach(({ syntaxName, description }) => {
        const { listItem } = createSyntaxListItem(syntaxName, description);
        codeSyntaxList.appendChild(listItem);
      });
    });

    this.textWrapper.appendChild(headerAttributes);

    this.data.attributes.forEach(({ attributeNames, header }) => {
      const attributeList = document.createElement('ul');

      this.textWrapper.appendChild(createSubHeader(header).subHeader);
      this.textWrapper.appendChild(attributeList);

      attributeNames.forEach((attributeName) => {
        const { listItem } = createSyntaxListItem(attributeName);

        attributeList.appendChild(listItem);
      });
    });

    this.topAppBarEl = document.createElement('div');

    window.addEventListener('DOMContentLoaded', this.onDOMContentLoaded, {
      once: true,
    });
  }

  private onDOMContentLoaded = () => {
    this.drawer = MDCDrawer.attachTo(this.functionHelperEl);
  };

  destroy() {
    window.removeEventListener('DOMContentLoaded', this.onDOMContentLoaded);
  }
}

export default FunctionHelper;
