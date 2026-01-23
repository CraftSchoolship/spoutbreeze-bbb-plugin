import * as React from 'react';
import * as ReactModal from 'react-modal';
import { StreamEndpointsRes } from '../../api/streamEndpoints';
import { MeetingDetailsRes } from '../../api/meetingDetails';

interface StreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  streamEndpoints: StreamEndpointsRes[];
  selectedEndpointId: string;
  onEndpointChange: (endpointId: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  meetingDetails: MeetingDetailsRes | null;
  statusMessage: string;
}

export function StreamModal({
  isOpen,
  onClose,
  isLoading,
  streamEndpoints,
  selectedEndpointId,
  onEndpointChange,
  onSubmit,
  meetingDetails,
  statusMessage,
}: StreamModalProps): React.ReactElement {
  return (
    <ReactModal
      className="plugin-modal"
      overlayClassName="modal-overlay"
      isOpen={isOpen}
      onRequestClose={onClose}
    >
      <div>
        <h2>Start Stream</h2>
        {isLoading ? (
          <p>Loading stream data...</p>
        ) : (
          <form onSubmit={onSubmit}>
            <div>
              <label htmlFor="stream-destination">
                Stream Destination:
                <select
                  id="stream-destination"
                  value={selectedEndpointId}
                  onChange={(e) => onEndpointChange(e.target.value)}
                  required
                >
                  <option value="">Select a destination</option>
                  {streamEndpoints.map((endpoint) => (
                    <option key={endpoint.id} value={endpoint.id}>
                      {endpoint.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={!meetingDetails || !selectedEndpointId}
            >
              Start Stream
            </button>
          </form>
        )}
        {statusMessage && <p>{statusMessage}</p>}
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </ReactModal>
  );
}
