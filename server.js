const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/parse', async (req, res) => {
    const kpId = req.query.kp;
    const title = req.query.title;

    if (!kpId && !title) {
        return res.status(400).json({ error: 'No parameters provided' });
    }

    const streams = [];

    try {
        // Опрос универсального агрегатора Kinobox
        const query = kpId ? `kinopoisk=${kpId}` : `title=${encodeURIComponent(title)}`;
        const response = await fetch(`https://kinobox.net/api/players?${query}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                data.forEach((item) => {
                    if (item.iframeUrl || item.url) {
                        streams.push({
                            name: item.name || 'Балансер',
                            quality: 'Auto HLS',
                            url: item.iframeUrl || item.url
                        });
                    }
                });
            }
        }
    } catch (e) {
        console.error(e);
    }

    // Резервный источник без мусорных символов
    if (streams.length === 0 && kpId) {
        streams.push({
            name: 'Lumen Universal Stream',
            quality: 'Auto',
            url: 'https://vidsrc.stream/m3u8/' + kpId + '.m3u8'
        });
    }

    res.json(streams);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Lumen Engine server running on port ' + PORT));

