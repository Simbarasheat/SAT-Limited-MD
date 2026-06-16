const express = require("express")
const path = require("path")
const fs = require("fs")
const P = require("pino")
const chalk = require("chalk")
const NodeCache = require("node-cache")
const QRCode = require("qrcode")
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  proto,
  delay
} = require("@whiskeysockets/baileys")

const config = require("./config")

const app = express()
app.use(express.json())
app.use(express.static(__dirname))

const SESSION_DIR = path.join(__dirname, "session")
const msgRetryCounterCache = new NodeCache()
const commands = new Map()
let sock = null
let qrCode = null

// Store bot settings globally
let botSettings = {
  prefix: process.env.BOT_PREFIX || config.prefix,
  botName: process.env.BOT_NAME || config.botName,
  ownerName: process.env.OWNER_NAME || config.ownerName,
  ownerNumber: process.env.OWNER_NUMBER || config.ownerNumber
}

// Validate bot settings
if (!botSettings.ownerNumber || botSettings.ownerNumber.length < 10) {
  console.log(chalk.yellow("⚠️  Warning: Invalid owner number in config"))
}

// Command loader
function loadCommands(dir) {
  if (!fs.existsSync(dir)) {
    console.log(chalk.yellow(`[CMD] Commands directory not found: ${dir}`))
    return
  }
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const file of files) {
    const fullPath = path.join(dir, file.name)
    if (file.isDirectory()) {
      loadCommands(fullPath)
    } else if (file.name.endsWith(".js")) {
      try {
        delete require.cache[require.resolve(fullPath)]
        const command = require(fullPath)
        if (command?.name && typeof command.execute === "function") {
          commands.set(command.name, command)
          console.log(chalk.green(`[CMD] Loaded: ${command.name}`))
        }
      } catch (err) {
        console.log(chalk.red(`[CMD] Failed: ${file.name}`), err.message)
      }
    }
  }
}
loadCommands(path.join(__dirname, "commands"))
console.log(chalk.cyan(`Total commands loaded: ${commands.size}`))

async function getSocket() {
  if (sock) return sock
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true })

  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: "silent" }),
      browser: ["SAT Limited MD", "Chrome", "1.0.0"],
      printQRInTerminal: false,
      msgRetryCounterCache,
      shouldSyncHistoryMessage: false,
      syncFullHistory: false
    })

    sock.ev.on("creds.update", saveCreds)
    
    sock.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
      if (connection === "open") {
        qrCode = null
        console.log(chalk.green("✅ WhatsApp Connected"))
      }
      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401
        console.log(chalk.yellow(`Connection closed. Reconnecting: ${shouldReconnect}`))
        sock = null
        if (shouldReconnect) {
          setTimeout(getSocket, 3000)
        }
      }
      if (qr) {
        qrCode = qr
        console.log(chalk.yellow("📱 Scan QR Code to connect"))
      }
    })

    // Message Handler
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        for (const message of messages) {
          // Skip own messages and non-text messages
          if (message.key.fromMe || !message.message) continue

          // Extract text content
          const msgContent = message.message.conversation ||
            message.message.extendedTextMessage?.text ||
            message.message.imageMessage?.caption ||
            message.message.videoMessage?.caption ||
            ""

          if (!msgContent || typeof msgContent !== "string") continue

          // Check if message starts with current prefix
          if (!msgContent.startsWith(botSettings.prefix)) continue

          // Parse command and arguments
          const args = msgContent.trim().split(/\s+/)
          const cmdName = args[0].slice(botSettings.prefix.length).toLowerCase()
          args.shift()

          // Get command
          const command = commands.get(cmdName)
          if (!command) {
            console.log(chalk.yellow(`[CMD] Unknown command: ${cmdName}`))
            continue
          }

          // Prepare message object with all necessary properties
          const sender = message.key.participant || message.key.remoteJid
          const senderNumber = sender.replace(/[^0-9]/g, "")
          
          const m = {
            key: message.key,
            message: message.message,
            sender: sender,
            from: message.key.remoteJid,
            isGroup: message.key.remoteJid.endsWith("@g.us"),
            isOwner: senderNumber === botSettings.ownerNumber,
            mentionedJid: message.message.extendedTextMessage?.contextInfo?.mentionedJid || [],
            quoted: message.message.extendedTextMessage?.contextInfo?.quotedMessage
              ? {
                message: message.message.extendedTextMessage.contextInfo.quotedMessage,
                sender: message.message.extendedTextMessage.contextInfo.participant
              }
              : null,
            reply: async (text) => {
              try {
                await sock.sendMessage(message.key.remoteJid, {
                  text: text
                }, { quoted: message })
              } catch (err) {
                console.log(chalk.red(`[REPLY] Error sending message:`), err.message)
              }
            }
          }

          // Execute command
          try {
            console.log(chalk.blue(`[CMD] Executing: ${cmdName} by ${m.sender}`))
            await command.execute(sock, m, args, cmdName, { commands, botSettings })
          } catch (err) {
            console.log(chalk.red(`[CMD] Error executing ${cmdName}:`), err.message)
            try {
              await sock.sendMessage(message.key.remoteJid, {
                text: `❌ Error executing command: ${err.message}`
              })
            } catch (replyErr) {
              console.log(chalk.red(`[CMD] Failed to send error message`), replyErr.message)
            }
          }
        }
      } catch (err) {
        console.log(chalk.red("Message Handler Error:"), err.message)
      }
    })

    return sock
  } catch (err) {
    console.log(chalk.red("Failed to initialize socket:"), err.message)
    throw err
  }
}

app.get("/pair", async (req, res) => {
  try {
    const number = req.query.number?.replace(/[^0-9]/g, "")
    if (!number || number.length < 10) {
      return res.json({ status: false, message: "Valid number required (minimum 10 digits)" })
    }

    const s = await getSocket()
    
    if (s.authState?.creds?.registered) {
      return res.json({ status: true, message: "Already connected", connected: true })
    }

    try {
      const code = await s.requestPairingCode(number)
      return res.json({ status: true, code, message: "Pairing code sent" })
    } catch (pairErr) {
      return res.json({ status: false, message: `Pairing failed: ${pairErr.message}` })
    }
    
  } catch (err) {
    console.log(chalk.red("PAIR ERROR:"), err.message)
    return res.json({ status: false, message: err.message })
  }
})

app.get("/qr", async (req, res) => {
  try {
    if (!qrCode) {
      return res.json({ status: false, message: "No QR code available" })
    }
    
    const qrImage = await QRCode.toDataURL(qrCode)
    return res.json({ status: true, qr: qrImage })
  } catch (err) {
    console.log(chalk.red("QR ERROR:"), err.message)
    return res.json({ status: false, message: err.message })
  }
})

app.get("/status", (req, res) => {
  const status = {
    connected: !!sock?.user,
    status: sock?.user ? "connected" : "offline",
    user: sock?.user || null,
    commands: commands.size
  }
  res.json(status)
})

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

module.exports = app

if (require.main === module) {
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`)
})

getSocket().catch(err => {
  console.log("Socket failed:", err.message)
})
    console.log(chalk.red("Failed to start bot:"), err.message)
    setTimeout(() => {
      console.log(chalk.yellow("Retrying..."))
      getSocket()
    }, 5000)
  })
}
