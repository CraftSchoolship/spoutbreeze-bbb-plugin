import axios from 'axios';

export interface MeetingDetailsRes {
  internal_meeting_id: string;
  attendee_pw: string;
  create_time: string;
  dial_number: string;
  duration: string;
  message_key: string | null;
  user_id: string;
  updated_at: string;
  parent_meeting_id: string;
  id: string;
  meeting_id: string;
  moderator_pw: string;
  voice_bridge: string;
  has_user_joined: string;
  has_been_forcibly_ended: string;
  message: string | null;
  created_at: string;
}

const { API_URL } = process.env;

export const fetchMeetingDetails = async (
  internalMeetingId: string,
): Promise<MeetingDetailsRes> => {
  try {
    const response = await axios.get<MeetingDetailsRes>(
      `${API_URL}/api/bbb/meeting/${internalMeetingId}`,
      {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.status === 200) {
      // console.log('Meeting details fetched successfully:', response.data);
      return response.data;
    }
    // console.error("Failed to fetch meeting details:", response.statusText);
    throw new Error(
      `Failed to fetch meeting details: ${response.statusText}`,
    );
  } catch (error) {
    // console.error("Error fetching meeting details:", error);
    throw error;
  }
};
