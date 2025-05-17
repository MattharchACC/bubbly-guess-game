
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a device ID and store it in local storage
 */
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};

/**
 * Store player ID associated with a game session
 */
export const storePlayerSession = (sessionCode: string, playerId: string, playerName: string): void => {
  if (sessionCode) {
    localStorage.setItem(`player:${sessionCode}`, playerId);
    localStorage.setItem(`playerName:${sessionCode}`, playerName);
    localStorage.setItem(`lastActiveSession`, sessionCode);
  }
};
