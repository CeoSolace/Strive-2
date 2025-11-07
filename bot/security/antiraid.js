// src/bot/security/antiraid.js
import { logger } from '../../utils/logger.js';
import GuildConfig from '../../models/GuildConfig.js';

export function antiraid(client) {
  const joinTracker = new Map(); // guildId → [timestamps]

  client.on('guildMemberAdd', async (member) => {
    const { guild } = member;
    const guildId = guild.id;

    const config = await GuildConfig.findOne({ guildId });
    if (!config?.antiRaidEnabled) return;

    const now = Date.now();
    const windowMs = 60_000; // 1 minute
    const threshold = 10; // 10 joins = raid

    if (!joinTracker.has(guildId)) {
      joinTracker.set(guildId, []);
    }

    const joins = joinTracker.get(guildId);
    joins.push(now);
    while (joins.length > 0 && now - joins[0] > windowMs) {
      joins.shift();
    }

    if (joins.length >= threshold) {
      logger?.security?.('RAID_DETECTED', { guildId, joinCount: joins.length }) ||
        console.log('[SECURITY] RAID_DETECTED', { guildId, joinCount: joins.length });

      // Enable slowmode in public text channels
      const publicChannels = guild.channels.cache.filter(
        c => c.type === 0 && 
             c.permissionsFor(guild.roles.everyone)?.has('SendMessages')
      );

      for (const channel of publicChannels.values()) {
        try {
          await channel.setRateLimitPerUser(10, 'Raid protection auto-enabled');
        } catch (err) {
          console.warn('Failed to set slowmode', { channelId: channel.id, error: err.message });
        }
      }

      // Lock @everyone from sending messages
      try {
        const textChannels = guild.channels.cache.filter(c => c.type === 0);
        for (const channel of textChannels.values()) {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: false
          }, { reason: 'Raid lockdown' });
        }
      } catch (err) {
        console.error('Raid lockdown failed', { error: err.message });
      }
    }
  });
}
