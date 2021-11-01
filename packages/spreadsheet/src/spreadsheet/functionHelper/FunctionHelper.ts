import { Spreadsheet } from '../..';
import styles from './FunctionHelper.module.scss';
import { MDCDrawer } from '@material/drawer';
import closeIcon from './close-icon.svg';
import {
  createCodeText,
  createHeader,
  createParagraph,
  createSyntaxList,
  functionHelperPrefix,
} from './functionHelperHtmlElementHelpers';

const listOfAttributes = [
  {
    attributeName: 'revenue',
  },
  {
    attributeName: 'operatingIncome',
  },
  {
    attributeName: 'operatingMargin',
  },
  {
    attributeName: 'bookValueOfEquity',
  },
  {
    attributeName: 'bookValueOfDebt',
  },
  {
    attributeName: 'investedCapital',
  },
  {
    attributeName: 'salesToCapitalRatio',
  },
  {
    attributeName: 'salesToCapitalRatio',
  },
  {
    attributeName: 'sharesOutstanding',
  },
  {
    attributeName: 'price',
  },
  {
    attributeName: 'unleveredBeta',
  },
  {
    attributeName: 'riskFreeRate',
  },
  {
    attributeName: 'equityRiskPremium',
  },
  {
    attributeName: 'marginalTaxRate',
  },
  {
    attributeName: 'standardDeviationInStockPrices',
  },
  {
    attributeName: 'adjDefaultSpread',
  },
  {
    attributeName: 'minorityInterest',
  },
  {
    attributeName: 'cashAndShortTermInvestments',
  },
  {
    attributeName: 'interestExpense',
  },
  {
    attributeName: 'capitalLeaseObligations',
  },
  {
    attributeName: 'marketCapitalization',
  },
  {
    attributeName: 'sales/Capital',
  },
  {
    attributeName: 'matureMarketEquityRiskPremium',
  },
  {
    attributeName: 'pastThreeYearsAverageEffectiveTaxRate',
  },
  {
    attributeName: 'equityLeveredBeta',
  },
  {
    attributeName: 'costOfCapital',
  },
  {
    attributeName: 'afterTaxROIC',
  },
  {
    attributeName: 'preTaxOperatingMarginUnadjusted',
  },
  {
    attributeName: 'annualAverageCAGRLastFiveYears',
  },
  {
    attributeName: 'description',
  },
  {
    attributeName: 'currencyCode',
  },
  {
    attributeName: 'code',
  },
  {
    attributeName: 'exchange',
  },
  {
    attributeName: 'name',
  },
  {
    attributeName: 'industryName',
  },
];

const codeSyntaxElements = [
  {
    syntaxName: '[]',
    description:
      'indicates optional. If a parameter is optional it can be skipped with a comma. Example: =FIN("revenue",,"01/01/2021")',
  },
  {
    syntaxName: 'attribute',
    description:
      '1st argument is required. Fetches current or historical securities information from Tracktak.',
  },
  {
    syntaxName: '[startDate]',
    description:
      '2nd argument is optional. The start date when fetching historical data.',
  },
  {
    syntaxName: '[endDate]',
    description:
      '3rd argument is optional. The end date when fetching historical data.',
  },
];

const codeUsageElements = [
  { usageName: '=FIN("revenue")' },
  { usageName: '=FIN("revenue",,"01/01/2000")' },
  { usageName: '=FIN("B2, B3")' },
];

class FunctionHelper {
  functionHelperEl!: HTMLDivElement;
  drawerEl!: HTMLDivElement;
  drawerContentEl!: HTMLDivElement;
  topAppBarEl!: HTMLDivElement;
  drawer!: MDCDrawer;
  closeIcon!: HTMLImageElement;
  closeButton!: HTMLButtonElement;
  headerEl!: HTMLHeadElement;
  textWrapper!: HTMLDivElement;
  spreadsheet!: Spreadsheet;

  initialize(spreadsheet: Spreadsheet) {
    this.spreadsheet = spreadsheet;

    this.functionHelperEl = document.createElement('div');
    this.functionHelperEl.classList.add(
      styles.functionHelper,
      `${functionHelperPrefix}`
    );

    this.drawerEl = document.createElement('div');
    this.drawerEl.classList.add(
      styles.drawerEl,
      'mdc-drawer',
      'mdc-drawer--dismissible'
    );

    this.functionHelperEl.appendChild(this.drawerEl);

    this.drawerContentEl = document.createElement('div');
    this.drawerContentEl.classList.add(
      styles.drawerContent,
      `${functionHelperPrefix}`,
      'mdc-drawer__content'
    );

    this.drawerContentEl.dir = 'ltr';

    this.drawerEl.appendChild(this.drawerContentEl);

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
      this.drawer.open = !this.drawer.open;
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
    this.headerEl.textContent = 'FINANCIAL - FIN';

    const { paragraphEl: description } = createParagraph(
      'Fetches current or historical securities information from Tracktak Finance.'
    );

    const { header: headerUsage } = createHeader('Sample Usage');
    const { header: headerSyntax } = createHeader('Syntax');
    const { header: headerAttributes } = createHeader('Attributes');

    const { codeEl: codeSyntax } = createCodeText(
      '=FIN(attribute, [startDate], [endDate])'
    );

    this.drawerContentEl.appendChild(this.textWrapper);
    this.textWrapper.appendChild(this.headerEl);
    this.textWrapper.appendChild(description);
    this.textWrapper.appendChild(headerUsage);

    codeUsageElements.forEach(({ usageName }) => {
      const { codeEl } = createCodeText(usageName);
      this.textWrapper.appendChild(codeEl);
    });

    this.textWrapper.appendChild(headerSyntax);
    this.textWrapper.appendChild(codeSyntax);

    codeSyntaxElements.forEach(({ syntaxName, description }) => {
      const { listEl } = createSyntaxList(syntaxName, description);
      this.textWrapper.appendChild(listEl);
    });

    this.textWrapper.appendChild(headerAttributes);

    listOfAttributes.forEach(({ attributeName }) => {
      const { listEl } = createSyntaxList(attributeName);
      this.textWrapper.appendChild(listEl);
    });

    this.topAppBarEl = document.createElement('div');
    this.drawer = MDCDrawer.attachTo(this.drawerEl);
  }
}

export default FunctionHelper;
