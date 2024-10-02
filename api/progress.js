// api/progress.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;
    const { stage, currentLevel, questionIndex, correctCount, totalQuestions, userLogin } = req.body;

    if (!stage || !userLogin) {
        return res.status(400).json({ error: 'Недостаточно данных для сохранения прогресса' });
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}`;

    const body = {
        records: [
            {
                fields: {
                    Stage: stage,
                    UserLogin: userLogin,
                    CurrentLevel: currentLevel,
                    QuestionIndex: questionIndex,
                    CorrectCount: correctCount,
                    TotalQuestions: totalQuestions,
                    Timestamp: new Date().toISOString()
                }
            }
        ]
    };

    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${AIRTABLE_PAT}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error });
        }
        res.status(200).json({ message: 'Прогресс успешно сохранен' });
    } catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};