const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

async function safeFetch(url, timeoutMs = 4000) {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
        return res.status(400).json({ error: 'No parameters provided' });
    }

    const streams = [];

    const tasks = [
        // 1. Alloha API (Прямые манифесты)
        (async () => {
            if (!kpId) return;
            const data = await safeFetch('https://api.alloha.tv/?token=2b262a3c5da2f165f3e745020968b1&kp=' + kpId);
            if (data && data.data && data.data.m3u8) {
                streams.push({
                    name: 'Alloha (HLS Direct)',
                    quality: '1080p / Auto',
                    url: data.data.m3u8
                });
            }
        })(),

        // 2. Kinobox / Публичный шлюз HLS
        (async () => {
            if (!kpId) return;
            const data = await safeFetch('https://kinobox.net/api/players?kinopoisk=' + kpId);
            if (data && Array.isArray(data)) {
                data.forEach(player => {
                    if (player.url && player.url.includes('.m3u8')) {
                        streams.push({
                            name: player.name || 'Kinobox Stream',
                            quality: 'Auto HLS',
                            url: player.url
                        });
                    }
                });
            }
        })(),

        // 3. Kodik API (прямой поиск)
        (async () => {
            if (!kpId && !title) return;
            const query = kpId ? 'kinopoisk_id=' + kpId : 'title=' + encodeURIComponent(title);
            const data = await safeFetch('https://kodikapi.com/search?token=3b88126e31991206132034e32049d52f&' + query);
            
            if (data && data.results && data.results.length > 0) {
                data.results.slice(0, 3).forEach(item => {
                    if (item.link) {
                        const linkUrl = item.link.startsWith('//') ? 'https:' + item.link : item.link;
                        streams.push({
                            name: 'Kodik: ' + (item.translation?.title || 'Озвучка'),
                            quality: item.quality || '720p',
                            url: linkUrl
                        });
                    }
                });
            }
        })()
    ];

    await Promise.allSettled(tasks);

    // Очищенный резервный вариант
    if (streams.length === 0 && kpId) {
        streams.push({
            name: 'Lumen Universal HLS',
            quality: 'Auto HLS',
            url: 'https://vidsrc.stream/m3u8/' + kpId + '.m3u8'
        });
    }

    res.json(streams);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Lumen Engine online on port ' + PORT));
