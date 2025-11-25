module.exports = {
  // 測試環境
  testEnvironment: 'node',

  // 測試文件匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],

  // 覆蓋率收集
  collectCoverageFrom: [
    'functions/**/*.js',
    '!functions/**/node_modules/**',
    '!functions/**/*.test.js'
  ],

  // 覆蓋率報告
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // 測試超時時間（毫秒）
  testTimeout: 10000,

  // 忽略的路徑
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.netlify/'
  ],

  // 模組路徑映射
  moduleDirectories: ['node_modules', 'functions'],

  // 清除 mock
  clearMocks: true,

  // 詳細輸出
  verbose: true
};

