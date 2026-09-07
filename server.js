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
        // 1. Alloha API (Прямой HLS поток)
        (async () => {
            if (!kpId) return;
            try {
                const r = await fetchWithTimeout(`https://api.alloha.tv/?token=2b262a3c5da2f165f3e745020968b1&kp=${kpId}`);
                if (r && r.ok) {
                    const data = await r.json();
                    if (data?.data?.m3u8) {
                        streams.push({
                            name: 'Alloha (Прямой HLS)',
                            quality: '1080p / Auto',
                            url: data.data.m3u8
                        });
                    }
                }
            } catch (e) {}
        })(),

        // 2. Collaps Direct Stream
        (async () => {
            if (!kpId) return;
            try {
                const r = await fetchWithTimeout(`https://api.collaps.org/m3u8/index/kp/${kpId}`);
                if (r && r.ok) {
                    const data = await r.json();
                    if (data?.m3u8) {
                        streams.push({
                            name: 'Collaps (Прямой HLS)',
                            quality: '1080p',
                            url: data.m3u8
                        });
                    }
                }
            } catch (e) {}
        })(),

        // 3. Открытый шлюз Kinopoisk HLS
        (async () => {
            if (!kpId) return;
            try {
                const testUrl = `https://stream.voidboost.cc/movie/${kpId}.m3u8`;
                const r = await fetchWithTimeout(testUrl, { method: 'HEAD' });
                if (r && r.ok) {
                    streams.push({
                        name: 'HDRezka / Voidboost (HLS Stream)',
                        quality: 'Auto HLS',
                        url: testUrl
                    });
                }
            } catch (e) {}
        })()
    ];

    await Promise.allSettled(tasks);

    // Фолбэк: Прямой резервный HLS манифест
    if (streams.length === 0 && kpId) {
        streams.push({
            name: 'Lumen Direct HLS (Резерв)',
            quality: 'Auto',
            url: `https://vidsrc.stream/m3u8/${kpId}.m3u8`
        });
    }

    res.json(streams);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
