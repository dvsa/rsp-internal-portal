import sinon from 'sinon';

import * as MainController from '../../src/server/controllers/main.controller';
import PenaltyService from '../../src/server/services/penalty.service';

describe('MainController', () => {
  let searchForm;
  let redirectSpy;
  let renderSpy;
  let request;
  let response;
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
    redirectSpy = sinon.spy();
    renderSpy = sinon.spy();
    response = { redirect: redirectSpy, render: renderSpy };
  });

  afterEach(() => {
    redirectSpy.reset();
    renderSpy.reset();
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

    context('given document service returns a single penalty group for the registration', () => {
      beforeEach(() => {
        mockDocumentSvc
          .withArgs('11AAA')
          .resolves([{
            ID: 'abc123',
          }]);
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
          .resolves([{
            ID: 'abc123',
            Value: {
              isPenaltyGroup: false,
              paymentCode: '789def',
            },
          }]);
      });
      it('should redirect to the payment code', async () => {
        await MainController.searchPenalty(request, response);
        sinon.assert.calledWith(redirectSpy, 'payment-code/789def');
      });
    });

    context('given document service returns more than one penalty doc/group for the registration', () => {
      const searchResponse = [
        {
          ID: 'abc123',
          Timestamp: 1533562273.803,
          PenaltyGroupIds: [
            '123_FPN',
            '246_FPN',
          ],
        },
        {
          ID: 'zyx555',
          Timestamp: 1535531871.342,
          PenaltyGroupIds: [
            '555_IM',
            '666_CDN',
          ],
        },
      ];
      beforeEach(() => {
        mockDocumentSvc
          .withArgs('11AAA')
          .resolves(searchResponse);
      });
      it('should render the vehicle reg search results page', async () => {
        await MainController.searchPenalty(request, response);
        const expectedViewData = {
          vehicleReg: '11AAA',
          results: [
            {
              paymentCode: 'abc123',
              date: '06/08/2018 14:31',
            },
            {
              paymentCode: 'zyx555',
              date: '29/08/2018 09:37',
            },
          ],
        };
        sinon.assert.calledWith(renderSpy, 'penalty/vehicleRegSearchResults', expectedViewData);
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
