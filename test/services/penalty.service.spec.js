import { describe, it, afterEach } from 'mocha';
import sinon from 'sinon';
import expect from 'chai';
import PenaltyService from '../../src/server/services/penalty.service';
import createHttpClient from '../../src/server/utils/httpclient';
import MockedBackendAPI from '../utils/mockedBackendAPI';
import penalties from '../data/penalties';

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
      penaltyService = new PenaltyService(mockedHttpClient.rootObj);

      // Act
      const result = await penaltyService.getByPaymentCode(validPaymentCode);

      // Assert
      expect(result).to.be.equal();
    });
    it('Should return a rejected promise [WHEN] an invalid payment code is provided', () => {});
  });

  describe('Retrieves a penalty by penalty reference', () => {
    it('Should retrieve the correct penalty [WHEN] a valid payment code is provided', () => {});
    it('Should return a rejected promise [WHEN] an invalid payment code is provided', () => {});
  });
});
