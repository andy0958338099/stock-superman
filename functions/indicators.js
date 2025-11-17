/**
 * Technical Indicators Module
 * 計算技術指標：KD、MACD、MA
 */

/**
 * 計算 KD 指標（隨機指標）
 * @param {Array} data - 股價資料陣列（需包含 high, low, close）
 * @returns {object} - { K, D, RSV } 陣列
 */
function calculateKD(data) {
  const RSV = [];
  const K = [];
  const D = [];
  
  let prevK = 50; // 初始 K 值
  let prevD = 50; // 初始 D 值
  
  for (let i = 0; i < data.length; i++) {
    // 取最近 9 天的資料（包含當天）
    const startIdx = Math.max(0, i - 8);
    const slice = data.slice(startIdx, i + 1);
    
    // 計算 9 日最高價與最低價
    const high9 = Math.max(...slice.map(d => d.high));
    const low9 = Math.min(...slice.map(d => d.low));
    
    // 計算 RSV（未成熟隨機值）
    const denom = (high9 - low9) === 0 ? 1 : (high9 - low9);
    const rsv = ((data[i].close - low9) / denom) * 100;
    
    // 計算 K 值：K = 前一日K × 2/3 + 當日RSV × 1/3
    const kValue = prevK * (2/3) + rsv * (1/3);
    
    // 計算 D 值：D = 前一日D × 2/3 + 當日K × 1/3
    const dValue = prevD * (2/3) + kValue * (1/3);
    
    RSV.push(rsv);
    K.push(kValue);
    D.push(dValue);
    
    prevK = kValue;
    prevD = dValue;
  }
  
  return { K, D, RSV };
}

/**
 * 計算 EMA（指數移動平均）
 * @param {number} period - 週期
 * @param {Array} values - 數值陣列
 * @returns {Array} - EMA 陣列
 */
function calculateEMA(period, values) {
  const k = 2 / (period + 1);
  const ema = [];
  
  // 第一個值使用 SMA
  let sum = 0;
  for (let i = 0; i < Math.min(period, values.length); i++) {
    sum += values[i];
  }
  ema[0] = sum / Math.min(period, values.length);
  
  // 後續使用 EMA 公式
  for (let i = 1; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }
  
  return ema;
}

/**
 * 計算 MACD 指標
 * @param {Array} data - 股價資料陣列（需包含 close）
 * @returns {object} - { MACD, Signal, Histogram }
 */
function calculateMACD(data) {
  const close = data.map(d => d.close);
  
  // 計算 EMA12 和 EMA26
  const ema12 = calculateEMA(12, close);
  const ema26 = calculateEMA(26, close);
  
  // 計算 MACD = EMA12 - EMA26
  const MACD = close.map((_, i) => (ema12[i] || 0) - (ema26[i] || 0));
  
  // 計算 Signal = EMA9(MACD)
  const Signal = calculateEMA(9, MACD);
  
  // 計算 Histogram = MACD - Signal
  const Histogram = MACD.map((v, i) => v - (Signal[i] || 0));
  
  return { MACD, Signal, Histogram };
}

/**
 * 計算移動平均線（MA）
 * @param {Array} values - 數值陣列
 * @param {number} period - 週期
 * @returns {Array} - MA 陣列（前面不足週期的為 null）
 */
function calculateMA(values, period) {
  const ma = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      ma.push(null);
      continue;
    }
    
    const slice = values.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    ma.push(sum / period);
  }
  
  return ma;
}

/**
 * 分析 KD 指標狀態
 * @param {Array} K - K 值陣列
 * @param {Array} D - D 值陣列
 * @returns {object} - 分析結果
 */
function analyzeKD(K, D) {
  const lastIdx = K.length - 1;
  const prevIdx = lastIdx - 1;
  
  const currentK = K[lastIdx];
  const currentD = D[lastIdx];
  const prevK = K[prevIdx];
  const prevD = D[prevIdx];
  
  let signal = '中性';
  let description = '';
  
  // 判斷金叉或死叉
  if (prevK <= prevD && currentK > currentD) {
    signal = '金叉';
    description = 'K 線向上穿越 D 線，短期偏多訊號';
  } else if (prevK >= prevD && currentK < currentD) {
    signal = '死叉';
    description = 'K 線向下穿越 D 線，短期偏空訊號';
  } else if (currentK > currentD) {
    signal = '多頭';
    description = 'K 線在 D 線上方';
  } else if (currentK < currentD) {
    signal = '空頭';
    description = 'K 線在 D 線下方';
  }
  
  // 判斷超買超賣
  if (currentK > 80 && currentD > 80) {
    description += '，處於超買區';
  } else if (currentK < 20 && currentD < 20) {
    description += '，處於超賣區';
  }
  
  return {
    signal,
    description,
    K: currentK.toFixed(2),
    D: currentD.toFixed(2)
  };
}

/**
 * 分析 MACD 指標狀態
 * @param {Array} MACD - MACD 陣列
 * @param {Array} Signal - Signal 陣列
 * @param {Array} Histogram - Histogram 陣列
 * @returns {object} - 分析結果
 */
function analyzeMACDSignal(MACD, Signal, Histogram) {
  const lastIdx = MACD.length - 1;
  const prevIdx = lastIdx - 1;
  
  const currentMACD = MACD[lastIdx];
  const currentSignal = Signal[lastIdx];
  const currentHist = Histogram[lastIdx];
  const prevHist = Histogram[prevIdx];
  
  let signal = '中性';
  let description = '';
  
  // 判斷金叉或死叉
  if (prevHist <= 0 && currentHist > 0) {
    signal = '金叉';
    description = 'MACD 向上穿越 Signal，偏多訊號';
  } else if (prevHist >= 0 && currentHist < 0) {
    signal = '死叉';
    description = 'MACD 向下穿越 Signal，偏空訊號';
  } else if (currentHist > 0) {
    signal = '多頭';
    description = 'MACD 在 Signal 上方';
  } else if (currentHist < 0) {
    signal = '空頭';
    description = 'MACD 在 Signal 下方';
  }
  
  // 判斷柱狀體變化
  if (Math.abs(currentHist) > Math.abs(prevHist)) {
    description += '，動能增強';
  } else {
    description += '，動能減弱';
  }
  
  return {
    signal,
    description,
    MACD: currentMACD.toFixed(2),
    Signal: currentSignal.toFixed(2),
    Histogram: currentHist.toFixed(2)
  };
}

module.exports = {
  calculateKD,
  calculateMACD,
  calculateMA,
  calculateEMA,
  analyzeKD,
  analyzeMACDSignal
};

