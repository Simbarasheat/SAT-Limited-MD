const express = require("express")
const path = require("path")
const fs = require("fs")
const P = require("pino")
const chalk = require("chalk")
const QRCode = require("qrcode")
const NodeCache = require("node-cache")
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const app = express()
app.use(express.json())
app.use(express.static(__dirname))

const SESSION_DIR = path.join(__dirname, "session")
const msgRetryCounterCache = new NodeCache()
const commands = new Map()
let sock = null

// =======================
// LOAD COMMANDS
// =======================
function loadCommands(dir) {
  if (!fs.existsSync(dir)) return

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

const commandsPath = path.join(__dirname, "commands")
loadCommands(commandsPath)
console.log(chalk.cyan(`Total commands loaded: ${commands.size}`))

// =======================
// SOCKET
// =======================
async function getSocket() {
  if (sock) return sock

  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true })
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    browser: ["SAT Limited MD", "Chrome", "1.0.0"],
    printQRInTerminal: false,
    msgRetryCounterCache,
    connectTimeoutMs: 60000
  })

  sock.ev.on("creds.update", saveCreds)
  
  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") console.log(chalk.green("✅ WhatsApp Connected"))
    if (connection === "close") sock = null
  })

  // Message handler
  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0]
      if (!msg.message || msg.key.fromMe) return

      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   msg.message.imageMessage?.caption || 
                   ""

      if (!text.startsWith(".")) return

      const args = text.slice(1).trim().split(/ +/)
      const cmd = args.shift()?.toLowerCase()
      const from = msg.key.remoteJid

      const command = commands.get(cmd)
      if (!command) return

      await command.execute(sock, msg, args, from)
      console.log(chalk.yellow(`CMD: ${cmd}`))

    } catch (err) {
      console.log(chalk.red("Handler Error:"), err)
    }
  })

  return sock
}

// =======================
// ROUTES
// =======================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

app.get("/pair", async (req, res) => {
  try {
    const number = req.query.number?.replace(/[^0-9]/g, "")
    if (!number) return res.json({ status: false, message: "Number required" })

    const s = await getSocket()
    if (s.authState.creds.registered) {
      return res.json({ status: true, message: "Already connected" })
    }

    const code = await s.requestPairingCode(number)
    return res.json({ status: true, code })
    
  } catch (err) {
    console.log(chalk.red("PAIR ERROR:"), err)
    return res.json({ status: false, message: err.message })
  }
})

app.get("/qr", async (req, res) => {
  try {
    const s = await getSocket()
    if (s.authState?.creds?.registered) {
      return res.json({ status: "connected" })
    }

    const listener = async (update) => {
      if (update.qr && !res.headersSent) {
        const qrData = await QRCode.toDataURL(update.qr)
        res.json({ qr: qrData })
        s.ev.off("connection.update", listener)
      }
    }

    s.ev.on("connection.update", listener)

    setTimeout(() => {
      s.ev.off("connection.update", listener)
      if (!res.headersSent) {
        res.status(408).json({ error: "QR generation timeout" })
      }
    }, 20000)

  } catch (err) {
    console.log(chalk.red("QR ERROR:"), err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    }
  }
})

app.get("/status", (req, res) => {
  res.json({ status: sock?.user ? "connected" : "offline" })
})

app.get("/ping", (req, res) => {
  res.send("pong")
})

module.exports = app

if (require.main === module) {
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => console.log(chalk.cyan(`🚀 Server running on ${PORT}`)))
}