import { z } from 'zod';

export const chatReactionSchema = z.enum(['heart', 'popcorn', 'laugh', 'cry']);
export const specialReactionSchema = z.enum(['hold-my-hand', 'heartbeat']);

export const roomJoinSchema = z.object({ roomId: z.string().min(1).max(128) });
export const chatSendSchema = z.object({
  roomId: z.string().min(1).max(128),
  content: z.string().trim().min(1).max(2_000),
});
export const chatTypingSchema = z.object({
  roomId: z.string().min(1).max(128),
  isTyping: z.boolean(),
});
export const reactionSendSchema = z.object({
  roomId: z.string().min(1).max(128),
  reaction: chatReactionSchema,
});
export const chatReactSchema = z.object({
  roomId: z.string().min(1).max(128),
  messageId: z.string().min(1).max(128),
  emoji: z.enum(['heart', 'popcorn', 'laugh', 'cry']),
});
export const chatDeleteSchema = z.object({
  roomId: z.string().min(1).max(128),
  messageId: z.string().min(1).max(128),
});
export const handPressSchema = z.object({ roomId: z.string().min(1).max(128) });
export const settingsUpdateSchema = z.object({
  roomId: z.string().min(1).max(128),
  everyoneCanControl: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
  screenShareEnabled: z.boolean().optional(),
}).refine((value) => value.everyoneCanControl !== undefined || value.chatEnabled !== undefined || value.screenShareEnabled !== undefined, {
  message: 'At least one setting is required',
});
export const playerSourceSchema = z.object({
  type: z.enum(['url', 'youtube', 'vimeo', 'hls', 'dash']),
  url: z.string().url().max(2_048),
  title: z.string().trim().min(1).max(300),
});
export const playerVersionSchema = z.object({
  roomId: z.string().min(1).max(128),
  baseVersion: z.number().int().nonnegative(),
});
export const playerSetSourceSchema = playerVersionSchema.extend({ source: playerSourceSchema });
export const playerSeekSchema = playerVersionSchema.extend({ position: z.number().finite().nonnegative() });
export const playerRateSchema = playerVersionSchema.extend({ rate: z.number().finite().min(0.25).max(4) });
export const roomModeSchema = playerVersionSchema.extend({ mode: z.enum(['player', 'screen', 'browser']) });
export const playerMutationSchema = playerVersionSchema;

export type ChatReaction = z.infer<typeof chatReactionSchema>;
export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImage?: string | null;
};
export type SocketAck = { ok: true; error?: never } | { ok: false; error: string };
export type ParticipantsEvent = {
  roomId: string;
  participants: Array<{ userId: string; displayName: string; avatarUrl: string | null }>;
};
export type PlaybackSource = {
  type: 'url' | 'youtube' | 'vimeo' | 'hls' | 'dash';
  url: string;
  title: string;
};
export type PlaybackState = {
  mode: 'player' | 'screen' | 'browser';
  source: PlaybackSource | null;
  status: 'playing' | 'paused' | 'ended';
  position: number;
  rate: number;
  updatedAt: number;
  version: number;
  serverTime?: number;
};

export const socketPayloadSchemas = {
  'room:join': roomJoinSchema,
  'room:leave': roomJoinSchema,
  'presence:heartbeat': roomJoinSchema,
  'chat:send': chatSendSchema,
  'chat:typing': chatTypingSchema,
  'reaction:send': reactionSendSchema,
  'reaction:react': chatReactSchema,
  'chat:delete': chatDeleteSchema,
  'reaction:hand-press': handPressSchema,
  'reaction:hand-release': handPressSchema,
  'host:update-settings': settingsUpdateSchema,
  'player:set-source': playerSetSourceSchema,
  'player:play': playerMutationSchema,
  'player:pause': playerMutationSchema,
  'player:seek': playerSeekSchema,
  'player:rate': playerRateSchema,
  'player:ended': playerMutationSchema,
  'room:set-mode': roomModeSchema,
} as const;

export type SocketEvent = keyof typeof socketPayloadSchemas;
