import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_APP_KEY!,
      secret: process.env.PUSHER_APP_SECRET!,
      cluster: process.env.PUSHER_APP_CLUSTER ?? 'mt1',
      useTLS: true,
    });
  }
  return pusherServer;
}

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClientInstance && typeof window !== 'undefined') {
    pusherClientInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER ?? 'mt1',
        authEndpoint: '/api/pusher/auth',
      }
    );
  }
  return pusherClientInstance!;
}

export const PUSHER_EVENTS = {
  NEW_MESSAGE: 'new-message',
  MESSAGE_STATUS: 'message-status',
  CONTACT_UPDATE: 'contact-update',
} as const;
