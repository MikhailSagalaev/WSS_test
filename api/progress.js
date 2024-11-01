// api/progress.js
const fetch = require('node-fetch');
const cors = require('./middleware/cors');

module.exports = async (req, res) => {
    // Проверка CORS
    if (cors(req, res)) return;

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;

    if (req.method === 'GET') {
        try {
            const userLogin = req.query.userLogin;
            if (!userLogin) {
                return res.status(400).json({ error: 'UserLogin is required' });
            }

            const filterFormula = `({UserLogin} = '${userLogin}')`;
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}?filterByFormula=${encodeURIComponent(filterFormula)}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Airtable API error: ${response.status}`);
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
            console.log('Получены данные прогресса:', req.body);

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

            if (!userLogin) {
                throw new Error('UserLogin is required');
            }

            const progressData = {
                fields: {
                    UserLogin: userLogin,
                    Stage: stage,
                    Level: level,
                    CorrectCount: correctCount || 0,
                    IncorrectCount: incorrectCount || 0,
                    TotalQuestions: totalQuestions || 0,
                    CorrectHigherLevel: correctHigherLevel || 0,
                    IncorrectLowerLevel: incorrectLowerLevel || 0,
                    QuestionsOnCurrentLevel: questionsOnCurrentLevel || 0,
                    CurrentQuestionId: currentQuestionId || '',
                    AnsweredQuestions: JSON.stringify(answeredQuestions || []),
                    Status: 'In Progress',
                    Timestamp: timestamp || new Date().toISOString()
                }
            };

            console.log('Подготовленные данные для Airtable:', progressData);

            // Проверяем существующую запись
            const records = await base(AIRTABLE_PROGRESS_TABLE)
                .select({
                    filterByFormula: `{UserLogin} = '${userLogin}'`
                })
                .firstPage();

            let response;
            if (records && records.length > 0) {
                response = await base(AIRTABLE_PROGRESS_TABLE).update([
                    {
                        id: records[0].id,
                        fields: progressData.fields
                    }
                ]);
            } else {
                response = await base(AIRTABLE_PROGRESS_TABLE).create([progressData]);
            }

            console.log('Ответ от Airtable:', response);
            res.status(200).json({ message: 'Прогресс успешно сохранён.' });
        } catch (error) {
            console.error("Ошибка при сохранении прогресса:", error);
            res.status(500).json({ 
                error: 'Internal Server Error', 
                message: error.message,
                stack: error.stack 
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
