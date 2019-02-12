import { expect } from 'chai';
import validDateRange from '../../src/server/utils/validDateRange';

describe('validDateRange', () => {
  context('start date is after end date', () => {
    it('fails the validation', () => {
      const isValid = validDateRange('2018-01-02', '2018-01-01');
      expect(isValid).to.be.false;
    });
  });

  context('start date is after today', () => {
    it('fails the validation', () => {
      const isValid = validDateRange('5000-01-02', '5000-01-03');
      expect(isValid).to.be.false;
    });
  });

  context('date range is valid', () => {
    it('passes the validation', () => {
      const isValid = validDateRange('2018-01-01', '2018-01-02');
      expect(isValid).to.be.true;
    });
  });
});
