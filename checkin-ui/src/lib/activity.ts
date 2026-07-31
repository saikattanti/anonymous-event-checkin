export type ActivityKind =
  | 'wallet_connect'
  | 'wallet_disconnect'
  | 'deploy_attempt'
  | 'deploy_success'
  | 'deploy_error'
  | 'checkin_attempt'
  | 'checkin_success'
  | 'checkin_error'
  | 'settings_update';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  at: string;
}

const STORAGE_KEY = 'aec:activity-log';
const MAX = 80;

function readRaw(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(events: ActivityEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX)));
}

export function listActivity(): ActivityEvent[] {
  return readRaw();
}

export function pushActivity(kind: ActivityKind, title: string, detail?: string): ActivityEvent {
  const event: ActivityEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    title,
    detail,
    at: new Date().toISOString(),
  };
  writeRaw([event, ...readRaw()]);
  window.dispatchEvent(new CustomEvent('aec:activity', { detail: event }));
  return event;
}

export function clearActivity() {
  writeRaw([]);
  window.dispatchEvent(new CustomEvent('aec:activity'));
}
