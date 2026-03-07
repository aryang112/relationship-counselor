import * as Linking from 'expo-linking';

const PREFIX = 'relationcounselor://';

export function parseDeepLink(url: string): { screen: string; params: Record<string, string> } | null {
  if (!url.startsWith(PREFIX)) return null;

  const path = url.replace(PREFIX, '');
  const [screen, ...rest] = path.split('/');

  switch (screen) {
    case 'invite':
      return { screen: 'AcceptInvite', params: { token: rest[0] || '' } };
    case 'session':
      return { screen: 'SessionDetail', params: { id: rest[0] || '' } };
    case 'interview':
      return { screen: 'Interview', params: { sessionId: rest[0] || '' } };
    case 'unpacking':
      return { screen: 'Unpacking', params: { sessionId: rest[0] || '' } };
    default:
      return null;
  }
}

export function getInitialUrl(): Promise<string | null> {
  return Linking.getInitialURL();
}

export function addDeepLinkListener(
  callback: (url: string) => void,
): { remove: () => void } {
  const subscription = Linking.addEventListener('url', ({ url }) => callback(url));
  return subscription;
}
