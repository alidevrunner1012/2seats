# Wiring moderation into existing modules (B3, B4, B5)
1. Rooms create:       @UseGuards(JwtAuthGuard, TosGuard) on POST /rooms
2. Room join:         const bad = await moderation.blockedAmong(userId, currentMemberIds); if (bad.length) throw new ForbiddenException('Cannot join this room')
3. Playback service:  await dmca.assertAllowed(url) before applying `player:set-source`
4. Chat send:         if (room.profanityFilter) text = filterProfanity(text)   // add Room.profanityFilter Boolean @default(false)
5. Banned users:      reject in JwtAuthGuard / socket handshake when user.bannedAt != null
