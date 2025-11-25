/**
 * FinMind API 測試
 */

// Mock axios to avoid real API calls
jest.mock('axios');
const axios = require('axios');

const { 
  fetchStockPrice, 
  fetchStockInfo,
  fetchExchangeRate,
  fetchVIX
} = require('../functions/finmind');

describe('FinMind API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchStockPrice', () => {
    test('應該成功抓取股價資料', async () => {
      const mockResponse = {
        data: {
          data: [
            { date: '2024-01-01', open: 100, high: 105, low: 95, close: 102, Trading_Volume: 10000 },
            { date: '2024-01-02', open: 102, high: 108, low: 100, close: 106, Trading_Volume: 12000 }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchStockPrice('2330', '2024-01-01', '2024-01-02');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('close');
      expect(result[0].close).toBe(102);
    });

    test('資料為空時應該返回 null', async () => {
      axios.get.mockResolvedValue({ data: { data: [] } });

      const result = await fetchStockPrice('9999', '2024-01-01', '2024-01-02');

      expect(result).toBeNull();
    });

    test('API 錯誤時應該拋出異常', async () => {
      axios.get.mockRejectedValue(new Error('API Error'));

      await expect(fetchStockPrice('2330', '2024-01-01', '2024-01-02'))
        .rejects.toThrow();
    });
  });

  describe('fetchStockInfo', () => {
    test('應該成功抓取股票資訊', async () => {
      const mockResponse = {
        data: {
          data: [
            { stock_id: '2330', stock_name: '台積電', industry_category: '半導體業' }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchStockInfo('2330');

      expect(result).toHaveProperty('stock_id');
      expect(result).toHaveProperty('stock_name');
      expect(result.stock_name).toBe('台積電');
    });

    test('查無資料時應該返回 null', async () => {
      axios.get.mockResolvedValue({ data: { data: [] } });

      const result = await fetchStockInfo('9999');

      expect(result).toBeNull();
    });
  });

  describe('fetchExchangeRate', () => {
    test('應該成功抓取匯率資料', async () => {
      const mockResponse = {
        data: {
          data: [
            { date: '2024-01-01', spot_sell: 31.5, spot_buy: 31.3 },
            { date: '2024-01-02', spot_sell: 31.6, spot_buy: 31.4 }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchExchangeRate('2024-01-01', '2024-01-02');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('rate');
      expect(result[0].rate).toBe(31.5);
    });
  });

  describe('fetchVIX', () => {
    test('應該成功抓取 VIX 資料', async () => {
      const mockResponse = {
        data: {
          data: [
            { date: '2024-01-01', Close: 20.5 },
            { date: '2024-01-02', Close: 21.2 }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchVIX('2024-01-01', '2024-01-02');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('close');
      expect(result[0].close).toBe(20.5);
    });
  });
});

