import sinon from 'sinon';
import { expect } from 'chai';
import isPaymentOverdue from '../../src/server/utils/isPaymentOverdue';

function setToday(date) {
  sinon.useFakeTimers(new Date(date));
}

describe('isPaymentOverdue', () => {
  afterEach(() => {
    sinon.restore();
  });
  context('payment is overdue', () => {
    it('penalty returns true if overdue', () => {
      const dateOfPenalty = '1656667800'; // unix second time stamp 1st July 2022
      setToday('2022-08-19 10:30'); // 19th August 2022
      const daysToPayLimit = 42;
      const isOverdue = isPaymentOverdue(dateOfPenalty, daysToPayLimit);
      expect(isOverdue).to.be.true;
    });
  });

  context('payment is not overdue', () => {
    it('returns false', () => {
      const dateOfPenalty = '1658050200'; // unix second time stamp 17th July 2022
      setToday('2022-08-17 10:30'); // 17th August 2022
      const daysToPayLimit = 42;
      const isOverdue = isPaymentOverdue(dateOfPenalty, daysToPayLimit);
      expect(isOverdue).to.be.false;
    });
  });

  context('payment is overdue same day', () => {
    it('returns false', () => {
      const dateOfPenalty = '1657186200'; // 7th July 2022
      setToday('2022-08-18 15:30'); // 18th August 2022
      const daysToPayLimit = 42;
      const isOverdue = isPaymentOverdue(dateOfPenalty, daysToPayLimit);
      expect(isOverdue).to.be.false;
    });
  });

  context('date is invalid', () => {
    it('returns true', () => {
      setToday('2022-08-18 10:30'); // 18th August 2022
      const daysToPayLimit = 42;
      const isOverdue = isPaymentOverdue('invalid-date', daysToPayLimit);
      expect(isOverdue).to.be.true;
    });
  });

  context('date is undefined', () => {
    it('returns true', () => {
      setToday('2022-08-18 10:30'); // 18th August 2022
      const daysToPayLimit = 42;
      const isOverdue = isPaymentOverdue(undefined, daysToPayLimit);
      expect(isOverdue).to.be.true;
    });
  });
});
