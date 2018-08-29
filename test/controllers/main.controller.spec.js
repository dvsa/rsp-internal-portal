import sinon from 'sinon';

import * as MainController from '../../src/server/controllers/main.controller';
import PenaltyService from '../../src/server/services/penalty.service';
import registrationSearchResponses from '../data/registrationSearch/registrationSearchResponses';

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
    redirectSpy.resetHistory();
    renderSpy.resetHistory();
  });

  context('search by vehicle reg', () => {
    beforeEach(() => {
      searchForm['search-by'] = 'vehicle-reg';
      mockDocumentSvc = sinon.stub(PenaltyService.prototype, 'searchByRegistration');
      mockDocumentSvc.callsFake(registration => registrationSearchResponses[registration]);
      request = { body: searchForm };
    });
    afterEach(() => {
      PenaltyService.prototype.searchByRegistration.restore();
    });

    context('when we search for a reg with 1 penalty group', () => {
      it('should redirect to the payment code', async () => {
        searchForm.vehicle_reg = '11AAA';
        await MainController.searchPenalty(request, response);
        sinon.assert.calledWith(redirectSpy, 'payment-code/abc123');
      });
    });

    context('when we search for a reg with 1 single penalty', () => {
      it('should redirect to the payment code', async () => {
        searchForm.vehicle_reg = '11BBB';
        await MainController.searchPenalty(request, response);
        sinon.assert.calledWith(redirectSpy, 'payment-code/f99c8e4035c8e1ae');
      });
    });

    context('when we search for a reg with more than 1 penalty group', () => {
      it('should render the search results page with overviews of everything issued', async () => {
        searchForm.vehicle_reg = '11CCC';
        await MainController.searchPenalty(request, response);
        const expectedViewData = {
          vehicleReg: '11CCC',
          results: [
            {
              paymentCode: 'abc123',
              date: '29/08/2018 13:45',
            },
            {
              paymentCode: 'def456',
              date: '24/08/2018 16:06',
            },
          ],
        };
        sinon.assert.calledWith(renderSpy, 'penalty/vehicleRegSearchResults', expectedViewData);
      });
    });

    context('when we search for a reg with multiple penalty groups and multiple single penalties', () => {
      it('should render the search results page with overviews of everything issued', async () => {
        searchForm.vehicle_reg = '11DDD';
        await MainController.searchPenalty(request, response);
        const expectedViewData = {
          vehicleReg: '11DDD',
          results: [
            {
              paymentCode: 'abc123',
              date: '29/08/2018 13:45',
            },
            {
              paymentCode: 'def456',
              date: '24/07/2018 20:45',
            },
            {
              paymentCode: 'f99c8e4035c8e1ae',
              date: '28/02/2018 00:00',
            },
            {
              paymentCode: '55602ee4b37ab59e',
              date: '28/02/2018 00:00',
            },
          ],
        };
        sinon.assert.calledWith(renderSpy, 'penalty/vehicleRegSearchResults', expectedViewData);
      });
    });

    context('given document service rejects search by registration', () => {
      beforeEach(() => {
        mockDocumentSvc
          .rejects(new Error('timeout'));
      });
      it('should redirect home with invalid vehicle reg query parameter', async () => {
        await MainController.searchPenalty(request, response);
        sinon.assert.calledWith(redirectSpy, '/?invalidReg');
      });
    });
  });
});
