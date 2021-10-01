let HyperFormulaModule: typeof import('hyperformula') | undefined;

try {
  HyperFormulaModule = require('hyperformula');
} catch (error) {
  console.info(
    'hyperformula is not installed. This is fine if formula calculations are not needed. However if you need formulas to be calculated in cells then please install hyperformula.'
  );
}

export default HyperFormulaModule;
