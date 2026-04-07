import type { TFunction } from 'i18next';

/** Maps Firebase Auth error codes to i18n keys for sign-in. */
export function loginErrorMessage(err: unknown, t: TFunction): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: string }).code)
      : '';
  switch (code) {
    case 'auth/too-many-requests':
      return t('tooManyRequests');
    case 'auth/network-request-failed':
      return t('networkError');
    case 'auth/user-disabled':
      return t('accountDisabled');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return t('loginFailed');
    default:
      return t('loginFailed');
  }
}
