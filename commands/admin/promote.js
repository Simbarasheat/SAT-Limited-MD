module.exports = {
  name: "promote",
  category: "admin",
  description: "Promote a user to admin in the group",
  execute: async (sock, m, args, cmd) => {
    try {
      // Check if it's a group
      if (!m.isGroup) {
        return await sock.sendMessage(m.key.remoteJid, {
          text: "❌ This command can only be used in groups!"
        })
      }

      // Check if user is admin
      const groupMetadata = await sock.groupMetadata(m.key.remoteJid)
      const isAdmin = groupMetadata.participants.find(
        p => p.id === m.sender && p.admin
      )

      if (!isAdmin) {
        return await sock.sendMessage(m.key.remoteJid, {
          text: "❌ You must be a group admin to use this command!"
        })
      }

      // Get mentioned user or quoted message
      let target = m.mentionedJid?.[0] || m.quoted?.sender

      if (!target) {
        return await sock.sendMessage(m.key.remoteJid, {
          text: "❌ Please mention a user or reply to their message to promote them!"
        })
      }

      // Promote the user
      await sock.groupParticipantsUpdate(m.key.remoteJid, [target], "promote")

      await sock.sendMessage(m.key.remoteJid, {
        text: `✅ @${target.split("@")[0]} has been promoted to admin!`,
        mentions: [target]
      })
    } catch (err) {
      console.log(err)
      await sock.sendMessage(m.key.remoteJid, {
        text: `❌ Error: ${err.message}`
      })
    }
  }
}
