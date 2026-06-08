module.exports = {
  name: "joke",
  description: "Get a random joke",
  async execute(sock, m, args, cmdName, { commands, botSettings }) {
    try {
      const jokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "What do you call a fake noodle? An impasta!",
        "Why did the scarecrow win an award? He was outstanding in his field!",
        "What's the best thing about Switzerland? I don't know, but their flag is a big plus.",
        "Why don't eggs tell jokes? They'd crack each other up!",
        "What do you call a bear with no teeth? A gummy bear!",
        "Why did the cookie go to the doctor? Because it felt crumbly!",
        "What's orange and sounds like a parrot? A carrot!",
        "Why did the bicycle fall over? It was two-tired!",
        "What did one ocean say to the other ocean? Nothing, they just waved!",
        "Why don't skeletons fight each other? They don't have the guts!",
        "What do you call a pig that does karate? A pork chop!",
        "Why did the coffee file a police report? It got mugged!",
        "What's a computer's favorite snack? Microchips!",
        "Why did the math book look sad? Because it had too many problems!"
      ];

      const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
      
      await m.reply(`😂 *Random Joke*\n\n${randomJoke}`);
    } catch (error) {
      console.error("Joke command error:", error);
      await m.reply(`❌ Error fetching joke: ${error.message}`);
    }
  }
};
