export const getCookie = (name) => {
  // eslint-disable-next-line
  const matches = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1')}=([^;]*)`));
  return matches ? decodeURIComponent(matches[1]) : undefined;
};

export const setAnalyticsTracking = () => {
  const analyticsStatus = getCookie('cm-user-preferences') !== undefined
    ? JSON.parse(getCookie('cm-user-preferences')).analytics
    : 'off';

  if (analyticsStatus === 'off') {
    window['ga-disable-UA-124455500-2'] = true;
  } else {
    window['ga-disable-UA-124455500-2'] = false;
  }
};
