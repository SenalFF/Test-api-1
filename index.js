const express = require('express');
const ytdl = require('ytdl-core');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const rateLimit = require('express-rate-limit');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.set('trust proxy', 1); // Required for Express Rate Limit behind reverse proxies like Koyeb
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

const PORT = process.env.PORT || 3000;

app.get('/download/mp4', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!ytdl.validateURL(videoUrl)) return res.status(400).send('Invalid URL');

    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);

    ytdl(videoUrl, { quality: '18' }).pipe(res); // 360p
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to download MP4. Possibly due to invalid or restricted video.');
  }
});

app.get('/download/mp3', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!ytdl.validateURL(videoUrl)) return res.status(400).send('Invalid URL');

    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

    res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);

    const stream = ytdl(videoUrl, { quality: 'highestaudio' });

    ffmpeg(stream)
      .audioBitrate(128)
      .format('mp3')
      .pipe(res, { end: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to download MP3. Possibly due to invalid or restricted video.');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
