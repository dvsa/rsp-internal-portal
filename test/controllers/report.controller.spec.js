import { expect } from 'chai';
import sinon from 'sinon';
import * as reportController from '../../src/server/controllers/report.controller';
import CpmsService from '../../src/server/services/cpms.service';

describe('report controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: { report_ref: 'synthetic-report' },
      session: { rsp_user: { email: 'synthetic@example.test' }, rsp_user_role: 'BankingFinance' },
    };
    res = {
      render: sinon.spy(),
      redirect: sinon.spy(),
      status: sinon.stub().returnsThis(),
      send: sinon.spy(),
      set: sinon.spy(),
      setHeader: sinon.spy(),
      end: sinon.spy(),
    };
  });

  afterEach(() => sinon.restore());

  it('renders the available report filters and validation message', async () => {
    sinon.stub(CpmsService.prototype, 'getReportTypes').resolves([{ code: 'test' }]);
    req.query = { failure: '', type: 'cpmsError' };
    await reportController.renderReportFilters(req, res);
    expect(res.render.firstCall.args[0]).to.equal('reports/generateReport');
    expect(res.render.firstCall.args[1]).to.include({
      invalidDateRange: true,
      dateValidationMessage: 'There was a server error. Please try again later.',
    });
  });

  it('requests a report with inclusive date boundaries', async () => {
    const request = sinon.stub(CpmsService.prototype, 'requestReport').resolves({ code: '000', reference: 'ref' });
    req.body = {
      dateFrom: '2020-01-01', dateTo: '2020-01-02', penaltyType: 'FPN', reportCode: 'test',
    };
    await reportController.generateReport(req, res);
    sinon.assert.calledWithExactly(request, 'FPN', 'test', '2020-01-01 00:00:00', '2020-01-02 23:59:00');
    sinon.assert.calledWith(res.render, 'reports/generatingReport', sinon.match({ reportReference: 'ref' }));
  });

  it('redirects on invalid dates without requesting a report', async () => {
    const request = sinon.stub(CpmsService.prototype, 'requestReport');
    req.body = { dateFrom: '2020-02-01', dateTo: '2020-01-01' };
    await reportController.generateReport(req, res);
    sinon.assert.notCalled(request);
    sinon.assert.calledWith(res.redirect, 'reports?failure&type=startAfterEnd');
  });

  it('redirects when the report request fails', async () => {
    sinon.stub(CpmsService.prototype, 'requestReport').rejects(new Error('synthetic failure'));
    req.body = { dateFrom: '2020-01-01', dateTo: '2020-01-02' };
    await reportController.generateReport(req, res);
    sinon.assert.calledWith(res.redirect, 'reports?failure&type=cpmsError');
  });

  it('returns report status or an error response', async () => {
    const status = sinon.stub(CpmsService.prototype, 'checkReportStatus');
    status.onFirstCall().resolves({ completed: false });
    status.onSecondCall().rejects(new Error('synthetic failure'));
    req.query.penalty_type = 'FPN';
    await reportController.checkReportStatus(req, res);
    sinon.assert.calledWithExactly(status, 'FPN', 'synthetic-report');
    sinon.assert.calledWith(res.send, { completed: false });
    await reportController.checkReportStatus(req, res);
    sinon.assert.calledWith(res.status, 500);
  });

  it('renders completed report details and redirects pending reports', async () => {
    const status = sinon.stub(CpmsService.prototype, 'checkReportStatus');
    status.onFirstCall().resolves({ completed: true, report_type: 'Example Report', file_extension: 'csv' });
    status.onSecondCall().resolves({ completed: false });
    req.query.penalty_type = 'FPN';
    await reportController.showDetails(req, res);
    sinon.assert.calledWith(res.render, 'reports/downloadReport', sinon.match({
      filename: sinon.match(/^Example_Report_\d{4}-\d{2}-\d{2}\.csv$/),
    }));
    await reportController.showDetails(req, res);
    sinon.assert.calledWith(res.redirect, '/reports/synthetic-report/status?penalty_type=FPN');
  });

  it('returns an error when report details cannot be fetched', async () => {
    sinon.stub(CpmsService.prototype, 'checkReportStatus').rejects(new Error('synthetic failure'));
    await reportController.showDetails(req, res);
    sinon.assert.calledWith(res.status, 500);
  });

  it('downloads the response with the requested filename', async () => {
    const download = sinon.stub(CpmsService.prototype, 'downloadReport').resolves('synthetic csv');
    req.query = { penalty_type: 'FPN', filename: 'report.csv' };
    await reportController.downloadReport(req, res);
    sinon.assert.calledWithExactly(download, 'FPN', 'synthetic-report');
    sinon.assert.calledWith(res.setHeader, 'Content-disposition', 'attachment; filename=report.csv');
    sinon.assert.calledWith(res.end, 'synthetic csv');
  });

  it('returns a 500 response when the report download fails', async () => {
    const download = sinon.stub(CpmsService.prototype, 'downloadReport').rejects(new Error('synthetic failure'));
    req.query = { penalty_type: 'FPN', filename: 'report.csv' };

    await reportController.downloadReport(req, res);

    sinon.assert.calledOnceWithExactly(download, 'FPN', 'synthetic-report');
    sinon.assert.calledOnceWithExactly(res.status, 500);
    sinon.assert.calledOnceWithExactly(res.send);
    sinon.assert.notCalled(res.setHeader);
    sinon.assert.notCalled(res.end);
  });
});
