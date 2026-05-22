import axios from 'axios';

const { API_URL } = process.env;
const PLUGIN_SECRET = process.env.PLUGIN_SHARED_SECRET || 'dev-secret';

const authHeaders = {
  'X-Internal-Auth': PLUGIN_SECRET,
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const FACEBOOK_STREAM_API_BASE = `${API_URL}/api/streaming/facebook`;

export interface FacebookStatus {
  connected: boolean;
  is_expired: boolean;
}

export interface FacebookPage {
  page_id: string;
  page_name: string | null;
  is_active: boolean;
}

export interface GoLiveResponse {
  live_video_id: string;
  rtmp_url: string;
  stream_key: string;
  stream_url: string;
  target: string;
}

export const fetchFacebookStatus = async (
  meetingId: string,
): Promise<FacebookStatus> => {
  const { data } = await axios.get<FacebookStatus>(
    `${FACEBOOK_STREAM_API_BASE}/status/${meetingId}`,
    { headers: authHeaders },
  );
  return data;
};

export const fetchFacebookPages = async (
  meetingId: string,
): Promise<FacebookPage[]> => {
  const { data } = await axios.get<{ pages: FacebookPage[] }>(
    `${FACEBOOK_STREAM_API_BASE}/pages/${meetingId}`,
    { headers: authHeaders },
  );
  return data.pages;
};

export const facebookGoLive = async (
  meetingId: string,
  target: string = 'me',
  title: string = 'BlueScale Live',
  privacy: string = 'EVERYONE',
): Promise<GoLiveResponse> => {
  const { data } = await axios.post<GoLiveResponse>(
    `${FACEBOOK_STREAM_API_BASE}/go-live`,
    {
      meeting_id: meetingId,
      target,
      title,
      privacy,
    },
    { headers: authHeaders },
  );
  return data;
};

export const facebookEndLive = async (
  meetingId: string,
  liveVideoId: string,
  target: string = 'me',
): Promise<{ message: string; live_video_id: string }> => {
  const { data } = await axios.post(
    `${FACEBOOK_STREAM_API_BASE}/end-live`,
    {
      meeting_id: meetingId,
      live_video_id: liveVideoId,
      target,
    },
    { headers: authHeaders },
  );
  return data;
};
