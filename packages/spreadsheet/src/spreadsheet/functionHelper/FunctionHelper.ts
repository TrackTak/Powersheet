import { Spreadsheet } from '../..';
import styles from './FunctionHelper.module.scss';
import { MDCDrawer } from '@material/drawer';
import closeIcon from './close-icon.svg';
import {
  createCodeText,
  createHeader,
  createParagraph,
  createSubHeader,
  createSyntaxList,
  functionHelperPrefix,
} from './functionHelperHtmlElementHelpers';

const incomeStatementAttributes = [
  {
    attributeName: '"revenue"',
  },
  {
    attributeName: '"costOfRevenue"',
  },
  {
    attributeName: '"grossProfit"',
  },
  {
    attributeName: '"grossMargin"',
  },
  {
    attributeName: '"sellingGeneralAdministrative"',
  },
  {
    attributeName: '"sellingAndMarketingExpenses"',
  },
  {
    attributeName: '"researchDevelopment"',
  },
  {
    attributeName: '"effectOfAccountingCharges"',
  },
  {
    attributeName: '"operatingExpenses"',
  },
  {
    attributeName: '"operatingIncome"',
  },
  {
    attributeName: '"operatingMargin"',
  },
  {
    attributeName: '"interestIncome"',
  },
  {
    attributeName: '"interestExpense"',
  },
  {
    attributeName: '"netInterestIncome"',
  },
  {
    attributeName: '"otherIncomeExpense"',
  },
  {
    attributeName: '"incomeBeforeTax"',
  },
  {
    attributeName: '"incomeTaxExpense"',
  },
  {
    attributeName: '"effectiveTaxRate"',
  },
  {
    attributeName: '"discontinuedOperations"',
  },
  {
    attributeName: '"minorityInterest"',
  },
  {
    attributeName: '"netIncomeFromContinuingOps"',
  },
  {
    attributeName: '"netIncome"',
  },
  {
    attributeName: '"preferredStockAndOtherAdjustments"',
  },
  {
    attributeName: '"netIncomeApplicableToCommonShares"',
  },
  {
    attributeName: '"netMargin"',
  },
  {
    attributeName: '"ebit"',
  },
  {
    attributeName: '"depreciationAndAmortization"',
  },
  {
    attributeName: '"nonRecurring"',
  },
  {
    attributeName: '"reconciledDepreciation"',
  },
  {
    attributeName: '"otherItems"',
  },
  {
    attributeName: '"ebitda"',
  },
];

const balanceSheetAttributes = [
  {
    attributeName: '"cash"',
  },
  {
    attributeName: '"shortTermInvestments"',
  },
  {
    attributeName: '"cashAndShortTermInvestments"',
  },
  {
    attributeName: '"netReceivables"',
  },
  {
    attributeName: '"inventory"',
  },
  {
    attributeName: '"otherCurrentAssets"',
  },
  {
    attributeName: '"totalCurrentAssets"',
  },
  {
    attributeName: '"longTermInvestments"',
  },
  {
    attributeName: '"propertyPlantEquipment"',
  },
  {
    attributeName: '"intangibleAssets"',
  },
  {
    attributeName: '"goodWill"',
  },
  {
    attributeName: '"otherAssets"',
  },
  {
    attributeName: '"nonCurrentAssetsTotal"',
  },
  {
    attributeName: '"totalAssets"',
  },
  {
    attributeName: '"accountsPayable"',
  },
  {
    attributeName: '"shortLongTermDebt"',
  },
  {
    attributeName: '"otherCurrentLiab"',
  },
  {
    attributeName: '"totalCurrentLiabilities"',
  },
  {
    attributeName: '"longTermDebt"',
  },
  {
    attributeName: '"capitalLeaseObligations"',
  },
  {
    attributeName: '"longTermDebtAndCapitalLeases"',
  },
  {
    attributeName: '"deferredLongTermLiab"',
  },
  {
    attributeName: '"nonCurrentLiabilitiesOther"',
  },
  {
    attributeName: '"nonCurrentLiabilitiesTotal"',
  },
  {
    attributeName: '"totalLiab"',
  },
  {
    attributeName: '"commonStock"',
  },
  {
    attributeName: '"preferredStockTotalEquity"',
  },
  {
    attributeName: '"retainedEarnings"',
  },
  {
    attributeName: '"accumulatedOtherComprehensiveIncome"',
  },
  {
    attributeName: '"additionalPaidInCapital"',
  },
  {
    attributeName: '"treasuryStock"',
  },
  {
    attributeName: '"capitalSurpluse"',
  },
  {
    attributeName: '"otherStockholderEquity"',
  },
  {
    attributeName: '"totalStockholderEquity"',
  },
  {
    attributeName: '"minorityInterest"',
  },
  {
    attributeName: '"totalEquity"',
  },
];

