// api/saveAnswer.js
const fetch = require('node-fetch');
const cors = require('./middleware/cors');

module.exports = async (req, res) => {
    // Проверка CORS
    if (cors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_ANSWERS_HISTORY_TABLE } = process.env;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_ANSWERS_HISTORY_TABLE)}`;

    try {
        const createData = {
            fields: {
                UserLogin: req.body.userLogin,
                QuestionID: req.body.questionId,
                Stage: req.body.stage,
                Level: req.body.level,
                QuestionType: req.body.questionType,
                UserAnswer: JSON.stringify(req.body.userAnswer),
                IsCorrect: req.body.isCorrect,
                TimeSpent: req.body.timeSpent,
                Timestamp: req.body.timestamp
            }
        };

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
            throw new Error(JSON.stringify(errorData));
        }

        const result = await response.json();
        res.status(200).json({ success: true, data: result });

    } catch (error) {
        console.error('Error saving answer:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
};