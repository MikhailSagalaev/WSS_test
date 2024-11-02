// api/progress.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', 'https://wiseman-skills.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка preflight запросов
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;

    if (req.method === 'GET') {
        try {
            const userLogin = req.query.userLogin;
            const filterFormula = `({UserLogin} = '${userLogin}')`;
            
            const response = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}?filterByFormula=${encodeURIComponent(filterFormula)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_PAT}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.records && data.records.length > 0) {
                const record = data.records[0].fields;
                const progress = {
                    correctCount: record.CorrectCount || 0,
                    incorrectCount: record.IncorrectCount || 0,
                    totalQuestions: record.TotalQuestions || 0,
                    correctHigherLevel: record.CorrectHigherLevel || 0,
                    incorrectLowerLevel: record.IncorrectLowerLevel || 0,
                    questionsOnCurrentLevel: record.QuestionsOnCurrentLevel || 0,
                    stage: record.Stage || 'reading',
                    level: record.Level,
                    currentQuestionId: record.CurrentQuestionId,
                    answeredQuestions: record.AnsweredQuestions ? JSON.parse(record.AnsweredQuestions) : []
                };
                
                res.status(200).json({ progress });
            } else {
                res.status(200).json({ progress: null });
            }
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    } else if (req.method === 'POST') {
        try {
            const { 
                userLogin, 
                stage, 
                level, 
                correctCount, 
                incorrectCount, 
                totalQuestions, 
                correctHigherLevel, 
                incorrectLowerLevel,
                questionsOnCurrentLevel,
                currentQuestionId,
                answeredQuestions,
                timestamp 
            } = req.body;

            const progressData = {
                records: [{
                    fields: {
                        UserLogin: userLogin,
                        Stage: stage,
                        Level: level,
                        CorrectCount: correctCount,
                        IncorrectCount: incorrectCount,
                        TotalQuestions: totalQuestions,
                        CorrectHigherLevel: correctHigherLevel,
                        IncorrectLowerLevel: incorrectLowerLevel,
                        QuestionsOnCurrentLevel: questionsOnCurrentLevel,
                        CurrentQuestionId: currentQuestionId,
                        AnsweredQuestions: JSON.stringify(answeredQuestions),
                        Status: 'In Progress',
                        Timestamp: timestamp
                    }
                }]
            };

            // Проверяем существующую запись
            const existingResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}?filterByFormula=${encodeURIComponent(`{UserLogin} = '${userLogin}'`)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_PAT}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const existingData = await existingResponse.json();

            let response;
            if (existingData.records && existingData.records.length > 0) {
                // Обновляем существующую запись
                response = await fetch(
                    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}/${existingData.records[0].id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_PAT}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ fields: progressData.records[0].fields })
                    }
                );
            } else {
                // Создаем новую запись
                response = await fetch(
                    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${AIRTABLE_PAT}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(progressData)
                    }
                );
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            res.status(200).json({ message: 'Прогресс успешно сохранён.' });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