const cashFlowStatementAttributes = [
  {
    attributeName: '"netIncome"',
  },
  {
    attributeName: '"depreciation"',
  },
  {
    attributeName: '"changeToAccountReceivables"',
  },
  {
    attributeName: '"changeReceivables"',
  },
  {
    attributeName: '"changeToInventory"',
  },
  {
    attributeName: '"changeToLiabilities"',
  },
  {
    attributeName: '"changeInWorkingCapital"',
  },
  {
    attributeName: '"totalCashFromOperatingActivities"',
  },
  {
    attributeName: '"investments"',
  },
  {
    attributeName: '"otherCashflowsFromInvestingActivities"',
  },
  {
    attributeName: '"totalCashflowsFromInvestingActivities"',
  },
  {
    attributeName: '"salePurchaseOfStock"',
  },
  {
    attributeName: '"netBorrowings"',
  },
  {
    attributeName: '"dividendsPaid"',
  },
  {
    attributeName: '"otherCashflowsFromFinancingActivities"',
  },
  {
    attributeName: '"totalCashFromFinancingActivities"',
  },
  {
    attributeName: '"beginPeriodCashFlow"',
  },
  {
    attributeName: '"endPeriodCashFlow"',
  },
  {
    attributeName: '"changeInCash"',
  },
  {
    attributeName: '"capitalExpenditures"',
  },
  {
    attributeName: '"freeCashFlow"',
  },
];

const otherAttributes = [
  {
    attributeName: '"bookValueOfEquity"',
  },
  {
    attributeName: '"bookValueOfDebt"',
  },
  {
    attributeName: '"investedCapital"',
  },
  {
    attributeName: '"salesToCapitalRatio"',
  },
  {
    attributeName: '"marginalTaxRate"',
  },
  {
    attributeName: '"standardDeviationInStockPrices"',
  },
  {
    attributeName: '"marketCapitalization"',
  },
  {
    attributeName: '"pastThreeYearsAverageEffectiveTaxRate"',
  },
  {
    attributeName: '"costOfCapital"',
  },
  {
    attributeName: '"afterTaxROIC"',
  },
  {
    attributeName: '"preTaxOperatingMarginUnadjusted"',
  },
  {
    attributeName: '"annualAverageCAGRLastFiveYears"',
  },
];

const riskPremiumsAndBetasAttributes = [
  {
    attributeName: '"unleveredBeta"',
  },
  {
    attributeName: '"equityLeveredBeta"',
  },
  {
    attributeName: '"riskFreeRate"',
  },
  {
    attributeName: '"equityRiskPremium"',
  },
  {
    attributeName: '"adjDefaultSpread"',
  },
  {
    attributeName: '"matureMarketEquityRiskPremium"',
  },
];

const generalAttributes = [
  {
    attributeName: '"description"',
  },
  {
    attributeName: '"currencyCode"',
  },
  {
    attributeName: '"code"',
  },
  {
    attributeName: '"exchange"',
  },
  {
    attributeName: '"name"',
  },
  {
    attributeName: '"price"',
  },
  {
    attributeName: '"sharesOutstanding"',
  },
  {
    attributeName: '"industryName"',
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
    syntaxName: '[mm/dd/yyy]',
    description: 'The start date and end date format.',
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

    const { subHeader: incomeStatementSubHeader } =
      createSubHeader('Income Statement');
    const { subHeader: balanceSheetSubHeader } =
      createSubHeader('Balance Sheet');
    const { subHeader: cashFlowStatementSubHeader } =
      createSubHeader('Cashflow Statement');
    const { subHeader: riskPremiumsAndBetasSubHeader } = createSubHeader(
      'Risk Premiums and Betas'
    );
    const { subHeader: generalSubHeader } = createSubHeader('General');
    const { subHeader: otherSubHeader } = createSubHeader('Other');

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
    this.textWrapper.appendChild(incomeStatementSubHeader);

    incomeStatementAttributes.forEach(({ attributeName }) => {
      const { listEl } = createSyntaxList(attributeName);
      this.textWrapper.appendChild(listEl);
    });

    this.textWrapper.appendChild(balanceSheetSubHeader);

    balanceSheetAttributes.forEach(({ attributeName }) => {
      const { listEl } = createSyntaxList(attributeName);
      this.textWrapper.appendChild(listEl);
    });

    this.textWrapper.appendChild(cashFlowStatementSubHeader);

    cashFlowStatementAttributes.forEach(({ attributeName }) => {
      const { listEl } = createSyntaxList(attributeName);
      this.textWrapper.appendChild(listEl);
    });

    this.textWrapper.appendChild(riskPremiumsAndBetasSubHeader);

    riskPremiumsAndBetasAttributes.forEach(({ attributeName }) => {
      const { listEl } = createSyntaxList(attributeName);
      this.textWrapper.appendChild(listEl);
    });

    this.textWrapper.appendChild(generalSubHeader);

    generalAttributes.forEach(({ attributeName }) => {
      const { listEl } = createSyntaxList(attributeName);
      this.textWrapper.appendChild(listEl);
    });

    this.textWrapper.appendChild(otherSubHeader);

    otherAttributes.forEach(({ attributeName }) => {
      const { listEl } = createSyntaxList(attributeName);
      this.textWrapper.appendChild(listEl);
    });

    this.topAppBarEl = document.createElement('div');
    this.drawer = MDCDrawer.attachTo(this.drawerEl);
  }
}

export default FunctionHelper;
