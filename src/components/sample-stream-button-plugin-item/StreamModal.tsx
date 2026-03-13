import * as React from 'react';
import * as ReactModal from 'react-modal';
import { StreamEndpointsRes } from '../../api/streamEndpoints';
import { MeetingDetailsRes } from '../../api/meetingDetails';
import { FacebookDestination } from '../../hooks/useStreamManager';

interface StreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  streamEndpoints: StreamEndpointsRes[];
  facebookDestinations: FacebookDestination[];
  facebookConnected: boolean;
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
  facebookDestinations,
  facebookConnected,
  selectedEndpointId,
  onEndpointChange,
  onSubmit,
  meetingDetails,
  statusMessage,
}: StreamModalProps): React.ReactElement {
  const hasEndpoints = streamEndpoints.length > 0;
  const hasFacebook = facebookConnected && facebookDestinations.length > 0;
  const hasAnyOption = hasEndpoints || hasFacebook;

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

                  {/* Saved RTMP endpoints */}
                  {hasEndpoints && (
                    <optgroup label="Saved Endpoints">
                      {streamEndpoints.map((endpoint) => (
                        <option key={endpoint.id} value={endpoint.id}>
                          {endpoint.title}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Facebook destinations */}
                  {hasFacebook && (
                    <optgroup label="Facebook">
                      {facebookDestinations.map((dest) => (
                        <option key={dest.id} value={dest.id}>
                          {dest.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
            </div>

            {!hasAnyOption && (
              <p style={{ color: '#888', fontSize: '0.9em' }}>
                No stream destinations available. Add an endpoint in Settings
                or connect your Facebook account.
              </p>
            )}

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
