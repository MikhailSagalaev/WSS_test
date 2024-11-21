// api/saveAnswer.js
const fetch = require('node-fetch');
const cors = require('./middleware/cors');

module.exports = async (req, res) => {
    // Используем middleware для CORS
    if (cors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_ANSWERS_HISTORY_TABLE } = process.env;

    // Проверяем наличие необходимых переменных окружения
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_ANSWERS_HISTORY_TABLE) {
        console.error('Missing environment variables:', {
            hasAirtablePat: !!AIRTABLE_PAT,
            hasBaseId: !!AIRTABLE_BASE_ID,
            hasAnswersTable: !!AIRTABLE_ANSWERS_HISTORY_TABLE
        });
        return res.status(500).json({ error: 'Server configuration error' });
    }

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

        const createData = {
            fields: {
                "User Login": userLogin,
                "Question ID": questionId,
                "Stage": stage,
                "Level": level,
                "Question Type": questionType,
                "User Answer": JSON.stringify(userAnswer),
                "Is Correct": isCorrect ? '1' : '0',
                "Time Spent": timeSpent,
                "Timestamp": timestamp
            }
        };

        // Корректно кодируем имя таблицы для URL
        const encodedTableName = encodeURIComponent(AIRTABLE_ANSWERS_HISTORY_TABLE);
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTableName}`;
        
        console.log('Sending data to Airtable:', {
            baseId: AIRTABLE_BASE_ID,
            tableName: AIRTABLE_ANSWERS_HISTORY_TABLE,
            data: createData
        });

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
            console.error('Airtable error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(JSON.stringify(errorData));
        }

        const result = await response.json();
        console.log('Successfully saved to Airtable:', result);

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error saving answer:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};