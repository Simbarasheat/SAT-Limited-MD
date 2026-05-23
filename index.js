// =======================
// 🤖 SAT LIMITED MD
// =======================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const P = require("pino")
const qrcode = require("qrcode-terminal")
const chalk = require("chalk")
const fs = require("fs")

// =======================
// ⚙️ CONFIG
// =======================

const config = {
  botName: "SAT Limited MD",
  ownerName: "SAT Limited",
  prefix: ".",
  ownerNumber: "260772697513"
}

// =======================
// 🚀 START BOT
// =======================

async function startBot() {

  const { state, saveCreds } =
    await useMultiFileAuthState("./session")

  const { version } =
    await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    browser: ["SAT Limited MD", "Chrome", "1.0.0"]
  })

  // =======================
  // 💾 SAVE SESSION
  // =======================

  sock.ev.on("creds.update", saveCreds)

  // =======================
  // 🔌 CONNECTION UPDATE
  // =======================

  sock.ev.on("connection.update", async ({
    connection,
    lastDisconnect,
    qr
  }) => {

    // ===== QR CODE =====

    if (qr) {
      console.clear()
      qrcode.generate(qr, { small: true })

      console.log(
        chalk.green(
          "\nScan the QR code above\n"
        )
      )
    }

    // ===== CONNECTED =====

    if (connection === "open") {

      console.clear()

      console.log(
        chalk.cyan(`
╔══════════════════════╗
   🤖 SAT LIMITED MD
   Connected Successfully
╚══════════════════════╝
`)
      )
    }

    // ===== DISCONNECTED =====

    if (connection === "close") {

      const reason =
        lastDisconnect?.error?.output?.statusCode

      console.log(
        chalk.red("Connection closed...")
      )

      // reconnect unless logged out
      if (reason !== DisconnectReason.loggedOut) {
        startBot()
      } else {
        console.log(
          chalk.red("Logged out.")
        )
      }
    }
  })

  // =======================
  // 💬 MESSAGE HANDLER
  // =======================

  sock.ev.on("messages.upsert", async ({
    messages
  }) => {

    try {

      const msg = messages[0]

      if (!msg.message) return
      if (msg.key.fromMe) return

      // =======================
      // 📝 GET MESSAGE TEXT
      // =======================

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        ""

      if (!text.startsWith(config.prefix)) return

      // =======================
      // 📌 COMMAND INFO
      // =======================

      const args =
        text.slice(config.prefix.length)
        .trim()
        .split(/ +/)

      const cmd =
        args.shift().toLowerCase()

      const from = msg.key.remoteJid
      const sender = msg.key.participant || from

      console.log(
        chalk.yellow(`CMD: ${cmd}`)
      )

      // =======================
      // 🏓 PING
      // =======================

      if (cmd === "ping") {

        await sock.sendMessage(from, {
          text: "🏓 Pong!"
        })

      }

      // =======================
      // 📜 MENU
      // =======================

      else if (
        cmd === "menu" ||
        cmd === "help"
      ) {

        const menu = `
╔══════════════════════╗
   🤖 *SAT LIMITED MD*
╚══════════════════════╝

👋 Hello!

🧠 AI:
➤ .ai
➤ .gpt
➤ .gemini

📥 Download:
➤ .play
➤ .song
➤ .video

🎨 Images:
➤ .imagine
➤ .sticker

👮 Admin:
➤ .ban
➤ .kick
➤ .mute

⚙️ General:
➤ .ping
➤ .menu
`

        await sock.sendMessage(from, {
          text: menu
        })
      }

      // =======================
      // OWNER
      // =======================

      else if (cmd === "owner") {

        await sock.sendMessage(from, {
          text:
`👑 Owner: ${config.ownerName}
📞 Number: ${config.ownerNumber}`
        })
      }

    } catch (err) {

      console.log(
        chalk.red("Error:"),
        err
      )
    }
  })
}

// =======================
// ▶️ START
// =======================

startBot()