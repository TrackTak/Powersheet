import type { ConfigParams } from 'hyperformula';
import HyperFormulaModule from './HyperFormula';

const getHyperformulaConfig = (): Partial<ConfigParams> => {
  return {
    chooseAddressMappingPolicy: new HyperFormulaModule!.AlwaysSparse(),
    // We use our own undo/redo instead
    undoLimit: 0,
  };
};

export default getHyperformulaConfig;
