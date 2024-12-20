const fetch = require('node-fetch');
const cors = require('./middleware/cors');

module.exports = async (req, res) => {
    // Проверка CORS
    if (cors(req, res)) return;

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_STORY_TABLE } = process.env;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STORY_TABLE)}`;

    console.log("Запрос к Airtable:", url);
    console.log("Данные для отправки:", req.body);

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
        console.error('Подробности:', error.stack);
        res.status(500).json({ error: 'Ошибка при отправке результатов' });
    }
};
