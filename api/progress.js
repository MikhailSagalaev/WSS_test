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
                status, 
                correctCount, 
                incorrectCount, 
                totalQuestions, 
                correctHigherLevel, 
                incorrectLowerLevel,
                questionsOnCurrentLevel,
                correctOnCurrentLevel,
                questionsCountByLevel,
                timestamp,
                currentQuestionId,
                answeredQuestions 
            } = req.body;

            // Проверяем обязательные поля
            if (!userLogin) {
                return res.status(400).json({ error: 'UserLogin is required' });
            }

            console.log('Данные для сохранения:', req.body);

            // Подготавливаем данные для Airtable
            const updateData = {
                fields: {
                    UserLogin: userLogin,
                    Stage: stage || 'reading',
                    Status: req.body.status || 'in progress',
                    Level: level || 'pre-A1',
                    CorrectCount: Number(correctCount) || 0,
                    IncorrectCount: Number(incorrectCount) || 0,
                    TotalQuestions: Number(totalQuestions) || 0,
                    CorrectHigherLevel: Number(correctHigherLevel) || 0,
                    IncorrectLowerLevel: Number(incorrectLowerLevel) || 0,
                    QuestionsOnCurrentLevel: Number(questionsOnCurrentLevel) || 0,
                    CurrentQuestionId: currentQuestionId || '',
                    AnsweredQuestions: Array.isArray(answeredQuestions) 
                        ? JSON.stringify(answeredQuestions) 
                        : '[]',
                        AnswersHistory: typeof answersHistory === 'string' 
                        ? answersHistory 
                        : JSON.stringify(answersHistory),   
                    Timestamp: timestamp || new Date().toISOString(),
                    QuestionsCountByLevel: typeof questionsCountByLevel === 'string' 
                        ? questionsCountByLevel 
                        : JSON.stringify(questionsCountByLevel)
                }
            };

            console.log('Данные для отправки в Airtable:', updateData);

            // Проверяем существование записи
            const filterFormula = `({UserLogin} = '${userLogin}')`;
            const existingRecordResponse = await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}?filterByFormula=${encodeURIComponent(filterFormula)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_PAT}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!existingRecordResponse.ok) {
                throw new Error(`Failed to check existing record: ${existingRecordResponse.status}`);
            }

            const existingData = await existingRecordResponse.json();

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
                        body: JSON.stringify({
                            records: [updateData]
                        })
                    }
                );
            }

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Airtable error:', errorData);
                throw new Error(`Airtable error: ${JSON.stringify(errorData)}`);
            }

            const result = await response.json();
            console.log('Успешно сохранено в Airtable:', result);

            res.status(200).json({ 
                message: 'Прогресс успешно сохранён.',
                data: result 
            });

        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ 
                error: 'Internal Server Error', 
                details: error.message,
                stack: error.stack 
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
