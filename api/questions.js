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
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Добавим логирование для проверки данных
        console.log("Данные, полученные из Airtable:", JSON.stringify(data, null, 2));

        // Преобразуем данные, чтобы убедиться, что TimeLimit и Audio корректно передаются
        const questions = data.records.map(record => ({
            id: record.id,
            fields: {
                ...record.fields,
                Audio: Array.isArray(record.fields.Audio)
                    ? (record.fields.Audio.length > 0 ? record.fields.Audio[0].url : null)
                    : (record.fields.Audio || null),
                TimeLimit: record.fields.TimeLimit !== undefined ? Number(record.fields.TimeLimit) : null
            }
        }));

        res.status(200).json(questions);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};