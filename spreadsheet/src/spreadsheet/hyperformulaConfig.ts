import { currencySymbolMap } from "currency-symbol-map";
import { AlwaysSparse } from 'hyperformula';

export const hyperformulaLicenseKey = "05054-b528f-a10c4-53f2a-04b57";

const hyperformulaConfig = {
  licenseKey: hyperformulaLicenseKey,
  // For vlookup to match Excel
  binarySearchThreshold: 1,
  chooseAddressMappingPolicy: new AlwaysSparse(),
  // We use our own undo/redo instead
  currencySymbol: Object.values(currencySymbolMap),
};

export default hyperformulaConfig;
