import sinon from 'sinon';

import formatUserRole from '../../src/server/utils/formatUserRole';

describe('formatUserRole', () => {
  context('when supplied with a single role', () => {
    it('should just return that immediately', () => {
      const actual = formatUserRole('BankingFinance');
      const expected = 'BankingFinance';
      sinon.assert.match(actual, expected);
    });
  });
  context('when supplied with a multiple of roles', () => {
    it('should return the formatted roles in an array', () => {
      const actual = formatUserRole('[ContactCentre, FrontLine, BankingFinance]');
      const expected = ['ContactCentre', 'FrontLine', 'BankingFinance'];
      sinon.assert.match(actual, expected);
    });
  });
});
