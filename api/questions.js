// api/questions.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log("Получен запрос к /api/questions");
    if (req.method !== 'GET') {
        console.warn(`Метод ${req.method} не разрешён`);
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_QUESTIONS_TABLE } = process.env;

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_QUESTIONS_TABLE)}`;

    const options = {
        headers: {
            Authorization: `Bearer ${AIRTABLE_PAT}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Ошибка при получении данных из Airtable:", errorData);
            return res.status(response.status).json({ error: errorData.error });
        }
        const data = await response.json();
        console.log("Данные успешно получены из Airtable:", data.records.length, "записей");
        res.status(200).json(data);
    } catch (error) {
        console.error("Внутренняя ошибка сервера:", error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};