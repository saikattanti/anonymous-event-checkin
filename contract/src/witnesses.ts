/** Private state for event-checkin — vacant (no witnesses). */

export type CheckInPrivateState = Record<string, never>;

export const createCheckInPrivateState = (): CheckInPrivateState => ({});

export const witnesses = {};
