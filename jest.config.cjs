const nextJest = require('next/jest.js');
const path = require('path');
const dotenv = require('dotenv');

// .env.localファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load the .env.local and the .env files in your test environment
  dir: './',
});

// Jestに渡すカスタム設定
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jest-environment-jsdom',
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironmentOptions: {
    customExportConditions: [''],
    pretendToBeVisual: true,
    // Radix UIのポップオーバーやモーダルをサポート
    url: 'http://localhost',
    userAgent: 'node',
  },
  // テストの実行順序を安定させるための設定
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/tests/'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you by createJestConfig in the future)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/src/$1',
    '^@/components/ui/(.*)$': '<rootDir>/src/components/ui/$1',
  },
  transform: {
    // Use babel-jest for transforming files, especially for ESM support
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  // テストの実行を安定させるための設定
  maxConcurrency: 1,
  // act()の警告をより適切に処理するための設定
  verbose: true,
  testTimeout: 10000,
  maxWorkers: '50%',
};

// createJestConfigは、非同期のNext.jsの設定を読み込むために使用
module.exports = createJestConfig(config);
