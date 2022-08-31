import sinon from 'sinon';

import * as PaymentController from '../../src/server/controllers/payment.controller';
import config from '../../src/server/config';
import CpmsService from '../../src/server/services/cpms.service';
import PenaltyService from '../../src/server/services/penalty.service';
import PenaltyGroupService from '../../src/server/services/penaltyGroup.service';
import getPenaltyGroupFake from '../data/penaltyGroup/enchrichedPenaltyGroupFake';
import fakeEnrichedPenaltyGroups from '../data/penaltyGroup/fake-penalty-groups-enriched.json';
import PaymentService from '../../src/server/services/payment.service';
import penaltyServiceGetResponses from '../data/penaltyServiceGetResponses';

const penaltyGroup = fakeEnrichedPenaltyGroups.find((g) => g.paymentCode === '5624r2wupfs');

describe('PaymentController', () => {
  let penaltyGroupServiceStub;
  let paymentServiceStub;
  const redirectSpy = sinon.spy();
  const renderSpy = sinon.spy();
  let request;
  const response = { render: renderSpy, redirect: redirectSpy };

  beforeEach(() => {
    penaltyGroupServiceStub = sinon.stub(PenaltyGroupService.prototype, 'getByPaymentCode');
    penaltyGroupServiceStub.callsFake(getPenaltyGroupFake);
    paymentServiceStub = sinon.stub(PaymentService.prototype, 'recordGroupPayment');
  });
  afterEach(() => {
    PenaltyGroupService.prototype.getByPaymentCode.restore();
    PaymentService.prototype.recordGroupPayment.restore();
    redirectSpy.resetHistory();
    renderSpy.resetHistory();
  });

  describe('renderGroupPaymentPage', () => {
    beforeEach(() => {
      sinon.stub(config, 'postPaymentRedirectBaseUrl').returns('http://localhost:3000');
      request = {
        params: { payment_code: '5624r2wupfs', type: 'FPN' },
        query: { paymentType: 'card' },
      };
    });
    afterEach(() => {
      config.postPaymentRedirectBaseUrl.restore();
    });

    context('when the penalties of that type are already paid', () => {
      beforeEach(() => {
        request.params.payment_code = '4724r2wujeg';
      });
      it('should redirect back to the payment code', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, '/payment-code/4724r2wujeg');
      });
    });

    context('when the penalties have passed payment due date', () => {
      it('should redirect payments back to the payment code', async () => {
        request.params.payment_code = '238gk2wnval';
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, '/payment-code/238gk2wnval');
      });
    });

    context('when one of the collaborators rejects', () => {
      let cpmsServiceStub;
      beforeEach(() => {
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createCardNotPresentGroupTransaction');
        cpmsServiceStub.rejects(new Error('timed out'));
      });
      afterEach(() => {
        CpmsService.prototype.createCardNotPresentGroupTransaction.restore();
      });
      it('should redirect back to the payment code', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs');
      });
    });

    context('when the payment type is card', () => {
      let cpmsServiceStub;
      beforeEach(() => {
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createCardNotPresentGroupTransaction');
        cpmsServiceStub
          .withArgs(
            '5624r2wupfs',
            penaltyGroup.penaltyGroupDetails,
            'FPN',
            penaltyGroup.penaltyDetails[0].penalties,
            'http://localhost:3000/payment-code/5624r2wupfs/FPN/confirmGroupPayment',
          )
          .resolves({ data: { gateway_url: 'https://cpms.url' } });
      });
      afterEach(() => {
        CpmsService.prototype.createCardNotPresentGroupTransaction.restore();
      });
      it('should create a group card not present transaction and redirect to CPMS', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, 'https://cpms.url');
      });
    });

    context('when the payment type is cash', () => {
      beforeEach(() => {
        request.query.paymentType = 'cash';
      });
      it('should render the cash group payment page', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/groupCash', { ...penaltyGroup, paymentPenaltyType: 'FPN' });
      });
    });

    context('when the payment type is cheque', () => {
      beforeEach(() => {
        request.query.paymentType = 'cheque';
      });
      it('should render the cheque group payment page', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/groupCheque', { ...penaltyGroup, paymentPenaltyType: 'FPN' });
      });
    });

    context('when the payment type is cheque', () => {
      beforeEach(() => {
        request.query.paymentType = 'postal';
      });
      it('should render the postal order group payment page', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/groupPostalOrder', { ...penaltyGroup, paymentPenaltyType: 'FPN' });
      });
    });

    context('when the payment type is invalid', () => {
      beforeEach(() => {
        request.query.paymentType = 'notvalidtype';
      });
      it('should redirect to invalid payment code error page', async () => {
        await PaymentController.renderGroupPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, '/?invalidPaymentCode');
      });
    });
  });

  describe('confirmGroupPayment', () => {
    let cpmsServiceStub;

    beforeEach(() => {
      cpmsServiceStub = sinon.stub(CpmsService.prototype, 'confirmPayment');

      request = {
        params: { payment_code: '5624r2wupfs', type: 'FPN' },
        query: { receipt_reference: 'FB02-18-20180816-154021-D8245D1F' },
      };

      cpmsServiceStub
        .withArgs('FB02-18-20180816-154021-D8245D1F', 'FPN')
        .resolves({ data: { code: 801, auth_code: '1234' } });
    });
    afterEach(() => {
      CpmsService.prototype.confirmPayment.restore();
    });

    context('given CPMS Service confirmation response has code 801', () => {
      it('should call payment service to create a group payment record and redirect to the receipt page', async () => {
        await PaymentController.confirmGroupPayment(request, response);
        sinon.assert.calledWith(penaltyGroupServiceStub, '5624r2wupfs');
        sinon.assert.calledWith(cpmsServiceStub, 'FB02-18-20180816-154021-D8245D1F', 'FPN');
        sinon.assert.calledWith(paymentServiceStub, {
          PaymentCode: '5624r2wupfs',
          PenaltyType: 'FPN',
          PaymentDetail: {
            PaymentMethod: 'CNP',
            PaymentRef: 'FB02-18-20180816-154021-D8245D1F',
            AuthCode: '1234',
            PaymentAmount: 120,
            PaymentDate: sinon.match.number,
          },
          PenaltyIds: [
            '564548184556_FPN',
            '5281756140484_FPN',
          ],
        });
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs/FPN/receipt');
      });
    });

    context('given CPMS service confirmation response has code 807 indicating cancel was clicked', () => {
      beforeEach(() => {
        cpmsServiceStub
          .withArgs('FB02-18-20180816-154021-D8245D1F', 'FPN')
          .resolves({ data: { code: 807, auth_code: '1234' } });
      });
      it('should return to the payment code', async () => {
        await PaymentController.confirmGroupPayment(request, response);
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs');
      });
    });

    context('given CPMS Service confirmation response has a code different from 801', () => {
      beforeEach(() => {
        cpmsServiceStub
          .withArgs('FB02-18-20180816-154021-D8245D1F', 'FPN')
          .resolves({ data: { code: 999, auth_code: '1234' } });
      });
      it('should render to confirm error page', async () => {
        await PaymentController.confirmGroupPayment(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/confirmError');
      });
    });

    context('given collaborator rejects', () => {
      beforeEach(() => {
        cpmsServiceStub.reset();
        cpmsServiceStub.rejects();
      });
      it('should render the confirm error page', async () => {
        await PaymentController.confirmGroupPayment(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/confirmError');
      });
    });
  });

  describe('makeGroupPayment', () => {
    let cpmsSvcMock;
    beforeEach(() => {
      sinon.stub(config, 'postPaymentRedirectBaseUrl').returns('http://localhost:3000');
    });
    afterEach(() => {
      config.postPaymentRedirectBaseUrl.restore();
    });
    const standardTransactionPayloadWithExtraArgsResolvesSuccess = (...rest) => { // eslint-disable-line
      return cpmsSvcMock
        .withArgs(
          '5624r2wupfs',
          penaltyGroup.penaltyGroupDetails,
          'FPN',
          penaltyGroup.penaltyDetails,
          'http://localhost:3000/payment-code/5624r2wupfs/FPN/receipt',
          ...rest,
        )
        .resolves({
          data: {
            receipt_reference: 'receipt-ref',
            code: '000',
            message: 'Success',
          },
        });
    };

    const assertPaymentRecordCreatedForPaymentMethod = (paymentMethod) => {
      sinon.assert.calledWith(paymentServiceStub, {
        PaymentCode: '5624r2wupfs',
        PenaltyType: 'FPN',
        PaymentDetail: {
          PaymentMethod: paymentMethod,
          PaymentRef: 'receipt-ref',
          PaymentAmount: 120,
          PaymentDate: sinon.match.number,
        },
        PenaltyIds: [
          '564548184556_FPN',
          '5281756140484_FPN',
        ],
      });
    };

    context('when a cash payment is sent', async () => {
      beforeEach(() => {
        cpmsSvcMock = sinon.stub(CpmsService.prototype, 'createGroupCashTransaction');
        standardTransactionPayloadWithExtraArgsResolvesSuccess('1234');
        request = {
          body: { paymentType: 'cash', slipNumber: '1234' },
          params: { payment_code: '5624r2wupfs', type: 'FPN' },
        };
      });
      afterEach(() => {
        CpmsService.prototype.createGroupCashTransaction.restore();
      });
      it('should create a group cash transaction, make a group payment and return to the receipt page', async () => {
        await PaymentController.makeGroupPayment(request, response);
        assertPaymentRecordCreatedForPaymentMethod('CASH');
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs/FPN/receipt');
      });

      context('given CPMS orchestration does not indicate the cash payment was successful', () => {
        beforeEach(() => {
          cpmsSvcMock.resetBehavior();
          cpmsSvcMock.resolves({ data: { receipt_reference: 'receipt-ref', code: '001', message: 'Not success' } });
        });

        it('should render the failed payment page', async () => {
          await PaymentController.makeGroupPayment(request, response);
          sinon.assert.calledWith(renderSpy, 'payment/failedPayment');
        });
      });
    });

    context('when a cheque payment is sent', () => {
      beforeEach(() => {
        cpmsSvcMock = sinon.stub(CpmsService.prototype, 'createGroupChequeTransaction');
        standardTransactionPayloadWithExtraArgsResolvesSuccess('2468', '369', '2018-08-24', 'Joe Bloggs');
        request = {
          body: {
            paymentType: 'cheque',
            slipNumber: '2468',
            chequeNumber: '369',
            chequeDate: '2018-08-24',
            nameOnCheque: 'Joe Bloggs',
          },
          params: { payment_code: '5624r2wupfs', type: 'FPN' },
        };
      });
      afterEach(() => {
        CpmsService.prototype.createGroupChequeTransaction.restore();
      });
      it('should create a group cheque transaction, make a group payment and return to the receipt page', async () => {
        await PaymentController.makeGroupPayment(request, response);
        assertPaymentRecordCreatedForPaymentMethod('CHEQUE');
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs/FPN/receipt');
      });
    });

    context('when a postal payment is sent', () => {
      beforeEach(() => {
        cpmsSvcMock = sinon.stub(CpmsService.prototype, 'createGroupPostalOrderTransaction');
        standardTransactionPayloadWithExtraArgsResolvesSuccess('1234', '2468');
        request.body.paymentType = 'postal';
        request.body.slipNumber = '1234';
        request.body.postalOrderNumber = '2468';
      });
      afterEach(() => {
        CpmsService.prototype.createGroupPostalOrderTransaction.restore();
      });
      it('should create a group postal order transaction, make a group payment and return to the receipt page', async () => {
        await PaymentController.makeGroupPayment(request, response);
        assertPaymentRecordCreatedForPaymentMethod('POSTAL_ORDER');
        sinon.assert.calledWith(redirectSpy, '/payment-code/5624r2wupfs/FPN/receipt');
      });
    });
  });

  describe('makePayment for immobilisation', () => {
    const paymentCode = '5260825bbe245e1a';
    const cpmsReceiptRef = 'FB02-01-20180816-091027-B9AA05B9';
    const imReference = '945872-0-776-IM';
    const paddedImRefNumber = '9458720000776';
    const vehicleReg = '17EEE';
    const slipNumber = 2468;
    const requestParams = { payment_code: paymentCode };
    let penaltySvcStub;
    let cpmsServiceStub;
    const expectedPaymentSvcPayloadForPaymentType = (type) => ({
      PenaltyStatus: 'PAID',
      PenaltyType: 'IM',
      PenaltyReference: paddedImRefNumber,
      PaymentDetail: {
        PaymentMethod: type,
        PaymentRef: cpmsReceiptRef,
        PaymentAmount: 80,
        PaymentDate: sinon.match.number,
      },
    });

    beforeEach(() => {
      penaltySvcStub = sinon.stub(PenaltyService.prototype, 'getByPaymentCode');
      penaltySvcStub
        .callsFake((c) => Promise.resolve(penaltyServiceGetResponses.find((p) => p.paymentCode === c)));
      paymentServiceStub = sinon.stub(PaymentService.prototype, 'makePayment');
      request = { params: requestParams, session: { rsp_user_role: 'BankingFinance', rsp_user: { email: 'test_user@example.com' } } };
    });
    afterEach(() => {
      PenaltyService.prototype.getByPaymentCode.restore();
      PaymentService.prototype.makePayment.restore();
    });

    context('when a cash payment is made', () => {
      beforeEach(() => {
        request.body = { paymentType: 'cash', slipNumber };
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createCashTransaction');
        cpmsServiceStub
          .withArgs(paymentCode, vehicleReg, imReference, 'IM', 80, slipNumber)
          .resolves({ data: { receipt_reference: cpmsReceiptRef } });
        paymentServiceStub.resolves();
      });
      afterEach(() => {
        CpmsService.prototype.createCashTransaction.restore();
      });
      it('create a cash transaction, persist it and return to payment code summary', async () => {
        await PaymentController.makePayment(request, response);
        sinon.assert.calledWith(paymentServiceStub, expectedPaymentSvcPayloadForPaymentType('CASH'));
        sinon.assert.calledWith(redirectSpy, `/payment-code/${paymentCode}`);
      });
    });

    context('when a cheque payment is made', () => {
      const chequeDate = '04/10/2018';
      const chequeNumber = '9876';
      const nameOnCheque = 'Joe Bloggs';
      beforeEach(() => {
        request.body = {
          paymentType: 'cheque',
          slipNumber,
          chequeDate,
          chequeNumber,
          nameOnCheque,
        };
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createChequeTransaction');
        cpmsServiceStub
          .withArgs(
            paymentCode,
            vehicleReg,
            imReference,
            'IM',
            80,
            slipNumber,
            chequeDate,
            chequeNumber,
            nameOnCheque,
          )
          .resolves({ data: { receipt_reference: cpmsReceiptRef } });
        paymentServiceStub.resolves();
      });
      afterEach(() => {
        CpmsService.prototype.createChequeTransaction.restore();
      });
      it('attempts to create a cheque transaction, fails, and returns to the payment code summary', async () => {
        await PaymentController.makePayment(request, response);
        // Test the payment hasn't gone through
        sinon.assert.notCalled(paymentServiceStub);
        sinon.assert.calledWith(redirectSpy, `/payment-code/${paymentCode}`);
      });
    });

    context('when a postal payment is made', () => {
      const postalOrderNumber = 5555;
      beforeEach(() => {
        request.body = { paymentType: 'postal', slipNumber, postalOrderNumber };
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createPostalOrderTransaction');
        cpmsServiceStub
          .withArgs(paymentCode, vehicleReg, imReference, 'IM', 80, slipNumber, postalOrderNumber)
          .resolves({ data: { receipt_reference: cpmsReceiptRef } });
        paymentServiceStub.resolves();
      });
      afterEach(() => {
        CpmsService.prototype.createPostalOrderTransaction.restore();
      });
      it('attempts to create a postal transaction, fails, and returns to the payment code summary', async () => {
        await PaymentController.makePayment(request, response);
        sinon.assert.notCalled(paymentServiceStub);
        sinon.assert.calledWith(redirectSpy, `/payment-code/${paymentCode}`);
      });
    });
  });

  describe('makePayment for fixed penalty notices', () => {
    const paymentCode = '3cc571fbf9459417';
    const cpmsReceiptRef = 'FB02-01-20180816-091027-B9AA05B9';
    const vehicleReg = 'TESTER4';
    const fpnReference = '379468752548';
    const slipNumber = 2468;
    const requestParams = { payment_code: paymentCode };
    const penaltyType = 'FPN';
    const paymentAmount = 120;
    let penaltySvcStub;
    let cpmsServiceStub;
    const expectedPaymentSvcPayloadForPaymentType = (type) => ({
      PenaltyStatus: 'PAID',
      PenaltyType: penaltyType,
      PaymentDetail: {
        PaymentMethod: type,
        PaymentRef: cpmsReceiptRef,
        PaymentAmount: paymentAmount,
        PaymentDate: sinon.match.number,
      },
      PenaltyReference: fpnReference,
    });

    beforeEach(() => {
      penaltySvcStub = sinon.stub(PenaltyService.prototype, 'getByPaymentCode');
      penaltySvcStub
        .callsFake((c) => Promise.resolve(penaltyServiceGetResponses.find((p) => p.paymentCode === c)));
      paymentServiceStub = sinon.stub(PaymentService.prototype, 'makePayment');
      request = { params: requestParams, session: { rsp_user_role: 'BankingFinance', rsp_user: { email: 'test_user@example.com' } } };
    });
    afterEach(() => {
      PenaltyService.prototype.getByPaymentCode.restore();
      PaymentService.prototype.makePayment.restore();
    });

    context('when a cheque payment is made', () => {
      const chequeDate = '04/10/2018';
      const chequeNumber = '9876';
      const nameOnCheque = 'Joe Bloggs';
      beforeEach(() => {
        request.body = {
          paymentType: 'cheque',
          slipNumber,
          chequeDate,
          chequeNumber,
          nameOnCheque,
        };
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createChequeTransaction');
        cpmsServiceStub
          .withArgs(
            paymentCode,
            vehicleReg,
            fpnReference,
            penaltyType,
            paymentAmount,
            slipNumber,
            chequeDate,
            chequeNumber,
            nameOnCheque,
          )
          .resolves({ data: { receipt_reference: cpmsReceiptRef } });
        paymentServiceStub.resolves();
      });
      afterEach(() => {
        CpmsService.prototype.createChequeTransaction.restore();
      });
      it('create a cheque transaction, persist it and return to payment code summary', async () => {
        await PaymentController.makePayment(request, response);
        sinon.assert.calledWith(paymentServiceStub, expectedPaymentSvcPayloadForPaymentType('CHEQUE'));
        sinon.assert.calledWith(redirectSpy, `/payment-code/${paymentCode}`);
      });
    });

    context('when a postal payment is made', () => {
      const postalOrderNumber = 5555;
      beforeEach(() => {
        request.body = { paymentType: 'postal', slipNumber, postalOrderNumber };
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createPostalOrderTransaction');
        cpmsServiceStub
          .withArgs(
            paymentCode,
            vehicleReg,
            fpnReference,
            penaltyType,
            paymentAmount,
            slipNumber,
            postalOrderNumber,
          )
          .resolves({ data: { receipt_reference: cpmsReceiptRef } });
        paymentServiceStub.resolves();
      });
      afterEach(() => {
        CpmsService.prototype.createPostalOrderTransaction.restore();
      });
      it('create a postal transaction, persist it and return to payment code summary', async () => {
        await PaymentController.makePayment(request, response);
        sinon.assert.calledWith(paymentServiceStub, expectedPaymentSvcPayloadForPaymentType('POSTAL'));
        sinon.assert.calledWith(redirectSpy, `/payment-code/${paymentCode}`);
      });
    });
  });

  describe('renderPaymentPage', () => {
    let penaltySvcStub;
    beforeEach(() => {
      penaltySvcStub = sinon.stub(PenaltyService.prototype, 'getByPaymentCode');
      penaltySvcStub.callsFake((c) => Promise.resolve(penaltyServiceGetResponses.find((p) => p.paymentCode === c)));
      sinon.stub(config, 'postPaymentRedirectBaseUrl').returns('http://localhost:3000');
      request = {
        params: { payment_code: '3cc571fbf9459417', type: 'FPN' },
        query: { paymentType: 'card' },
      };
    });
    afterEach(() => {
      PenaltyService.prototype.getByPaymentCode.restore();
      config.postPaymentRedirectBaseUrl.restore();
    });

    context('when the penalties have been paid', () => {
      beforeEach(() => {
        request.params.payment_code = '4ee571fbf9458528';
      });
      it('should redirect back to the payment code', async () => {
        await PaymentController.renderPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, '/payment-code/4ee571fbf9458528');
      });
    });

    context('when the penalties have passed payment due date', () => {
      it('should redirect back to the payment code', async () => {
        request.params.payment_code = '4ty571naf9458FPN';
        await PaymentController.renderPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, '/payment-code/4ty571naf9458FPN');
      });
    });

    context('when the payment type is card', () => {
      let cpmsServiceStub;
      beforeEach(() => {
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createCardNotPresentTransaction');
        cpmsServiceStub.resolves({ data: { gateway_url: 'https://cpms.url' } });
      });
      afterEach(() => {
        CpmsService.prototype.createCardNotPresentTransaction.restore();
      });
      it('should create a card not present transaction and redirect to CPMS', async () => {
        await PaymentController.renderPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, 'https://cpms.url');
      });
    });

    context('when the payment type is cash', () => {
      beforeEach(() => {
        request.query.paymentType = 'cash';
      });
      it('should render the cash group payment page', async () => {
        await PaymentController.renderPaymentPage(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/cash', sinon.match.object);
      });
    });

    context('when the payment type is cheque', () => {
      beforeEach(() => {
        request.query.paymentType = 'cheque';
      });
      it('should render the cheque group payment page', async () => {
        await PaymentController.renderPaymentPage(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/cheque', sinon.match.object);
      });
    });

    context('when the payment type is postal', () => {
      beforeEach(() => {
        request.query.paymentType = 'postal';
      });
      it('should render the postal order group payment page', async () => {
        await PaymentController.renderPaymentPage(request, response);
        sinon.assert.calledWith(renderSpy, 'payment/postal', sinon.match.object);
      });
    });

    context('when the payment type is invalid', () => {
      let cpmsServiceStub;
      beforeEach(() => {
        request.query.paymentType = 'notvalidtype';
        cpmsServiceStub = sinon.stub(CpmsService.prototype, 'createCardNotPresentTransaction');
        cpmsServiceStub.resolves({ data: { gateway_url: 'https://cpms.url' } });
      });
      afterEach(() => {
        CpmsService.prototype.createCardNotPresentTransaction.restore();
      });
      it('should default to card holder not present type', async () => {
        await PaymentController.renderPaymentPage(request, response);
        sinon.assert.calledWith(redirectSpy, 'https://cpms.url');
      });
    });
  });
});
