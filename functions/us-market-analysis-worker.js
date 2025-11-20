/**
 * 美股分析 Worker Function
 * 獨立的 Function 用於執行美股分析任務
 * 由 line-webhook 通過 HTTP 請求觸發
 */

const { analyzeUSMarket } = require('./us-market-analysis');
const { updateTaskStatus, getTaskStatus, AnalysisStatus } = require('./us-market-async');

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // 設置較長的超時時間
  context.callbackWaitsForEmptyEventLoop = false;

  // 只接受 POST 請求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // 解析請求體
    const { taskId } = JSON.parse(event.body);

    if (!taskId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing taskId' })
      };
    }

    console.log(`🚀 Worker 開始執行美股分析任務：${taskId}`);

    // 檢查任務是否存在
    const task = await getTaskStatus(taskId);
    if (!task) {
      console.error(`❌ 找不到任務：${taskId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Task not found' })
      };
    }

    // 更新狀態為處理中
    await updateTaskStatus(taskId, AnalysisStatus.PROCESSING);
    console.log(`✅ 任務狀態已更新為 PROCESSING：${taskId}`);

    // 執行分析
    console.log(`📊 開始執行美股分析...`);
    const result = await analyzeUSMarket();
    console.log(`✅ 美股分析完成`);

    // 更新狀態為已完成
    await updateTaskStatus(taskId, AnalysisStatus.COMPLETED, result);
    console.log(`✅ 任務狀態已更新為 COMPLETED：${taskId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        taskId: taskId,
        message: 'Analysis completed'
      })
    };

  } catch (error) {
    console.error('❌ Worker 執行失敗:', error);

    // 嘗試更新任務狀態為失敗
    try {
      const { taskId } = JSON.parse(event.body);
      if (taskId) {
        await updateTaskStatus(taskId, AnalysisStatus.FAILED, null, error.message);
        console.log(`✅ 任務狀態已更新為 FAILED：${taskId}`);
      }
    } catch (updateError) {
      console.error('❌ 更新失敗狀態時出錯:', updateError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

