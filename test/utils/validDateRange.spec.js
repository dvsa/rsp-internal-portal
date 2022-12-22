import { expect } from 'chai';
import sinon from 'sinon';
import validDateRange from '../../src/server/utils/validDateRange';
import { errorTypes } from '../../src/server/validation/reports';

describe('validDateRange', () => {
  context('start date is after end date', () => {
    it('fails the validation', () => {
      const validation = validDateRange('2018-01-02', '2018-01-01');
      expect(validation.isValid).to.be.false;
      expect(validation.type).to.equal(errorTypes.startAfterEnd);
    });
  });

  context('start date is after today', () => {
    it('fails the validation', () => {
      const validation = validDateRange('5000-01-02', '5000-01-03');
      expect(validation.isValid).to.be.false;
      expect(validation.type).to.equal(errorTypes.dateInFuture);
    });
  });

  context('date range is valid', () => {
    it('passes the validation', () => {
      const validation = validDateRange('2018-01-01', '2018-01-02');
      expect(validation.isValid).to.be.true;
    });
  });

  context('start date is over 28 days', () => {
    it('fails the validation', () => {
      const validation = validDateRange('2022-01-01', '2022-01-30');
      expect(validation.isValid).to.be.false;
      expect(validation.type).to.equal(errorTypes.over28Days);
    });
  });

  context('start date is nonsense', () => {
    it('fails the validation', () => {
      const validation = validDateRange('not a date', '2022-01-03');
      expect(validation.isValid).to.be.false;
      expect(validation.type).to.equal(errorTypes.invalidDateEntry);
    });
  });
});
