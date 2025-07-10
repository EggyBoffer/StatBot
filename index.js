import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(3000, () => {
  console.log("🌐 Web server running on port 3000");
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID_DOWNLOADS = process.env.DOWNLOAD_CHANNEL_ID;
const CHANNEL_ID_VERSION = process.env.VERSION_CHANNEL_ID;
const CHANNEL_ID_MEMBERS = process.env.MEMBER_COUNT_CHANNEL_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // For member stats later
  ],
}); // ✅ THIS was missing!

async function fetchGitHubRelease() {
  const res = await fetch(
    "https://api.github.com/repos/EggyBoffer/Eve-Isk-Management/releases/latest"
  );
  const data = await res.json();
  return data.tag_name || "Unknown";
}

async function fetchDownloadCount() {
  const res = await fetch(
    "https://api.github.com/repos/EggyBoffer/Eve-Isk-Management/releases"
  );
  const releases = await res.json();
  return releases.reduce((total, release) => {
    return (
      total +
      release.assets.reduce((sum, asset) => sum + asset.download_count, 0)
    );
  }, 0);
}

async function updateChannels() {
  try {
    const version = await fetchGitHubRelease();
    const downloads = await fetchDownloadCount();

    const channelDownloads = await client.channels.fetch(CHANNEL_ID_DOWNLOADS);
    const channelVersion = await client.channels.fetch(CHANNEL_ID_VERSION);

    const guild = client.guilds.cache.first(); // Gets your server
    const memberCount = guild?.memberCount || 0;
    
    const channelMembers = await client.channels.fetch(CHANNEL_ID_MEMBERS);
    if (channelMembers)
      await channelMembers.setName(`👥 Members: ${memberCount}`);

    if (channelDownloads)
      await channelDownloads.setName(`📥 Downloads: ${downloads}`);
    if (channelVersion) await channelVersion.setName(`📦 Version: ${version}`);
    console.log("✅ Stats updated");
  } catch (err) {
    console.error("❌ Failed to update stats:", err);
  }
}

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  updateChannels();
  setInterval(updateChannels, 10 * 60 * 1000); // every 10 mins
});

client.login(DISCORD_TOKEN);
