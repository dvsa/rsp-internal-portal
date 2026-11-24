import { expect } from 'chai';
import sinon from 'sinon';
import CpmsService from '../../src/server/services/cpms.service';

describe('CPMS single payment and report contracts', () => {
  let service;

  beforeEach(() => {
    service = new CpmsService('https://cpms.example.test/');
    service.httpClient = { post: sinon.stub().resolves({ data: {} }) };
  });

  it('creates card-not-present requests', () => {
    service.createCardNotPresentTransaction('code', 'AB12CDE', 'ref', 'FPN', 100, 'https://portal.example.test/');
    sinon.assert.calledWithExactly(service.httpClient.post, 'cardNotPresentPayment/', {
      payment_code: 'code',
      penalty_reference: 'ref',
      penalty_type: 'FPN',
      penalty_amount: 100,
      redirect_url: 'https://portal.example.test/',
      vehicle_reg: 'AB12CDE',
    }, 3, 'CNPPayment');
  });

  it('creates cash, cheque and postal order requests', () => {
    const date = new Date().toISOString().split('T')[0];
    service.createCashTransaction('code', 'AB12CDE', 'ref', 'FPN', 100, '123');
    sinon.assert.calledWithExactly(service.httpClient.post, 'cashPayment/', {
      payment_code: 'code',
      penalty_reference: 'ref',
      penalty_type: 'FPN',
      penalty_amount: 100,
      slip_number: '123',
      receipt_date: date,
      batch_number: '123',
      vehicle_reg: 'AB12CDE',
    }, 3, 'CashPayment');
    service.createChequeTransaction('code', 'AB12CDE', 'ref', 'FPN', 100, '123', '2020-01-01', '456', 'Synthetic');
    sinon.assert.calledWithExactly(service.httpClient.post, 'chequePayment/', {
      payment_code: 'code',
      penalty_reference: 'ref',
      penalty_type: 'FPN',
      penalty_amount: 100,
      slip_number: '123',
      receipt_date: date,
      batch_number: '123',
      cheque_date: '2020-01-01',
      cheque_number: '456',
      name_on_cheque: 'Synthetic',
      vehicle_reg: 'AB12CDE',
    }, 3, 'ChequePayment');
    service.createPostalOrderTransaction('code', 'AB12CDE', 'ref', 'FPN', 100, '123', '789');
    sinon.assert.calledWithExactly(service.httpClient.post, 'postalOrderPayment/', {
      payment_code: 'code',
      penalty_reference: 'ref',
      penalty_type: 'FPN',
      penalty_amount: 100,
      slip_number: '123',
      receipt_date: date,
      batch_number: '123',
      postal_order_number: '789',
      vehicle_reg: 'AB12CDE',
    }, 3, 'PostalOrderPayment');
  });

  it('confirms and reverses payments with the correct retry settings', () => {
    service.confirmPayment('receipt', 'FPN');
    sinon.assert.calledWithExactly(service.httpClient.post, 'confirm/', {
      receipt_reference: 'receipt', penalty_type: 'FPN',
    }, 3, 'ConfirmPayment');
    service.reverseCardPayment('receipt', 'FPN', 'payment');
    sinon.assert.calledWithExactly(service.httpClient.post, 'reverseCard/', {
      receipt_ref: 'receipt', penalty_type: 'FPN', payment_ref: 'payment',
    }, 0, 'ReverseCard');
    service.reverseChequePayment('receipt', 'FPN', 'payment');
    sinon.assert.calledWithExactly(service.httpClient.post, 'reverseCheque/', {
      receipt_ref: 'receipt', penalty_type: 'FPN', payment_ref: 'payment',
    }, 0, 'ReverseCheque');
  });

  it('returns report types, including an empty response', async () => {
    service.httpClient.post.onFirstCall().resolves({ data: { items: ['report'] } });
    service.httpClient.post.onSecondCall().resolves({ data: {} });
    expect(await service.getReportTypes()).to.deep.equal(['report']);
    expect(await service.getReportTypes('IM')).to.deep.equal([]);
    sinon.assert.calledWithExactly(service.httpClient.post, 'listReports/', { penalty_type: 'IM' }, 0, 'GetReportTypes');
  });

  it('submits report generation, status and download requests', async () => {
    service.httpClient.post.resolves({ data: { result: 'synthetic' } });
    expect(await service.requestReport('FPN', 'report', 'from', 'to')).to.deep.equal({ result: 'synthetic' });
    sinon.assert.calledWithExactly(service.httpClient.post, 'generateReport/', {
      penalty_type: 'FPN', report_code: 'report', from_date: 'from', to_date: 'to',
    }, 0, 'RequestReport');
    expect(await service.checkReportStatus('FPN', 'ref')).to.deep.equal({ result: 'synthetic' });
    sinon.assert.calledWithExactly(service.httpClient.post, 'checkReportStatus/', {
      penalty_type: 'FPN', report_ref: 'ref',
    }, 0, 'CheckReport');
    expect(await service.downloadReport('FPN', 'ref')).to.deep.equal({ result: 'synthetic' });
    sinon.assert.calledWithExactly(service.httpClient.post, 'downloadReport/', {
      penalty_type: 'FPN', report_ref: 'ref',
    }, 0, 'DownloadReport');
  });
});
