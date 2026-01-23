import axios from 'axios';

const { API_URL } = process.env;

export interface BroadcastStatus {
  stream_id: string;
  status: string;
  pod_name?: string;
  created_at?: string;
  bbb_health_check_url?: string;
  bbb_server_url?: string;
  streams?: { platform: string; rtmp_url: string; stream_key: string }[];
  error?: string;
}

export const fetchBroadcastStatus = async (
  streamId: string,
): Promise<BroadcastStatus> => {
  const { data } = await axios.get<BroadcastStatus>(
    `${API_URL}/api/bbb/broadcaster/${streamId}`,
  );
  return data;
};
