/**
 * LINE Bot Client 管理器
 * 統一管理 LINE Bot SDK Client
 */

const line = require('@line/bot-sdk');

/**
 * 取得 LINE Bot Client
 * @returns {line.Client} LINE Bot Client 實例
 */
function getClient() {
  const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
  };

  if (!config.channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN 環境變數未設置');
  }

  if (!config.channelSecret) {
    throw new Error('LINE_CHANNEL_SECRET 環境變數未設置');
  }

  return new line.Client(config);
}

module.exports = {
  getClient
};

