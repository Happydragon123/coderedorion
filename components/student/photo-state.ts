export type PhotoState = { attempt: number; status: 'loading' | 'ready' | 'failed'; url?: string };
export type PhotoEvent = { type: 'retry' } | { type: 'signed'; attempt: number; url: string } | { type: 'failed'; attempt: number };
export const initialPhotoState: PhotoState = { attempt: 0, status: 'loading' };

export function photoReducer(state: PhotoState, event: PhotoEvent): PhotoState {
  if (event.type === 'retry') return { attempt: state.attempt + 1, status: 'loading' };
  // A previous request or image must never replace a newer retry.
  if (event.attempt !== state.attempt) return state;
  if (event.type === 'failed') return { attempt: state.attempt, status: 'failed' };
  if (state.status !== 'loading') return state;
  return event.url ? { attempt: state.attempt, status: 'ready', url: event.url } : { attempt: state.attempt, status: 'failed' };
}
