/**
 * Rich Menu 設置 API
 * Netlify Function 端點
 * 
 * 端點：/.netlify/functions/rich-menu-setup
 * 方法：POST, GET
 */

const {
  STOCK_RICH_MENU,
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
  deleteRichMenu,
  getRichMenuList,
} = require('../lib/line/rich-menu');

const {
  generateStaticRichMenuImage,
  generateDynamicRichMenuImage,
} = require('../lib/line/rich-menu-image');

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // 設置 CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // 處理 OPTIONS 請求（CORS preflight）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // GET 請求：返回 API 說明
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'LINE Rich Menu 設置 API',
        usage: {
          method: 'POST',
          endpoint: '/.netlify/functions/rich-menu-setup',
          body: {
            action: 'setup | upload | list | delete',
            mode: 'static | dynamic (僅用於 setup)',
            avgScore: '平均評分（僅用於 dynamic mode）',
            totalVotes: '總投票數（僅用於 dynamic mode）',
            richMenuId: 'Rich Menu ID（僅用於 delete）',
          },
        },
        examples: [
          {
            description: '設置靜態 Rich Menu（推薦）',
            request: {
              method: 'POST',
              body: { action: 'setup', mode: 'static' },
            },
          },
          {
            description: '設置動態 Rich Menu（顯示評分）',
            request: {
              method: 'POST',
              body: { action: 'setup', mode: 'dynamic', avgScore: 4.5, totalVotes: 10 },
            },
          },
          {
            description: '列出所有 Rich Menu',
            request: {
              method: 'POST',
              body: { action: 'list' },
            },
          },
          {
            description: '刪除 Rich Menu',
            request: {
              method: 'POST',
              body: { action: 'delete', richMenuId: 'richmenu-xxxxx' },
            },
          },
        ],
      }),
    };
  }

  // POST 請求：處理 Rich Menu 操作
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { action, mode, avgScore, totalVotes, richMenuId, imageBase64 } = body;

      // 如果有 base64 圖片，轉換為 Buffer
      let customImageBuffer = null;
      if (imageBase64) {
        customImageBuffer = Buffer.from(imageBase64, 'base64');
        console.log(`📦 收到自訂圖片，大小：${(customImageBuffer.length / 1024).toFixed(2)} KB`);
      }

      // 列出所有 Rich Menu
      if (action === 'list') {
        const richMenus = await getRichMenuList();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            richMenus,
            count: richMenus.length,
          }),
        };
      }

      // 刪除 Rich Menu
      if (action === 'delete') {
        if (!richMenuId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: '請提供 richMenuId',
            }),
          };
        }

        await deleteRichMenu(richMenuId);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Rich Menu 已刪除',
            richMenuId,
          }),
        };
      }

      // 設置 Rich Menu
      if (action === 'setup' || !action) {
        const results = {
          action: 'setup',
          mode: mode || 'static',
          success: true,
          steps: [],
        };

        try {
          // 步驟 1：創建 Rich Menu
          results.steps.push({ step: 1, action: 'Creating Rich Menu...', status: 'processing' });
          const newRichMenuId = await createRichMenu(STOCK_RICH_MENU);
          results.richMenuId = newRichMenuId;
          results.steps[0].status = 'success';
          results.steps[0].richMenuId = newRichMenuId;

          // 步驟 2：生成或使用圖片
          results.steps.push({ step: 2, action: 'Generating Rich Menu image...', status: 'processing' });
          let finalImageBuffer;

          if (mode === 'custom' && customImageBuffer) {
            // 使用上傳的自訂圖片
            finalImageBuffer = customImageBuffer;
            results.imageSource = 'custom';
            console.log('✅ 使用自訂圖片');
          } else if (mode === 'dynamic' && avgScore !== undefined && totalVotes !== undefined) {
            // 生成動態圖片（顯示評分）
            finalImageBuffer = await generateDynamicRichMenuImage(avgScore, totalVotes);
            results.scoreInfo = { avgScore, totalVotes };
            results.imageSource = 'dynamic';
            console.log('✅ 生成動態圖片');
          } else {
            // 生成靜態圖片（預設）
            finalImageBuffer = await generateStaticRichMenuImage();
            results.imageSource = 'static';
            console.log('✅ 生成靜態圖片');
          }
          results.steps[1].status = 'success';
          results.steps[1].imageSize = finalImageBuffer.length;
          results.steps[1].imageSizeKB = (finalImageBuffer.length / 1024).toFixed(2);

          // 步驟 3：上傳圖片
          results.steps.push({ step: 3, action: 'Uploading Rich Menu image...', status: 'processing' });
          await uploadRichMenuImage(newRichMenuId, finalImageBuffer);
          results.steps[2].status = 'success';

          // 步驟 4：設定為預設 Rich Menu
          results.steps.push({ step: 4, action: 'Setting as default Rich Menu...', status: 'processing' });
          await setDefaultRichMenu(newRichMenuId);
          results.steps[3].status = 'success';

          results.message = '✅ Rich Menu 設置成功！';
          results.summary = {
            richMenuId: newRichMenuId,
            menuName: STOCK_RICH_MENU.name,
            chatBarText: STOCK_RICH_MENU.chatBarText,
            areas: STOCK_RICH_MENU.areas.length,
          };

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(results),
          };
        } catch (error) {
          console.error('Error setting up Rich Menu:', error);
          results.success = false;
          results.error = error.message || '設置失敗';
          results.errorDetails = error.toString();

          return {
            statusCode: 500,
            headers,
            body: JSON.stringify(results),
          };
        }
      }

      // 未知的 action
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '未知的 action，請使用 setup, list, 或 delete',
        }),
      };
    } catch (error) {
      console.error('Error processing request:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message || '系統錯誤',
        }),
      };
    }
  }

  // 不支援的方法
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({
      success: false,
      error: '不支援的 HTTP 方法',
    }),
  };
};

