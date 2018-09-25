import { describe, fail, it, afterEach } from 'mocha';
import sinon from 'sinon';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import PenaltyService from '../../src/server/services/penalty.service';
import SignedHttpClient from '../../src/server/utils/httpclient';
import MockedBackendAPI from '../utils/mockedBackendAPI';
import penalties from '../data/penalties';

use(chaiAsPromised);

const httpClient = new SignedHttpClient('');

describe('Penalty Service', () => {
  context('retrieval', () => {
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
        const result = await penaltyService.getById(validReferenceNo);

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
      it('should return a rejected promise [WHEN] a reference refers to a penalty which is part of a group', () => {
        const groupReferenceNumber = '4597595755914';

        mockedHttpClient = sinon.stub(httpClient, 'get').callsFake(reference => mockedBackendAPI.getPenaltyByReference(reference));
        penaltyService = new PenaltyService();
        penaltyService.httpClient = mockedHttpClient.rootObj;

        const result = penaltyService.getById(groupReferenceNumber);

        return expect(result).to.be.rejected;
      });
    });
  });

  describe('cancels a penalty by ID', () => {
    const penaltyId = '326598784512_FPN';
    const penaltyGetResponse = { data: penalties.find(p => p.ID === penaltyId) };
    let penaltyService;
    let httpGetStub;
    let httpDeleteStub;

    beforeEach(() => {
      httpGetStub = sinon.stub(SignedHttpClient.prototype, 'get');
      httpDeleteStub = sinon.stub(SignedHttpClient.prototype, 'delete');
    });
    afterEach(() => {
      SignedHttpClient.prototype.get.restore();
      SignedHttpClient.prototype.delete.restore();
    });

    context('given HTTP client returns the penalty by ID and the cancellation request succeeds', () => {
      beforeEach(() => {
        httpGetStub
          .withArgs(`documents/${penaltyId}`)
          .resolves(penaltyGetResponse);
        httpDeleteStub
          .withArgs(`documents/${penaltyId}`)
          .resolves();
        penaltyService = new PenaltyService('https://fake.url');
      });

      it('should get the penalty document from document service and use it to call delete', async () => {
        await penaltyService.cancel(penaltyId);
        sinon.assert.calledWith(httpGetStub, `documents/${penaltyId}`);
        sinon.assert.calledWith(httpDeleteStub, `documents/${penaltyId}`, penaltyGetResponse.data);
      });
    });

    context('given HTTP client returns a 2xx response that doesnt contain the penalty data', () => {
      beforeEach(() => {
        httpGetStub
          .withArgs(`documents/${penaltyId}`)
          .resolves({});
      });
      it('should throw an error stating the data was missing', async () => {
        try {
          await penaltyService.cancel(penaltyId);
          fail();
        } catch (error) {
          expect(error.message).to.equal('Unexpected penalty penalty response prevented cancellation');
        }
        sinon.assert.notCalled(httpDeleteStub);
      });
    });
  });
});
