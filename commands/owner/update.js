const axios = require('axios')

module.exports = {
  name: "update",
  category: "owner",
  description: "Check bot updates from GitHub repository (Owner only)",
  execute: async (sock, m, args, cmd, context) => {
    try {
      // Check if user is owner
      if (!m.isOwner) {
        return await sock.sendMessage(m.key.remoteJid, {
          text: "❌ Only the bot owner can use this command!"
        })
      }

      // Send fetching message
      await sock.sendMessage(m.key.remoteJid, {
        text: "🔄 Fetching repository information from GitHub..."
      })

      // Fetch repository info from GitHub API
      const repoResponse = await axios.get(
        'https://api.github.com/repos/Simbarasheat/SAT-Limited-MD',
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      const repo = repoResponse.data

      // Fetch latest release info
      let latestRelease = null
      try {
        const releaseResponse = await axios.get(
          'https://api.github.com/repos/Simbarasheat/SAT-Limited-MD/releases/latest',
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )
        latestRelease = releaseResponse.data
      } catch (err) {
        // No releases found
      }

      // Fetch latest commit info
      const commitResponse = await axios.get(
        'https://api.github.com/repos/Simbarasheat/SAT-Limited-MD/commits?per_page=1',
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      const latestCommit = commitResponse.data[0]

      // Format the update information
      const updateMessage = `
╔═══════════════════════════════════╗
║      🔄 GITHUB UPDATE INFO        ║
╠═══════════════════════════════════╣
║                                   ║
║  📦 Repository Information:
║  • Name: ${repo.name}
║  • Owner: ${repo.owner.login}
║  • Stars: ⭐ ${repo.stargazers_count}
║  • Forks: 🍴 ${repo.forks_count}
║  • Watchers: 👀 ${repo.watchers_count}
║                                   ║
║  📝 Latest Commit:
║  • Message: ${latestCommit.commit.message.split('\n')[0]}
║  • Author: ${latestCommit.commit.author.name}
║  • SHA: ${latestCommit.sha.substring(0, 7)}
║  • Date: ${new Date(latestCommit.commit.author.date).toLocaleString()}
║                                   ║
║  🏷️ Latest Release:
${latestRelease ? `║  • Version: ${latestRelease.tag_name}
║  • Name: ${latestRelease.name}
║  • Published: ${new Date(latestRelease.published_at).toLocaleDateString()}` : '║  • No releases available yet'}
║                                   ║
║  🔗 Repository URL:
║  https://github.com/${repo.full_name}
║                                   ║
║  📊 Repository Statistics:
║  • Language: ${repo.language || 'Not specified'}
║  • Size: ${(repo.size / 1024).toFixed(2)} MB
║  • Open Issues: ${repo.open_issues_count}
║  • Last Updated: ${new Date(repo.updated_at).toLocaleDateString()}
║                                   ║
╚═══════════════════════════════════╝
`

      await sock.sendMessage(m.key.remoteJid, {
        text: updateMessage
      })

      // Log the update check
      console.log(`[UPDATE] Repository info checked by ${m.sender}`)

    } catch (err) {
      console.log(err)
      
      let errorMsg = `❌ Error fetching repository information!`
      
      if (err.response?.status === 404) {
        errorMsg += `\n\nRepository not found. Check the repository name and owner.`
      } else if (err.message === 'Network Error') {
        errorMsg += `\n\nNetwork error. Please check your internet connection.`
      } else {
        errorMsg += `\n\nError: ${err.message}`
      }

      await sock.sendMessage(m.key.remoteJid, {
        text: errorMsg
      })
    }
  }
}
