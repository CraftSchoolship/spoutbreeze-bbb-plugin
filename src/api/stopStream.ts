import axios from "axios";
const API_URL = process.env.API_URL;

export interface StopStreamResponse {
  message: string;
  stream_id: string;
  status?: string;
}

export const stopStream = async (streamId: string): Promise<StopStreamResponse> => {
  const res = await axios.delete(`${API_URL}/api/bbb/broadcaster/${streamId}`);
  return res.data as StopStreamResponse;
};