const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Настройка CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Обработка OPTIONS запросов
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_STORY_TABLE } = process.env;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STORY_TABLE)}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: req.body
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        res.status(200).json(result);
    } catch (error) {
        console.error('Ошибка при отправке результатов в Airtable:', error);
        res.status(500).json({ error: 'Ошибка при отправке результатов' });
    }
};
