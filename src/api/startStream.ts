import axios from 'axios';

export interface BroadcasterReq {
  meeting_id: string;
  rtmp_url: string;
  stream_key: string;
  password: string;
  platform: string;
}

export interface StartStreamResponse {
  status: string;
  message: string;
  join_url: string;
  stream: {
    stream_id: string;
    pod_name: string;
    status: string;
    created_at: string;
  };
  meeting_info: any;
}

const API_URL = process.env.API_URL;

export const startStream = async (payload: BroadcasterReq): Promise<StartStreamResponse> => {
  const response = await axios.post(`${API_URL}/api/bbb/broadcaster`, payload);
  if (response.status === 201) {
    const data = response.data as StartStreamResponse;
    localStorage.setItem("current_stream_id", data.stream.stream_id);
    return data;
  }
  throw new Error(`Unexpected status: ${response.status}`);
};
