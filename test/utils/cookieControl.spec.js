import { expect } from 'chai';
import sinon from 'sinon';
import { getCookie, setAnalyticsTracking } from '../../src/server/cookie-management/cookie-control';
import { cookieManagerConfig } from '../../src/server/cookie-management/cookie-manager-config';
import modifyPath from '../../src/server/utils/modifyPath';

describe('cookie controls', () => {
  let oldDocument;
  let oldWindow;

  beforeEach(() => {
    oldDocument = global.document;
    oldWindow = global.window;
    global.document = { cookie: '' };
    global.window = {};
  });
  afterEach(() => {
    if (oldDocument === undefined) delete global.document;
    else global.document = oldDocument;
    if (oldWindow === undefined) delete global.window;
    else global.window = oldWindow;
  });

  it('reads and decodes exact cookie names', () => {
    global.document.cookie = 'other=value; a.b=hello%20world';
    expect(getCookie('a.b')).to.equal('hello world');
    expect(getCookie('missing')).to.equal(undefined);
  });

  it('disables analytics by default and respects an enabled preference', () => {
    setAnalyticsTracking();
    expect(global.window['ga-disable-UA-124455500-2']).to.equal(true);
    global.document.cookie = `cm-user-preferences=${encodeURIComponent(JSON.stringify({ analytics: 'on' }))}`;
    setAnalyticsTracking();
    expect(global.window['ga-disable-UA-124455500-2']).to.equal(false);
  });

  it('reveals the confirmation message after saving preferences', () => {
    const remove = sinon.spy();
    const scrollTo = sinon.spy();
    global.document.getElementById = () => ({ classList: { remove } });
    global.window.scrollTo = scrollTo;
    cookieManagerConfig['user-preference-saved-callback']();
    sinon.assert.calledWithExactly(remove, 'hidden');
    sinon.assert.calledWithExactly(scrollTo, 0, 0);
  });

  it('removes the first path segment for API Gateway events', () => {
    expect(modifyPath('/stage/robots.txt')).to.equal('/robots.txt');
    expect(modifyPath('/stage')).to.equal('/');
  });
});
