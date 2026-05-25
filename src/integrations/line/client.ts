import { messagingApi } from '@line/bot-sdk';
import { env } from '../../config/env.js';

const { MessagingApiClient } = messagingApi;

export const lineClient = new MessagingApiClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});

export type LineReplyMessage = messagingApi.Message;
