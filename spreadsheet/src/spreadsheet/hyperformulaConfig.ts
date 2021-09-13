import { currencySymbolMap } from 'currency-symbol-map';
import { AlwaysSparse } from 'hyperformula';

export const hyperformulaLicenseKey = 'gpl-v3';

const hyperformulaConfig = {
  licenseKey: hyperformulaLicenseKey,
  binarySearchThreshold: 1,
  chooseAddressMappingPolicy: new AlwaysSparse(),
  currencySymbol: Object.values(currencySymbolMap),
};

export default hyperformulaConfig;
