module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
  // jest-resolve doesn't pick up package.json "exports" for test-renderer;
  // map it directly to its CJS entry point.
  moduleNameMapper: {
    '^test-renderer$': '<rootDir>/node_modules/test-renderer/dist/index.cjs',
  },
};
