const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

async function fetchWithTimeout(url, options = {}, timeout = 4000) {
    const controller = new (require('events').EventEmitter)();
    const timer = setTimeout(() => controller.emit('abort'), timeout);
    try {
        const res = await fetch(url, { ...options, signal: controller });
        clearTimeout(timer);
        return res;
    } catch (e) {
        return null;
    }
}

app.get('/parse', async (req, res) => {
    const kpId = req.query.kp;
    const title = req.query.title;

    if (!kpId && !title) {
        return res.status(400).json({ error: 'No parameters' });
    }

    const streams = [];

    const tasks = [
        // Alloha
        (async () => {
            if (!kpId) return;
            try {
                const r = await fetchWithTimeout(`https://api.alloha.tv/?token=2b262a3c5da2f165f3e745020968b1&kp=${kpId}`);
                if (r && r.ok) {
                    const data = await r.json();
                    if (data?.data?.iframe) {
                        streams.push({ name: 'Alloha', quality: 'Auto HLS', url: data.data.iframe });
                    }
                }
            } catch (e) {}
        })(),

        // Kodik
        (async () => {
            if (!kpId && !title) return;
            try {
                const query = kpId ? `kinopoisk_id=${kpId}` : `title=${encodeURIComponent(title)}`;
                const r = await fetchWithTimeout(`https://kodikapi.com/search?token=3b88126e31991206132034e32049d52f&${query}`);
                if (r && r.ok) {
                    const data = await r.json();
                    if (data?.results?.length > 0) {
                        data.results.slice(0, 3).forEach((item) => {
                            streams.push({
                                name: `Kodik (${item.translation?.title || 'Озвучка'})`,
                                quality: item.quality || '720p',
                                url: item.link
                            });
                        });
                    }
                }
            } catch (e) {}
        })(),

        // Voidboost / HDRezka
        (async () => {
            if (!kpId) return;
            streams.push({
                name: 'HDRezka / Voidboost',
                quality: 'Auto HLS',
                url: `https://voidboost.net/embed/${kpId}`
            });
        })()
    ];

    await Promise.allSettled(tasks);
    res.json(streams);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
