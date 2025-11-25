/**
 * Sentry 錯誤監控初始化
 */

const Sentry = require('@sentry/node');

// 從環境變數讀取 Sentry DSN
const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 初始化 Sentry（僅在生產環境且有 DSN 時）
let sentryInitialized = false;

if (SENTRY_DSN && NODE_ENV === 'production') {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: NODE_ENV,
      
      // 設定取樣率（1.0 = 100%）
      tracesSampleRate: 0.1, // 10% 的交易會被追蹤
      
      // 設定錯誤過濾
      beforeSend(event, hint) {
        // 過濾掉某些不重要的錯誤
        const error = hint.originalException;
        
        if (error && error.message) {
          // 忽略 Reply token 已使用的錯誤（正常情況）
          if (error.message.includes('Reply token 已使用')) {
            return null;
          }
          
          // 忽略 Webhook 驗證失敗（可能是惡意請求）
          if (error.message.includes('Signature 驗證失敗')) {
            return null;
          }
        }
        
        return event;
      },
      
      // 整合選項
      integrations: [
        // 自動捕獲未處理的 Promise rejection
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
    });
    
    sentryInitialized = true;
    console.log('✅ Sentry 錯誤監控已啟用');
  } catch (error) {
    console.error('❌ Sentry 初始化失敗:', error.message);
  }
} else {
  console.log('ℹ️ Sentry 未啟用（開發環境或未設定 DSN）');
}

/**
 * 捕獲錯誤並發送到 Sentry
 * @param {Error} error - 錯誤物件
 * @param {Object} context - 額外的上下文資訊
 */
function captureError(error, context = {}) {
  if (!sentryInitialized) {
    console.error('❌ 錯誤:', error);
    return;
  }
  
  try {
    Sentry.withScope((scope) => {
      // 添加額外的上下文
      if (context.user) {
        scope.setUser({ id: context.user });
      }
      
      if (context.stockId) {
        scope.setTag('stock_id', context.stockId);
      }
      
      if (context.action) {
        scope.setTag('action', context.action);
      }
      
      if (context.extra) {
        scope.setContext('extra', context.extra);
      }
      
      // 發送錯誤
      Sentry.captureException(error);
    });
  } catch (err) {
    console.error('❌ Sentry captureError 失敗:', err.message);
  }
}

/**
 * 捕獲訊息（非錯誤的重要事件）
 * @param {string} message - 訊息內容
 * @param {string} level - 嚴重程度 (info, warning, error)
 * @param {Object} context - 額外的上下文資訊
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized) {
    console.log(`[${level.toUpperCase()}] ${message}`);
    return;
  }
  
  try {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      
      if (context.user) {
        scope.setUser({ id: context.user });
      }
      
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      
      Sentry.captureMessage(message);
    });
  } catch (err) {
    console.error('❌ Sentry captureMessage 失敗:', err.message);
  }
}

/**
 * 手動刷新 Sentry（確保錯誤已發送）
 * @param {number} timeout - 超時時間（毫秒）
 */
async function flush(timeout = 2000) {
  if (!sentryInitialized) {
    return;
  }
  
  try {
    await Sentry.flush(timeout);
  } catch (err) {
    console.error('❌ Sentry flush 失敗:', err.message);
  }
}

module.exports = {
  Sentry,
  captureError,
  captureMessage,
  flush,
  isInitialized: () => sentryInitialized
};

