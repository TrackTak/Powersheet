import type { ConfigParams } from 'hyperformula';
import HyperFormulaModule from './HyperFormula';

const getHyperformulaConfig = (): Partial<ConfigParams> => {
  return {
    chooseAddressMappingPolicy: new HyperFormulaModule!.AlwaysSparse(),
  };
};

export default getHyperformulaConfig;
