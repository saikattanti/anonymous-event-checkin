export const PRIVATE_STATE_ID = 'eventCheckinPrivateState';
export const PRIVATE_STATE_STORE_NAME = 'event-checkin-state';
export const CONTRACT_NAME = 'event-checkin';

export type PublicState = {
  eventName: string;
  checkInCount: bigint;
};
