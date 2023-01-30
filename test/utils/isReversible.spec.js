import sinon from 'sinon';
import { expect } from 'chai';
import { isReversible } from '../../src/server/utils/isReversible';

function setToday(date) {
  sinon.useFakeTimers(new Date(date));
}

describe('isReversible', () => {
  afterEach(() => {
    sinon.restore();
  });
  context('fine is reversible', () => {
    it('returns true', () => {
      const paymentStatus = 'PAID';
      const paymentDate = 1674558000; // 1100 24th January 2023
      setToday('2023-01-25');
      const paymentType = 'CNP';
      const reversible = isReversible(paymentStatus, paymentDate, paymentType);
      expect(reversible).to.be.true;
    });
  });

  context('fine is not reversible as it was paid today', () => {
    it('returns false', () => {
      const paymentStatus = 'PAID';
      const paymentDate = 1674558000; // 1100 24th January 2023
      setToday('2023-01-24');
      const paymentType = 'CNP';
      const reversible = isReversible(paymentStatus, paymentDate, paymentType);
      expect(reversible).to.be.false;
    });
  });

  context('fine is not reversible as it is unpaid', () => {
    it('returns false', () => {
      const paymentStatus = 'UNPAID';
      let paymentDate;
      const paymentType = 'CNP';
      const reversible = isReversible(paymentStatus, paymentDate, paymentType);
      expect(reversible).to.be.false;
    });
  });

  context('fine is not reversible as data is invalid', () => {
    it('returns false', () => {
      const paymentStatus = 1562;
      const paymentDate = 'definitely a date';
      const paymentType = 'CNP';
      const reversible = isReversible(paymentStatus, paymentDate, paymentType);
      expect(reversible).to.be.false;
    });
  });

  context('fine is not reversible as date is in future', () => {
    it('returns false', () => {
      const paymentStatus = 'PAID';
      const paymentDate = 4833172820; // 1200 27th February 2123
      const paymentType = 'CNP';
      const reversible = isReversible(paymentStatus, paymentDate, paymentType);
      expect(reversible).to.be.false;
    });
  });

  context('fine is not reversible as payment type is cheque', () => {
    it('returns false', () => {
      const paymentStatus = 'PAID';
      const paymentDate = 4833172820; // 1200 27th February 2123
      const paymentType = 'CHEQUE';
      const reversible = isReversible(paymentStatus, paymentDate, paymentType);
      expect(reversible).to.be.false;
    });
  });

  context('fine is reversible as payment type is cash', () => {
    it('returns true', () => {
      const paymentStatus = 'PAID';
      const paymentDate = 4833172820; // 1200 27th February 2123
      const paymentType = 'CASH';
      const reversible = isReversible(paymentStatus, paymentDate, paymentType);
      expect(reversible).to.be.true;
    });
  });

  context('fine is reversible as payment type is postal order', () => {
    it('returns true', () => {
      const paymentStatus = 'PAID';
      const paymentDate = 4833172820; // 1200 27th February 2123
      const paymentType = 'POSTAL';
      const reversible = isReversible(paymentStatus, paymentDate, paymentType);
      expect(reversible).to.be.true;
    });
  });
});
