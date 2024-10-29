// api/saveAnswer.js
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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_ANSWERS_HISTORY_TABLE } = process.env;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_ANSWERS_HISTORY_TABLE)}`;

    const { 
        userLogin,
        questionId,
        stage,
        level,
        questionType,
        userAnswer,
        isCorrect,
        timeSpent,
        timestamp
    } = req.body;

    try {
        const createData = {
            fields: {
                UserLogin: userLogin,
                QuestionID: questionId,
                Stage: stage,
                Level: level,
                QuestionType: questionType,
                UserAnswer: JSON.stringify(userAnswer),
                IsCorrect: isCorrect,
                TimeSpent: timeSpent,
                Timestamp: timestamp
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(createData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Ошибка при сохранении ответа:", errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        res.status(200).json({ message: 'Ответ успешно сохранен' });
    } catch (error) {
        console.error("Ошибка при сохранении ответа:", error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
    }
};