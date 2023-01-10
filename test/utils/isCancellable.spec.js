import sinon from 'sinon';
import { expect } from 'chai';
import { isCancellable } from '../../src/server/utils/isCancellable';

function setToday(date) {
  sinon.useFakeTimers(new Date(date));
}

describe('isCancellable', () => {
  afterEach(() => {
    sinon.restore();
  });
  context('fine is cancellable', () => {
    it('returns true', () => {
      const paymentStatus = 'UNPAID';
      const activePenalty = true;
      const paymentStartTime = 1673254800; // 0900 9th January 2023
      const cancellable = isCancellable(paymentStatus, activePenalty, paymentStartTime);
      expect(cancellable).to.be.true;
    });
  });

  context('fine is not cancellable as already paid', () => {
    it('returns false', () => {
      const paymentStatus = 'PAID';
      const activePenalty = true;
      const paymentStartTime = 1673254800; // 0900 9th January 2023
      const cancellable = isCancellable(paymentStatus, activePenalty, paymentStartTime);
      expect(cancellable).to.be.false;
    });
  });

  context('fine is not cancellable as it is inactive', () => {
    it('returns false', () => {
      const paymentStatus = 'UNPAID';
      const activePenalty = false;
      const paymentStartTime = 1673254800; // 0900 9th January 2023
      const cancellable = isCancellable(paymentStatus, activePenalty, paymentStartTime);
      expect(cancellable).to.be.false;
    });
  });

  context('fine is not cancellable as payment is in progress', () => {
    it('returns false', () => {
      const paymentStatus = 'UNPAID';
      const activePenalty = true;
      setToday('2023-01-09 09:05'); // 0905 9th Januay 2023
      const paymentStartTime = 1673254800; // 0900 9th January 2023
      const cancellable = isCancellable(paymentStatus, activePenalty, paymentStartTime);
      expect(cancellable).to.be.false;
    });
  });

  context('fine is not cancellable as data is invalid', () => {
    it('returns false', () => {
      const paymentStatus = 'TWENTY-NINE';
      const activePenalty = undefined;
      const paymentStartTime = 'thirty'; // 0900 9th January 2023
      const cancellable = isCancellable(paymentStatus, activePenalty, paymentStartTime);
      expect(cancellable).to.be.false;
    });
  });

  context('fine is cancellable as there has never been a payment attempt', () => {
    it.only('returns true', () => {
      const paymentStatus = 'UNPAID';
      const activePenalty = true;
      let paymentStartTime;
      const cancellable = isCancellable(paymentStatus, activePenalty, paymentStartTime);
      expect(cancellable).to.be.true;
    });
  });
});
