import * as cookieManager from '@dvsa/cookie-manager';
import { cookieManagerConfig } from '../../server/cookie-management/cookie-manager-config';
import * as cookieControl from '../../server/cookie-management/cookie-control';

cookieManager.init(cookieManagerConfig);
cookieControl.setAnalyticsTracking();
cookieControl.peferencesConfirmationBack();