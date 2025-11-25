/**
 * 技術指標測試
 */

const { calculateKD, calculateMACD, calculateMA } = require('../functions/indicators');

describe('技術指標計算', () => {
  // 測試資料：模擬 10 天股價
  const mockPriceData = [
    { date: '2024-01-01', high: 105, low: 95, close: 100 },
    { date: '2024-01-02', high: 110, low: 100, close: 108 },
    { date: '2024-01-03', high: 115, low: 105, close: 110 },
    { date: '2024-01-04', high: 112, low: 102, close: 105 },
    { date: '2024-01-05', high: 108, low: 98, close: 100 },
    { date: '2024-01-06', high: 105, low: 95, close: 98 },
    { date: '2024-01-07', high: 102, low: 92, close: 95 },
    { date: '2024-01-08', high: 100, low: 90, close: 92 },
    { date: '2024-01-09', high: 98, low: 88, close: 90 },
    { date: '2024-01-10', high: 95, low: 85, close: 88 }
  ];

  describe('calculateKD', () => {
    test('應該返回 KD 指標物件', () => {
      const result = calculateKD(mockPriceData);
      
      expect(result).toHaveProperty('k');
      expect(result).toHaveProperty('d');
      expect(result).toHaveProperty('status');
    });

    test('K 和 D 值應該在 0-100 之間', () => {
      const result = calculateKD(mockPriceData);
      
      expect(result.k).toBeGreaterThanOrEqual(0);
      expect(result.k).toBeLessThanOrEqual(100);
      expect(result.d).toBeGreaterThanOrEqual(0);
      expect(result.d).toBeLessThanOrEqual(100);
    });

    test('狀態應該是有效的字串', () => {
      const result = calculateKD(mockPriceData);
      const validStatuses = ['金叉', '死叉', '超買', '超賣', '中性'];
      
      expect(validStatuses).toContain(result.status);
    });

    test('資料不足時應該返回 null', () => {
      const insufficientData = mockPriceData.slice(0, 5);
      const result = calculateKD(insufficientData);
      
      expect(result).toBeNull();
    });
  });

  describe('calculateMACD', () => {
    test('應該返回 MACD 指標物件', () => {
      const result = calculateMACD(mockPriceData);
      
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('histogram');
      expect(result).toHaveProperty('status');
    });

    test('MACD 值應該是數字', () => {
      const result = calculateMACD(mockPriceData);
      
      expect(typeof result.macd).toBe('number');
      expect(typeof result.signal).toBe('number');
      expect(typeof result.histogram).toBe('number');
    });

    test('狀態應該是有效的字串', () => {
      const result = calculateMACD(mockPriceData);
      const validStatuses = ['多頭', '空頭', '轉強', '轉弱', '中性'];
      
      expect(validStatuses).toContain(result.status);
    });

    test('資料不足時應該返回 null', () => {
      const insufficientData = mockPriceData.slice(0, 20);
      const result = calculateMACD(insufficientData);
      
      expect(result).toBeNull();
    });
  });

  describe('calculateMA', () => {
    test('應該返回 MA 陣列', () => {
      const result = calculateMA(mockPriceData, 5);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(mockPriceData.length);
    });

    test('MA 值應該是數字或 null', () => {
      const result = calculateMA(mockPriceData, 5);
      
      result.forEach(value => {
        expect(value === null || typeof value === 'number').toBe(true);
      });
    });

    test('前 N-1 個值應該是 null', () => {
      const period = 5;
      const result = calculateMA(mockPriceData, period);
      
      for (let i = 0; i < period - 1; i++) {
        expect(result[i]).toBeNull();
      }
    });

    test('MA 值應該是正確的平均值', () => {
      const period = 3;
      const result = calculateMA(mockPriceData, period);
      
      // 檢查第 3 個值（index 2）
      const expectedMA = (100 + 108 + 110) / 3;
      expect(result[2]).toBeCloseTo(expectedMA, 2);
    });
  });
});

