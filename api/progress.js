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
        console.log("Получен запрос к /api/progress");
        console.log("Тело запроса:", req.body);

        if (req.method !== 'POST') {
            console.warn(`Метод ${req.method} не разрешён`);
            return res.status(405).json({ error: 'Метод не разрешён' });
        }

        const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;

        const progressUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}`;

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
          timestamp 
        } = req.body;

        try {
            // Проверяем существующую запись прогресса
            const filterFormula = `({UserLogin} = "${userLogin}")`;
            const progressResponse = await fetch(`${progressUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
                headers: {
                    Authorization: `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!progressResponse.ok) {
                throw new Error(`HTTP error! status: ${progressResponse.status}`);
            }

            const progressData = await progressResponse.json();

            let recordId = null;

            if (progressData.records.length > 0) {
                // Запись существует, обновляем её
                recordId = progressData.records[0].id;
                const updateData = {
                    fields: {
                        Stage: stage,
                        Level: level,
                        CorrectCount: correctCount,
                        IncorrectCount: incorrectCount,
                        TotalQuestions: totalQuestions,
                        CorrectHigherLevel: correctHigherLevel,
                        IncorrectLowerLevel: incorrectLowerLevel,
                        QuestionsOnCurrentLevel: questionsOnCurrentLevel,
                        CurrentQuestionId: req.body.currentQuestionId,
                        AnsweredQuestions: JSON.stringify(Array.from(req.body.answeredQuestions || [])),
                        Status: req.body.status || 'In Progress',
                        Timestamp: timestamp
                    }
                };

                const updateResponse = await fetch(`${progressUrl}/${recordId}`, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_PAT}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    console.error("Ошибка при обновлении записи в Airtable:", errorData);
                    throw new Error(`HTTP error! status: ${updateResponse.status}`);
                }
            } else {
                // Запись не существует, создаём новую
                const createData = {
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
                        CurrentQuestionId: req.body.currentQuestionId,
                        AnsweredQuestions: JSON.stringify(Array.from(req.body.answeredQuestions || [])),
                        Status: req.body.status || 'In Progress',
                        Timestamp: timestamp
                    }
                };

                const createResponse = await fetch(progressUrl, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_PAT}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(createData)
                });

                if (!createResponse.ok) {
                    const errorData = await createResponse.json();
                    console.error("Ошибка при создании записи в Airtable:", errorData);
                    throw new Error(`HTTP error! status: ${createResponse.status}`);
                }
            }

            res.status(200).json({ message: 'Прогресс успешно сохранён.' });

        } catch (error) {
            console.error("Ошибка при сохранении прогресса:", error);
            res.status(500).json({ 
                error: 'Внутренняя ошибка сервера', 
                details: error.message,
                requestBody: req.body 
            });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
