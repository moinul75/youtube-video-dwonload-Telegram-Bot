const express = require("express");
const dotenv = require("dotenv");
const app = express();
dotenv.config();
const port = process.env.PORT || 4030;

app.listen(port, (req, res) => {
  console.log(`server is running on port http://localhost:${port}`);
});

//setup telegram bot and youtube download
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const ytdl = require("ytdl-core");

const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Download the video and send the video file
async function downloadVideo(chatId, url) {
  try {
    // Get video information and thumbnail URL
    const videoInfo = await ytdl.getInfo(url);
    const title = videoInfo.player_response.videoDetails.title;

    // Sanitize the title by removing characters not allowed in file names
    const sanitizedTitle = title.replace(/[|:,]/g, "");

    const thumbnailUrl =
      videoInfo.videoDetails.thumbnails[
        videoInfo.videoDetails.thumbnails.length - 1
      ].url;

    // Directory path for saving the video
    const downloadPath =
      "F:/NodeJsProjects/telegram Bot/youTube dwonloader/dwonload/";

    // Check if the directory exists, if not, create it
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    // Get available video formats
    // Find the format with the highest resolution available

    // Create a writable stream to store the video file
    const writeStream = fs.createWriteStream(
      `${downloadPath}${sanitizedTitle}-${chatId}.mp4`
    );

    // Start the download and pipe the video data to the writable stream
    ytdl(url, { filter: "audioandvideo" }).pipe(writeStream);

    // Send a message to show the download progress
    const message = await bot.sendMessage(
      chatId,
      `*Downloading video:* ${title}`
    );

    // Set up an interval to update the message with the download progress every 2 seconds
    let progress = 0;
    const updateInterval = setInterval(() => {
      progress = writeStream.bytesWritten / (1024 * 1024);
      bot.editMessageText(
        `*Downloading video:* ${title} (${progress.toFixed(2)} MB) \u{1F4E6}`,
        {
          chat_id: chatId,
          message_id: message.message_id,
          parse_mode: "Markdown", // use Markdown formatting
        }
      );
    }, 2000);

    // When the download is complete, send the video and delete the file
    writeStream.on("finish", () => {
      clearInterval(updateInterval); // stop updating the message
      bot
        .sendVideo(chatId, `${downloadPath}${sanitizedTitle}-${chatId}.mp4`, {
          caption: `*Video downloaded:* ${title} "by" @Udoy752 🏯`,
          thumb: thumbnailUrl,
          duration: videoInfo.videoDetails.lengthSeconds,
          parse_mode: "Markdown",
        })
        .then(() => {
          fs.unlinkSync(`${downloadPath}${sanitizedTitle}-${chatId}.mp4`); // delete the file
        })
        .catch((error) => {
          bot.sendMessage(chatId, "Error sending video.");
          console.error(error);
        });
    });
  } catch (error) {
    bot.sendMessage(chatId, "Error downloading video.");
    console.error(error);
  }
}

// Listen for the /yt command
bot.onText(/\/yt/, (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text.split(" ")[1];

  if (ytdl.validateURL(url)) {
    downloadVideo(chatId, url);
  } else {
    bot.sendMessage(chatId, "Invalid YouTube URL.");
  }
});

// Initial start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Welcome to the YouTube video downloader Telegram bot. This bot is created by Moinul Islam. You can use the command /yt followed by any YouTube video link, and I will download it for you."
  );
});