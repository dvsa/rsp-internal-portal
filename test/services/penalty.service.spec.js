import { describe, it, afterEach } from 'mocha';
import sinon from 'sinon';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import PenaltyService from '../../src/server/services/penalty.service';
import createHttpClient from '../../src/server/utils/httpclient';
import MockedBackendAPI from '../utils/mockedBackendAPI';
import penalties from '../data/penalties';

use(chaiAsPromised);

const httpClient = createHttpClient('');

describe('Penalty Service', () => {
  const mockedBackendAPI = new MockedBackendAPI(penalties);

  let mockedHttpClient;
  let penaltyService;

  afterEach(() => {
    mockedHttpClient.restore();
    penaltyService = undefined;
  });

  describe('Retrieves a penalty by payment code', () => {
    it('Should retrieve the correct penalty [WHEN] a valid payment code is provided', async () => {
      // Arrange
      const validPaymentCode = '1111111111111111';

      mockedHttpClient = sinon.stub(httpClient, 'get').callsFake(code => mockedBackendAPI.getPenaltyByPaymentCode(code));
      penaltyService = new PenaltyService();
      penaltyService.httpClient = mockedHttpClient.rootObj;

      // Act
      const result = await penaltyService.getByPaymentCode(validPaymentCode);

      // Assert
      expect(result.paymentCode).to.equal(validPaymentCode);
    });
    it('Should return a rejected promise [WHEN] an invalid payment code is provided', () => {
      // Arrange
      const invalidPaymentCode = 'zzxzxzxasdqawsdaszxcwqesd$"£%$£$"%';

      mockedHttpClient = sinon.stub(httpClient, 'get').callsFake(code => mockedBackendAPI.getPenaltyByPaymentCode(code));
      penaltyService = new PenaltyService();
      penaltyService.httpClient = mockedHttpClient.rootObj;

      // Act
      const result = penaltyService.getByPaymentCode(invalidPaymentCode);

      // Assert
      return expect(result).to.be.rejected;
    });
  });

  describe('Retrieves a penalty by penalty reference', () => {
    it('Should retrieve the correct penalty [WHEN] a valid penalty reference is provided', async () => {
      // Arrange
      const validReferenceNo = '578888-1-990519-IM';

      mockedHttpClient = sinon.stub(httpClient, 'get').callsFake(reference => mockedBackendAPI.getPenaltyByReference(reference));
      penaltyService = new PenaltyService();
      penaltyService.httpClient = mockedHttpClient.rootObj;

      // Act
      const result = await penaltyService.getByReference(validReferenceNo);

      // Assert
      expect(result.reference).to.equal(validReferenceNo);
    });
    it('Should return a rejected promise [WHEN] an invalid penalty reference is provided', () => {
      // Arrange
      const invalidPenaltyReference = 'zzxzxzxasdqawsdaszxcwqesd$"£%$£$"%';

      mockedHttpClient = sinon.stub(httpClient, 'get').callsFake(reference => mockedBackendAPI.getPenaltyByReference(reference));
      penaltyService = new PenaltyService();
      penaltyService.httpClient = mockedHttpClient.rootObj;

      // Act
      const result = penaltyService.getByPaymentCode(invalidPenaltyReference);

      // Assert
      return expect(result).to.be.rejected;
    });
  });
});
