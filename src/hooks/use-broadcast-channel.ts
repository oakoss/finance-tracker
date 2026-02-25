import { useCallback, useEffect, useRef } from 'react';

import { clientLog } from '@/lib/logging/client-logger';

type UseBroadcastChannelOptions<T> = {
  onMessage?: (data: T) => void;
};

const isSupported =
  typeof globalThis !== 'undefined' && 'BroadcastChannel' in globalThis;

export function useBroadcastChannel<T = unknown>(
  channelName: string,
  options: UseBroadcastChannelOptions<T> = {},
) {
  const { onMessage } = options;
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!isSupported) {
      clientLog.warn({
        action: 'broadcastChannel.init',
        outcome: { channelName, reason: 'unsupported', success: false },
      });
      return;
    }

    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(channelName);
    } catch (error) {
      clientLog.error({
        action: 'broadcastChannel.init',
        error: error instanceof Error ? error.message : String(error),
        outcome: { channelName, success: false },
      });
      return;
    }

    channelRef.current = channel;

    const handler = (event: MessageEvent<T>) => {
      try {
        onMessageRef.current?.(event.data);
      } catch (error) {
        clientLog.error({
          action: 'broadcastChannel.onMessage',
          error: error instanceof Error ? error.message : String(error),
          outcome: { channelName, success: false },
        });
      }
    };

    const errorHandler = (event: MessageEvent) => {
      clientLog.error({
        action: 'broadcastChannel.messageError',
        outcome: { channelName, origin: event.origin, success: false },
      });
    };

    channel.addEventListener('message', handler);
    channel.addEventListener('messageerror', errorHandler);

    return () => {
      channel.removeEventListener('message', handler);
      channel.removeEventListener('messageerror', errorHandler);
      channel.close();
      channelRef.current = null;
    };
  }, [channelName]);

  const postMessage = useCallback(
    (data: T): boolean => {
      if (!channelRef.current) return false;
      try {
        channelRef.current.postMessage(data);
        return true;
      } catch (error) {
        clientLog.error({
          action: 'broadcastChannel.postMessage',
          error: error instanceof Error ? error.message : String(error),
          outcome: { channelName, success: false },
        });
        return false;
      }
    },
    [channelName],
  );

  return { isSupported, postMessage };
}
