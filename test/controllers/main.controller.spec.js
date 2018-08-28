import sinon from 'sinon';

import * as MainController from '../../src/server/controllers/main.controller';
import PenaltyService from '../../src/server/services/penalty.service';

describe('MainController', () => {
  let searchForm;
  const redirectSpy = sinon.spy();
  const renderSpy = sinon.spy();
  let request;
  const response = { redirect: redirectSpy, render: renderSpy };
  let mockDocumentSvc;

  beforeEach(() => {
    searchForm = {
      'search-by': 'FPN',
      penalty_ref_FPN: '3323',
      penalty_ref_IM: '',
      penalty_ref_CDN: '',
      payment_code: '',
      vehicle_reg: '',
    };
  });

  context('search by vehicle reg', () => {
    beforeEach(() => {
      searchForm['search-by'] = 'vehicle-reg';
      searchForm.vehicle_reg = '11AAA';
      mockDocumentSvc = sinon.stub(PenaltyService.prototype, 'searchByRegistration');
      request = { body: searchForm };
    });
    afterEach(() => {
      PenaltyService.prototype.searchByRegistration.restore();
    });

    context('given document service returns a penalty group for the registration', () => {
      beforeEach(() => {
        mockDocumentSvc
          .withArgs('11AAA')
          .resolves({
            ID: 'abc123',
          });
      });
      it('should redirect to the payment code', async () => {
        await MainController.searchPenalty(request, response);
        sinon.assert.calledWith(redirectSpy, 'payment-code/abc123');
      });
    });

    context('given document service returns a single penalty for the registration', () => {
      beforeEach(() => {
        mockDocumentSvc
          .withArgs('11AAA')
          .resolves({
            ID: 'abc123',
            Value: {
              isPenaltyGroup: false,
              paymentCode: '789def',
            },
          });
      });
      it('should redirect to the payment code', async () => {
        await MainController.searchPenalty(request, response);
        sinon.assert.calledWith(redirectSpy, 'payment-code/789def');
      });
    });

    context('given document service rejects search by registration', () => {
      beforeEach(() => {
        mockDocumentSvc
          .withArgs('11AAA')
          .rejects(new Error('timeout'));
      });
      it('should redirect home with invalid vehicle reg query parameter', async () => {
        await MainController.searchPenalty(request, response);
        sinon.assert.calledWith(redirectSpy, '/?invalidReg');
      });
    });
  });
});
