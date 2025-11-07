// src/models/GuildConfig.js
import { Schema, model } from 'mongoose';

const guildConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  antiRaidEnabled: { type: Boolean, default: false },
}, {
  timestamps: true,
});

guildConfigSchema.index({ guildId: 1 });

export default model('GuildConfig', guildConfigSchema);
