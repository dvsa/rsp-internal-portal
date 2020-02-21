/* eslint-disable */
export const cookieManagerConfig = {
  'delete-undefined-cookies': true,
  'user-preference-cookie-name': 'cm-user-preferences',
  'user-preference-cookie-secure': false,
  'user-preference-cookie-expiry-days': 365,
  'user-preference-configuration-form-id': 'cookie-preferences-form',
  'user-preference-saved-callback': () => {
    const cookiePreferencesConfirmation = document.getElementById('cookie-preferences-confirmation');
    cookiePreferencesConfirmation.classList.remove('hidden');
    window.scrollTo(0, 0);
  },
  'cookie-banner-id': 'global-cookie-banner',
  'cookie-banner-visibility-class': 'hidden',
  'cookie-banner-visible-on-page-with-preference-form': false,
  'set-checkboxes-in-preference-form': true,
  'cookie-manifest': [
    {
      'category-name': 'essential',
      'optional': false,
      'cookies': [
        'cm-user-preferences',
        'rsp_access',
        'rsp_refresh',
        'rsp_internal_portal_user',
        'rsp_internal_portal_user.sig',
      ],
    },
    {
      'category-name': 'analytics',
      'optional': true,
      'cookies': [
        '_gat_UA-124455500-2',
        '_ga',
        '_gid',
      ],
    },
  ],
};
