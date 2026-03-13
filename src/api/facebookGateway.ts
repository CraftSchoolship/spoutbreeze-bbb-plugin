import axios from 'axios';

const { CHAT_GATEWAY_URL } = process.env;
const PLUGIN_SECRET = process.env.PLUGIN_SHARED_SECRET || 'dev-secret';

const authHeaders = {
  'X-Internal-Auth': PLUGIN_SECRET,
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

export interface ConnectFacebookGatewayParams {
  userId: string;
  meetingId: string;
  liveStreamId: string;
  liveVideoId?: string;
  target?: string;
}

export const connectFacebookGateway = async (
  params: ConnectFacebookGatewayParams,
): Promise<void> => {
  await axios.post(
    `${CHAT_GATEWAY_URL}/platforms/facebook/connect`,
    null,
    {
      headers: authHeaders,
      params: {
        user_id: params.userId,
        meeting_id: params.meetingId,
        live_stream_id: params.liveStreamId,
        live_video_id: params.liveVideoId || params.liveStreamId,
        target: params.target || 'me',
      },
    },
  );
};

export const disconnectFacebookGateway = async (
  userId: string,
): Promise<void> => {
  await axios.post(
    `${CHAT_GATEWAY_URL}/platforms/facebook/disconnect`,
    null,
    {
      headers: authHeaders,
      params: {
        user_id: userId,
      },
    },
  );
};
