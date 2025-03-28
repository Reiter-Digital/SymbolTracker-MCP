module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  // Set a longer timeout for tests that execute the node process
  testTimeout: 30000, // 30 seconds
};
