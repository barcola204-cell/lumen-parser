const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Функция безопасного запроса с подменой User-Agent
async function safeFetch(url, timeoutMs = 4500) {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
                'Accept': 'application/json, text/plain, */*'
            }
        });
        clearTimeout(id);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
}

app.get('/parse', async (req, res) => {
    const kpId = req.query.kp;
    const title = req.query.title;

    if (!kpId && !title) {
        return res.status(400).json({ error: 'No query parameters' });
    }

    const streams = [];

    const tasks = [
        // 1. Alloha API
        (async () => {
            if (!kpId) return;
            const data = await safeFetch(`https://api.alloha.tv/?token=2b262a3c5da2f165f3e745020968b1&kp=${kpId}`);
            if (data && data.data && data.data.m3u8) {
                streams.push({
                    name: 'Alloha (1080p HLS)',
                    quality: 'Auto / 1080p',
                    url: data.data.m3u8
                });
            }
        })(),

        // 2. Kodik API
        (async () => {
            if (!kpId && !title) return;
            const query = kpId ? `kinopoisk_id=${kpId}` : `title=${encodeURIComponent(title)}`;
            const data = await safeFetch(`https://kodikapi.com/search?token=3b88126e31991206132034e32049d52f&${query}`);
            
            if (data && data.results && data.results.length > 0) {
                data.results.slice(0, 3).forEach((item) => {
                    if (item.link) {
                        var streamUrl = item.link.startsWith('//') ? 'https:' + item.link : item.link;
                        streams.push({
                            name: 'Kodik: ' + (item.translation?.title || 'Озвучка'),
                            quality: item.quality || '720p',
                            url: streamUrl
                        });
                    }
                });
            }
        })(),

        // 3. Collaps API
        (async () => {
            if (!kpId) return;
            const data = await safeFetch(`https://api.collaps.org/m3u8/index/kp/${kpId}`);
            if (data && data.m3u8) {
                streams.push({
                    name: 'Collaps (1080p Direct)',
                    quality: '1080p',
                    url: data.m3u8
                });
            }
        })()
    ];

    await Promise.allSettled(tasks);

    // ЧИСТЫЙ ФОЛБЭК БЕЗ МАРКДАУН-СКОБОК И МУСОРА В ССЫЛКЕ
    if (streams.length === 0 && kpId) {
        streams.push({
            name: 'Lumen Universal Stream',
            quality: 'Auto HLS',
            url: 'https://vidsrc.stream/m3u8/' + kpId + '.m3u8'
        });
    }

    res.json(streams);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Lumen Engine server online on port ' + PORT));
