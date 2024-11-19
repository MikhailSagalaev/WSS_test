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
            console.log('Запрос прогресса для пользователя:', userLogin);
            
            const records = await base(AIRTABLE_PROGRESS_TABLE)
                .select({
                    filterByFormula: `{UserLogin} = '${userLogin}'`,
                    sort: [{ field: 'Timestamp', direction: 'desc' }],
                    maxRecords: 1
                })
                .firstPage();

            console.log('Полученные записи:', records);

            if (records && records.length > 0) {
                const record = records[0].fields;
                console.log('Поля записи:', record);
                
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
                
                console.log('Отправляемый прогресс:', progress);
                res.status(200).json({ progress });
            } else {
                console.log('Записи не найдены');
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
