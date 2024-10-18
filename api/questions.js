// api/questions.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log("Получен запрос к /api/questions");
    if (req.method !== 'GET') {
        console.warn(`Метод ${req.method} не разрешён`);
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    try {
        const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_QUESTIONS_TABLE } = process.env;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_QUESTIONS_TABLE)}`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Возвращаем данные как есть, без дополнительной обработки
        res.status(200).json(data.records);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
