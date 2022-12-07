import { expect } from 'chai';
import config from '../src/server/config';

describe('Config', () => {
  context('payment limit days', () => {
    it('should use default value if no env variable exists', async () => {
      await config.bootstrap();
      const payment = config.paymentLimitDays();
      expect(payment).to.equal(42);
    });
  });
});
