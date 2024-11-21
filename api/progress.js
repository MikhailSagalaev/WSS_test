// api/progress.js
const fetch = require('node-fetch');
const cors = require('./middleware/cors');

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
            console.log('Запрос прогресса для пользователя:', userLogin);
            
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
            console.log('Полученные записи:', data);

            if (data.records && data.records.length > 0) {
                const record = data.records[0].fields;
                const progress = {
                    Stage: record.Stage,
                    Level: record.Level,
                    CorrectCount: record.CorrectCount || 0,
                    IncorrectCount: record.IncorrectCount || 0,
                    TotalQuestions: record.TotalQuestions || 0,
                    CorrectHigherLevel: record.CorrectHigherLevel || 0,
                    IncorrectLowerLevel: record.IncorrectLowerLevel || 0,
                    QuestionsOnCurrentLevel: record.QuestionsOnCurrentLevel || 0,
                    CurrentQuestionId: record.CurrentQuestionId,
                    AnsweredQuestions: record.AnsweredQuestions
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
                questionsCountByLevel,
                timestamp 
            } = req.body;

            console.log('Получены данные прогресса:', {
                userLogin,
                questionsCountByLevel
            });

            const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;

            // Проверяем существование записи
            const existingRecordResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}?filterByFormula=${encodeURIComponent(`{UserLogin} = '${userLogin}'`)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_PAT}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const existingData = await existingRecordResponse.json();

            const updateData = {
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
                    QuestionsCountByLevel: JSON.stringify(questionsCountByLevel),
                    LastUpdated: timestamp
                }
            };

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
                        body: JSON.stringify(updateData)
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
                        body: JSON.stringify(updateData)
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
