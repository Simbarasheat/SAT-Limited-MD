module.exports = {
  name: "setprefix",
  category: "owner",
  description: "Change the bot command prefix (Owner only)",
  execute: async (sock, m, args, cmd, context) => {
    try {
      // Check if user is owner
      if (!m.isOwner) {
        return await sock.sendMessage(m.key.remoteJid, {
          text: "❌ Only the bot owner can use this command!"
        })
      }

      // Get new prefix
      const newPrefix = args[0]

      if (!newPrefix) {
        return await sock.sendMessage(m.key.remoteJid, {
          text: `❌ Please provide a new prefix!\n\nUsage: ${context?.botSettings?.prefix}setprefix <prefix>\n\nExample: ${context?.botSettings?.prefix}setprefix !`
        })
      }

      if (newPrefix.length > 1) {
        return await sock.sendMessage(m.key.remoteJid, {
          text: "❌ Prefix must be a single character!"
        })
      }

      // Update prefix in bot settings
      context.botSettings.prefix = newPrefix

      await sock.sendMessage(m.key.remoteJid, {
        text: `✅ Bot prefix changed successfully!\n\n📌 New Prefix: ${newPrefix}\n\nNow use ${newPrefix}help to see all commands`
      })

      console.log(`[PREFIX] Changed from ${context.botSettings.prefix} to ${newPrefix} by ${m.sender}`)

    } catch (err) {
      console.log(err)
      await sock.sendMessage(m.key.remoteJid, {
        text: `❌ Error: ${err.message}`
      })
    }
  }
}
