import axios from "axios";
const API_URL = process.env.API_URL;

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

export const fetchBroadcastStatus = async (streamId: string): Promise<BroadcastStatus> => {
  const res = await axios.get(`${API_URL}/api/bbb/broadcaster/${streamId}`);
  return res.data as BroadcastStatus;
};