import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // Fires on the "read a browser value on mount, then setState" pattern used
      // by ThemeToggle, ConsentBanner, Reveal and the auth provider. That pattern
      // is deliberate — it keeps the server and client renders identical — so
      // this is a performance hint here, not a correctness bug.
      // Revisit by moving those reads to useSyncExternalStore.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
