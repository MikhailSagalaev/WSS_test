// api/progress.js
const fetch = require('node-fetch');
const cors = require('./middleware/cors');

module.exports = async (req, res) => {
    // Проверка CORS
    if (cors(req, res)) return;

    if (req.method === 'GET') {
        try {
            const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}`;
            
            const userLogin = req.query.userLogin;
            const filterFormula = `({UserLogin} = '${userLogin}')`;
            
            const response = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}&sort%5B0%5D%5Bfield%5D=Timestamp&sort%5B0%5D%5Bdirection%5D=desc`, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                }
            });

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
            };

            // Проверяем существующую запись
            const filterFormula = `({UserLogin} = '${userLogin}')`;
            const existingRecord = await base(AIRTABLE_PROGRESS_TABLE)
                .select({ filterByFormula: filterFormula })
                .firstPage();

            let response;
            if (existingRecord && existingRecord.length > 0) {
                // Обновляем существующую запись
                response = await base(AIRTABLE_PROGRESS_TABLE).update([
                    {
                        id: existingRecord[0].id,
                        fields: progressData.fields
                    }
                ]);
            } else {
                // Создаем новую запись
                response = await base(AIRTABLE_PROGRESS_TABLE).create([progressData]);
            }

            res.status(200).json({ message: 'Прогресс успешно сохранён.' });
        } catch (error) {
            console.error("Ошибка при сохранении прогресса:", error);
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
