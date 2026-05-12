export type ZApiSendResult = {
  success: boolean;
  messageId?: string;
  timestamp?: Date;
  error?: string;
  mock: boolean;
};
