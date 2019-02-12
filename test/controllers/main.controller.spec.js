import { expect } from 'chai';
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
        await MainController.searchVehicleReg({ params: { vehicle_reg: '11AAA' } }, response);
        const expectedViewData = {
          vehicleReg: '11AAA',
          results: [
            {
              paymentCode: 'abc123',
              paymentStatus: 'UNPAID',
              summary: '2 penalties',
              date: 1533562273.803,
              formattedDate: '06/08/2018 14:31',
            },
          ],
        };
        sinon.assert.calledWith(redirectSpy, '/vehicle-reg-search-results/11AAA');
        sinon.assert.calledWith(renderSpy, 'penalty/vehicleRegSearchResults', expectedViewData);
      });
    });

    context('when we search for a reg with 1 single penalty', () => {
      it('should render the search results page with overviews of everything issued', async () => {
        searchForm.vehicle_reg = '11BBB';
        await MainController.searchPenalty(request, response);
        await MainController.searchVehicleReg({ params: { vehicle_reg: '11BBB' } }, response);
        const expectedViewData = {
          vehicleReg: '11BBB',
          results: [
            {
              paymentCode: 'f99c8e4035c8e1ae',
              paymentStatus: 'PAID',
              summary: '1 penalty',
              date: 1519776000,
              formattedDate: '24/12/2018 12:00',
            },
          ],
        };
        sinon.assert.calledWith(redirectSpy, '/vehicle-reg-search-results/11BBB');
        sinon.assert.calledWith(renderSpy, 'penalty/vehicleRegSearchResults', expectedViewData);
      });
    });

    context('when we search for a reg with more than 1 penalty group', () => {
      it('should render the search results page with overviews of everything issued', async () => {
        searchForm.vehicle_reg = '11CCC';
        await MainController.searchPenalty(request, response);
        await MainController.searchVehicleReg({ params: { vehicle_reg: '11CCC' } }, response);
        const expectedViewData = {
          vehicleReg: '11CCC',
          results: [
            {
              paymentCode: 'abc123',
              paymentStatus: 'UNPAID',
              summary: '2 penalties',
              date: 1535546734.879,
              formattedDate: '29/08/2018 13:45',
            },
            {
              paymentCode: 'def456',
              paymentStatus: 'UNPAID',
              summary: '2 penalties',
              date: 1535123187.565,
              formattedDate: '24/08/2018 16:06',
            },
          ],
        };
        sinon.assert.calledWith(redirectSpy, '/vehicle-reg-search-results/11CCC');
        sinon.assert.calledWith(renderSpy, 'penalty/vehicleRegSearchResults', expectedViewData);
      });
    });

    context('when we search for a reg with multiple penalty groups and multiple single penalties', () => {
      it('should render the search results page with overviews of everything issued', async () => {
        searchForm.vehicle_reg = '11DDD';
        await MainController.searchPenalty(request, response);
        await MainController.searchVehicleReg({ params: { vehicle_reg: '11DDD' } }, response);
        const expectedViewData = {
          vehicleReg: '11DDD',
          results: [
            {
              paymentCode: 'abc123',
              paymentStatus: 'UNPAID',
              summary: '2 penalties',
              date: 1535546734.879,
              formattedDate: '29/08/2018 13:45',
            },
            {
              paymentCode: 'def456',
              paymentStatus: 'UNPAID',
              summary: '2 penalties',
              date: 1532461537.865,
              formattedDate: '24/07/2018 20:45',
            },
            {
              paymentCode: 'f99c8e4035c8e1ae',
              paymentStatus: 'UNPAID',
              summary: '1 penalty',
              date: 1519776000,
              formattedDate: '24/12/2018 12:00',
            },
            {
              paymentCode: '55602ee4b37ab59e',
              paymentStatus: 'CANCELLED',
              summary: '1 penalty',
              date: 1519776000,
              formattedDate: '24/12/2018 12:00',
            },
          ],
        };
        sinon.assert.calledWith(redirectSpy, '/vehicle-reg-search-results/11DDD');
        sinon.assert.calledWith(renderSpy, 'penalty/vehicleRegSearchResults', expectedViewData);
      });
    });

    context('when we search for a reg in a penalty group with only one FPN', () => {
      it('should render correctly', async () => {
        searchForm.vehicle_reg = '11EEE';
        await MainController.searchPenalty(request, response);
        await MainController.searchVehicleReg({ params: { vehicle_reg: '11EEE' } }, response);

        const expectedViewData = {
          vehicleReg: '11EEE',
          results: [
            {
              paymentCode: 'abc123',
              paymentStatus: 'UNPAID',
              summary: '1 penalty',
              date: 1535546734.879,
              formattedDate: '29/08/2018 13:45',
            },
          ],
        };
        sinon.assert.calledWith(redirectSpy, '/vehicle-reg-search-results/11EEE');
        sinon.assert.calledWith(renderSpy, 'penalty/vehicleRegSearchResults', expectedViewData);
      });
    });

    context('when we search for a reg in a penalty group with only one IM', () => {
      it('should render correctly', async () => {
        searchForm.vehicle_reg = '11FFF';
        await MainController.searchPenalty(request, response);
        await MainController.searchVehicleReg({ params: { vehicle_reg: '11FFF' } }, response);

        const expectedViewData = {
          vehicleReg: '11FFF',
          results: [
            {
              paymentCode: 'abc123',
              paymentStatus: 'UNPAID',
              summary: '1 immobilisation',
              date: 1535546734.879,
              formattedDate: '29/08/2018 13:45',
            },
          ],
        };
        sinon.assert.calledWith(redirectSpy, '/vehicle-reg-search-results/11FFF');
        sinon.assert.calledWith(renderSpy, 'penalty/vehicleRegSearchResults', expectedViewData);
      });
    });

    context('when the user searches for a blank registration', () => {
      it('should redirect back home with the invalid registration query param', async () => {
        searchForm.vehicle_reg = '   ';
        await MainController.searchPenalty(request, response);
        sinon.assert.calledWith(redirectSpy, '/?invalidReg');
      });
    });

    context('given document service rejects search by registration', () => {
      beforeEach(() => {
        mockDocumentSvc
          .rejects(new Error('timeout'));
      });
      it('should redirect home with invalid vehicle reg query parameter', async () => {
        searchForm.vehicle_reg = '11ZZZ';
        await MainController.searchPenalty(request, response);
        await MainController.searchVehicleReg({ params: { vehicle_reg: '11ZZZ' } }, response);
        sinon.assert.calledWith(redirectSpy, '/vehicle-reg-search-results/11ZZZ');
        sinon.assert.calledWith(redirectSpy, '/?invalidReg');
      });
    });

    context('normaliseRegistration', () => {
      it('should always call next middleware, modifying request registration parameter where applicable', () => {
        const cases = [
          { regIn: undefined, regOut: undefined },
          { regIn: '13JJJ', regOut: '13JJJ' },
          { regIn: '13 JJJ', regOut: '13JJJ' },
          { regIn: ' 13 JJJ   ', regOut: '13JJJ' },
          { regIn: ' 13 #JJ   ', regOut: '13JJ' },
          { regIn: ' 13 JjJ   ', regOut: '13JJJ' },
        ];

        cases.forEach((theCase) => {
          const nextMiddleware = sinon.stub();
          const responseStub = sinon.stub();
          const req = { params: { vehicle_reg: theCase.regIn } };
          MainController.normaliseRegistration(req, responseStub, nextMiddleware);
          expect(req.params.vehicle_reg).to.equal(theCase.regOut);
          sinon.assert.called(nextMiddleware);
        });
      });
    });
  });
});
