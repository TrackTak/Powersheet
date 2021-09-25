import { AlwaysSparse, ConfigParams } from 'hyperformula';

const getHyperformulaConfig = (): Partial<ConfigParams> => {
  return {
    chooseAddressMappingPolicy: new AlwaysSparse(),
  };
};

export default getHyperformulaConfig;
