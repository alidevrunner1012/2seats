'use client';
import { useCallback, useEffect, useReducer } from 'react';
import { useCurrentUserId, useRoomId, useSocket } from '../../_adapters';
import { controlReducer, hasIncomingRequest, initialControl, roleOf } from './controlReducer';

export function useBrowserControl() {
  const socket = useSocket();
  const roomId = useRoomId();
  const me = useCurrentUserId();
  const [state, dispatch] = useReducer(controlReducer, initialControl);

  useEffect(() => {
    const onState = (s: { controllerId: string | null; pendingFrom?: string | null }) => dispatch({ type: 'state', ...s });
    socket.on('browser:control-state', onState);
    return () => { socket.off('browser:control-state', onState); dispatch({ type: 'reset' }); };
  }, [socket]);

  const emit = useCallback(
    (event: string, extra: object = {}) => socket.emit(event, { roomId, ...extra }, () => undefined),
    [socket, roomId],
  );
  return {
    state, role: roleOf(state, me), incoming: hasIncomingRequest(state, me),
    request: () => emit('browser:request-control'),
    release: () => emit('browser:release-control'),
    grantToPending: () => state.pendingFrom && emit('browser:grant-control', { to: state.pendingFrom }),
  };
}
