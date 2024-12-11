// api/questions.js
const fetch = require('node-fetch');
const cors = require('./middleware/cors');
const { GOOGLE_DRIVE_API_KEY } = process.env;

// Добавить функцию обработки Google Drive ссылок
const processAudioUrl = (url) => {
    if (url && url.includes('drive.google.com')) {
        // Извлекаем ID файла из URL
        const fileId = url.match(/id=([^&]+)/)?.[1];
        if (fileId) {
            // Формируем прямую ссылку для воспроизведения
            return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${GOOGLE_DRIVE_API_KEY}`;
        }
    }
    return url;
};

module.exports = async (req, res) => {
    if (cors(req, res)) return;

    console.log("Получен запрос к /api/questions");

    if (req.method !== 'GET') {
        console.warn(`Метод ${req.method} не разрешён`);
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    try {
        const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_QUESTIONS_TABLE } = process.env;
        const baseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_QUESTIONS_TABLE)}`;
        
        // Массив для хранения всех записей
        let allRecords = [];
        let offset = null;

        // Цикл для получения всех страниц
        do {
            const url = offset 
                ? `${baseUrl}?offset=${offset}`
                : baseUrl;

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
            
            // Добавляем записи в общий массив
            allRecords = allRecords.concat(data.records);
            
            // Получаем offset для следующей страницы
            offset = data.offset;

        } while (offset); // Продолжаем, пока есть следующая страница

        console.log(`Всего загружено вопросов: ${allRecords.length}`);

        // Преобразуем данные
        const questions = allRecords.map(record => ({
            id: record.id,
            fields: {
                ...record.fields,
                Audio: Array.isArray(record.fields.Audio)
                    ? (record.fields.Audio.length > 0 ? processAudioUrl(record.fields.Audio[0].url) : null)
                    : (processAudioUrl(record.fields.Audio) || null),
                TimeLimit: record.fields.TimeLimit !== undefined ? Number(record.fields.TimeLimit) : null
            }
        }));

        res.status(200).json(questions);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};