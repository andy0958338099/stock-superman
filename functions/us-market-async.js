/**
 * 美股分析異步處理模組
 * 實現異步分析 + 輪詢機制，避免超時問題
 */

const axios = require('axios');
const { supabase } = require('./supabase-client');
const { analyzeUSMarket } = require('./us-market-analysis');

/**
 * 分析狀態
 */
const AnalysisStatus = {
  PENDING: 'pending',      // 等待中
  PROCESSING: 'processing', // 處理中
  COMPLETED: 'completed',   // 已完成
  FAILED: 'failed'          // 失敗
};

/**
 * 創建美股分析任務
 * @param {string} userId - 用戶 ID
 * @returns {Promise<string>} - 任務 ID
 */
async function createUSMarketAnalysisTask(userId) {
  try {
    const taskId = `us_market_${userId}_${Date.now()}`;
    
    const { error } = await supabase
      .from('us_market_analysis_tasks')
      .insert({
        task_id: taskId,
        user_id: userId,
        status: AnalysisStatus.PENDING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    console.log(`✅ 創建美股分析任務：${taskId}`);
    return taskId;

  } catch (error) {
    console.error('❌ 創建美股分析任務失敗:', error);
    throw error;
  }
}

/**
 * 更新任務狀態
 * @param {string} taskId - 任務 ID
 * @param {string} status - 狀態
 * @param {object} result - 分析結果（可選）
 * @param {string} error - 錯誤訊息（可選）
 * @returns {Promise<boolean>}
 */
async function updateTaskStatus(taskId, status, result = null, error = null) {
  try {
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (result) {
      updateData.result = result;
      updateData.completed_at = new Date().toISOString();
    }

    if (error) {
      updateData.error_message = error;
    }

    const { error: dbError } = await supabase
      .from('us_market_analysis_tasks')
      .update(updateData)
      .eq('task_id', taskId);

    if (dbError) throw dbError;

    console.log(`✅ 更新任務狀態：${taskId} → ${status}`);
    return true;

  } catch (err) {
    console.error('❌ 更新任務狀態失敗:', err);
    return false;
  }
}

/**
 * 取得任務狀態
 * @param {string} taskId - 任務 ID
 * @returns {Promise<object|null>}
 */
async function getTaskStatus(taskId) {
  try {
    const { data, error } = await supabase
      .from('us_market_analysis_tasks')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (error) throw error;

    return data;

  } catch (error) {
    console.error('❌ 取得任務狀態失敗:', error);
    return null;
  }
}

/**
 * 取得用戶最新的分析任務
 * @param {string} userId - 用戶 ID
 * @returns {Promise<object|null>}
 */
async function getUserLatestTask(userId) {
  try {
    const { data, error } = await supabase
      .from('us_market_analysis_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];

  } catch (error) {
    console.error('❌ 取得用戶最新任務失敗:', error);
    return null;
  }
}

/**
 * 執行美股分析（異步）
 * 通過調用獨立的 Worker Function 來執行分析
 * @param {string} taskId - 任務 ID
 */
async function executeUSMarketAnalysis(taskId) {
  try {
    console.log(`🚀 觸發美股分析 Worker：${taskId}`);

    // 獲取當前部署的 URL
    const baseUrl = process.env.URL || 'https://stock-superman.netlify.app';
    const workerUrl = `${baseUrl}/.netlify/functions/us-market-analysis-worker`;

    console.log(`📡 調用 Worker URL: ${workerUrl}`);

    // 調用 Worker Function（不等待結果）
    axios.post(workerUrl, { taskId }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000  // 5 秒超時（只是觸發，不等待完成）
    }).catch(err => {
      console.error('❌ 調用 Worker 失敗:', err.message);
    });

    console.log(`✅ Worker 已觸發：${taskId}`);

  } catch (error) {
    console.error(`❌ 觸發 Worker 失敗：${taskId}`, error);
    await updateTaskStatus(taskId, AnalysisStatus.FAILED, null, error.message);
  }
}

module.exports = {
  AnalysisStatus,
  createUSMarketAnalysisTask,
  updateTaskStatus,
  getTaskStatus,
  getUserLatestTask,
  executeUSMarketAnalysis
};

