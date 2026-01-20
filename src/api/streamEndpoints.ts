import axios from 'axios';

export interface StreamEndpointsRes {
  id: string;
  title: string;
  rtmp_url: string;
  stream_key: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

const { API_URL } = process.env;

export const fetchStreamEndpoints = async (): Promise<StreamEndpointsRes[]> => {
  try {
    // Call the proxy endpoint to get all available stream endpoints
    const response = await axios.get<StreamEndpointsRes[]>(
      `${API_URL}/api/bbb/proxy/stream-endpoints`,
      {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.status === 200) {
      // console.log('Stream endpoints fetched successfully:', response.data);
      return response.data;
    }
    // console.error('Failed to fetch stream endpoints:', response.statusText);
    throw new Error(
      `Failed to fetch stream endpoints: ${response.statusText}`,
    );
  } catch (error) {
    console.error('Error fetching stream endpoints:', error);
    throw error;
  }
};
