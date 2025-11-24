/**
 * Rich Menu 配置與管理
 * 統一管理 Rich Menu 的創建、上傳、設置
 */

const { getClient } = require('./client');

/**
 * 股市大亨 Rich Menu 配置
 */
const STOCK_RICH_MENU = {
  size: {
    width: 2500,
    height: 843,
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
        height: 843,
      },
      action: {
        type: 'message',
        label: '台股分析',
        text: '📊 台股分析',
      },
    },
    // 中：美股分析
    {
      bounds: {
        x: 833,
        y: 0,
        width: 834,
        height: 843,
      },
      action: {
        type: 'message',
        label: '美股分析',
        text: '美股',
      },
    },
    // 右：查看評分
    {
      bounds: {
        x: 1667,
        y: 0,
        width: 833,
        height: 843,
      },
      action: {
        type: 'message',
        label: '查看評分',
        text: '📊 查看評分',
      },
    },
  ],
};

/**
 * 創建 Rich Menu
 * @param {Object} richMenu - Rich Menu 配置
 * @returns {Promise<string>} Rich Menu ID
 */
async function createRichMenu(richMenu = STOCK_RICH_MENU) {
  try {
    const client = getClient();
    const richMenuId = await client.createRichMenu(richMenu);
    console.log(`✅ Rich Menu created: ${richMenuId}`);
    return richMenuId;
  } catch (error) {
    console.error('❌ Error creating Rich Menu:', error);
    throw error;
  }
}

/**
 * 上傳 Rich Menu 圖片
 * @param {string} richMenuId - Rich Menu ID
 * @param {Buffer} imageBuffer - 圖片 Buffer
 * @returns {Promise<void>}
 */
async function uploadRichMenuImage(richMenuId, imageBuffer) {
  try {
    const client = getClient();
    await client.setRichMenuImage(richMenuId, imageBuffer, 'image/png');
    console.log(`✅ Rich Menu image uploaded: ${richMenuId}`);
  } catch (error) {
    console.error(`❌ Error uploading Rich Menu image:`, error);
    throw error;
  }
}

/**
 * 設定預設 Rich Menu
 * @param {string} richMenuId - Rich Menu ID
 * @returns {Promise<void>}
 */
async function setDefaultRichMenu(richMenuId) {
  try {
    const client = getClient();
    await client.setDefaultRichMenu(richMenuId);
    console.log(`✅ Default Rich Menu set: ${richMenuId}`);
  } catch (error) {
    console.error(`❌ Error setting default Rich Menu:`, error);
    throw error;
  }
}

/**
 * 刪除 Rich Menu
 * @param {string} richMenuId - Rich Menu ID
 * @returns {Promise<void>}
 */
async function deleteRichMenu(richMenuId) {
  try {
    const client = getClient();
    await client.deleteRichMenu(richMenuId);
    console.log(`✅ Rich Menu deleted: ${richMenuId}`);
  } catch (error) {
    console.error(`❌ Error deleting Rich Menu:`, error);
    throw error;
  }
}

/**
 * 取得所有 Rich Menu
 * @returns {Promise<Array>} Rich Menu 列表
 */
async function getRichMenuList() {
  try {
    const client = getClient();
    const richMenus = await client.getRichMenuList();
    return richMenus;
  } catch (error) {
    console.error('❌ Error getting Rich Menu list:', error);
    throw error;
  }
}

module.exports = {
  STOCK_RICH_MENU,
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
  deleteRichMenu,
  getRichMenuList,
};

