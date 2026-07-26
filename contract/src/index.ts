export * from './managed/event-checkin/contract/index.js';
export * from './witnesses.js';

import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import * as EventCheckIn from './managed/event-checkin/contract/index.js';

export const CompiledEventCheckInContract = CompiledContract.make(
  'event-checkin',
  EventCheckIn.Contract,
).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets('./managed/event-checkin'),
);
