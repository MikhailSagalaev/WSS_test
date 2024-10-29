// api/saveAnswer.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_ANSWERS_HISTORY_TABLE } = process.env;

    try {
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

        // Форматируем данные в соответствии со структурой таблицы
        const createData = {
            fields: {
                "User Login": userLogin,
                "Question ID": questionId,
                "Stage": stage,
                "Level": level,
                "Question Type": questionType,
                "User Answer": JSON.stringify(userAnswer),
                "Is Correct": isCorrect,
                "Time Spent": timeSpent,
                "Timestamp": timestamp
            }
        };

        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_ANSWERS_HISTORY_TABLE)}`;
        
        console.log('Отправка данных в Airtable:', createData);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(createData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Ошибка Airtable:', errorData);
            throw new Error(JSON.stringify(errorData));
        }

        const result = await response.json();
        console.log('Успешно сохранено в Airtable:', result);

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error saving answer:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};