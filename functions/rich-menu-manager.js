/**
 * Rich Menu 管理器
 * 負責創建、更新和管理 LINE Rich Menu
 */

const line = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

/**
 * 創建 Rich Menu
 * @returns {Promise<string>} - Rich Menu ID
 */
async function createRichMenu() {
  try {
    console.log('🎨 開始創建 Rich Menu...');

    const richMenu = {
      size: {
        width: 2500,
        height: 843
      },
      selected: true,
      name: '股市大亨主選單',
      chatBarText: '股市大亨',
      areas: [
        // 左：台股分析
        {
          bounds: {
            x: 0,
            y: 0,
            width: 833,
            height: 843
          },
          action: {
            type: 'message',
            text: '📊 台股分析'
          }
        },
        // 中：美股分析
        {
          bounds: {
            x: 833,
            y: 0,
            width: 834,
            height: 843
          },
          action: {
            type: 'message',
            text: '美股'
          }
        },
        // 右：問卷調查（顯示評分）
        {
          bounds: {
            x: 1667,
            y: 0,
            width: 833,
            height: 843
          },
          action: {
            type: 'message',
            text: '📊 查看評分'
          }
        }
      ]
    };

    // 創建 Rich Menu
    const response = await axios.post(
      'https://api.line.me/v2/bot/richmenu',
      richMenu,
      {
        headers: {
          'Authorization': `Bearer ${config.channelAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const richMenuId = response.data.richMenuId;
    console.log(`✅ Rich Menu 創建成功：${richMenuId}`);

    return richMenuId;

  } catch (error) {
    console.error('❌ 創建 Rich Menu 失敗:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 上傳 Rich Menu 圖片
 * @param {string} richMenuId - Rich Menu ID
 * @param {Buffer} imageBuffer - 圖片 Buffer
 */
async function uploadRichMenuImage(richMenuId, imageBuffer) {
  try {
    console.log(`🖼️ 上傳 Rich Menu 圖片：${richMenuId}`);

    await axios.post(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${config.channelAccessToken}`,
          'Content-Type': 'image/png'
        }
      }
    );

    console.log('✅ Rich Menu 圖片上傳成功');

  } catch (error) {
    console.error('❌ 上傳 Rich Menu 圖片失敗:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 設定為預設 Rich Menu
 * @param {string} richMenuId - Rich Menu ID
 */
async function setDefaultRichMenu(richMenuId) {
  try {
    console.log(`🎯 設定預設 Rich Menu：${richMenuId}`);

    await axios.post(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${config.channelAccessToken}`
        }
      }
    );

    console.log('✅ 預設 Rich Menu 設定成功');

  } catch (error) {
    console.error('❌ 設定預設 Rich Menu 失敗:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu
};

