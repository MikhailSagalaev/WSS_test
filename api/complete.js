// api/complete.js
const fetch = require('node-fetch');
const cors = require('./middleware/cors');

module.exports = async (req, res) => {
    // Проверка CORS
    if (cors(req, res)) return;

    console.log("Получен запрос к /api/complete");
    console.log("Тело запроса:", req.body);

    if (req.method !== 'POST') {
        console.warn(`Метод ${req.method} не разрешён`);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}`;

        // Получаем текущую запись прогресса пользователя
        const filterFormula = `({UserLogin} = '${req.body.userLogin}')`;
        const progressResponse = await fetch(
            `${url}?filterByFormula=${encodeURIComponent(filterFormula)}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const progressData = await progressResponse.json();

        if (progressData.records && progressData.records.length > 0) {
            const recordId = progressData.records[0].id;

            // Обновляем запись, устанавливая Status = 'Completed' и очищая AnsweredQuestions
            const updateResponse = await fetch(`${url}/${recordId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        Status: 'Completed',
                        AnsweredQuestions: '[]', // Очищаем список отвеченных вопросов
                        FinalLevel: req.body.finalLevel,
                        FinalWSS: req.body.finalWss,
                        CorrectCount: req.body.correctCount,
                        IncorrectCount: req.body.incorrectCount,
                        TotalQuestions: req.body.totalQuestions,
                        CompletedAt: new Date().toISOString()
                    }
                })
            });

            if (!updateResponse.ok) {
                throw new Error(`HTTP error! status: ${updateResponse.status}`);
            }

            // Уменьшаем количество доступных попыток
            const { AIRTABLE_USERS_TABLE } = process.env;
            const usersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
            
            const userResponse = await fetch(
                `${usersUrl}?filterByFormula=${encodeURIComponent(`{Email} = '${req.body.userLogin}'`)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_PAT}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const userData = await userResponse.json();
            if (userData.records && userData.records.length > 0) {
                const userRecord = userData.records[0];
                const currentAttempts = userRecord.fields.TestAttempts || 0;
                
                await fetch(`${usersUrl}/${userRecord.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_PAT}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: {
                            TestAttempts: Math.max(0, currentAttempts - 1)
                        }
                    })
                });
            }

            res.status(200).json({
                message: 'Тест успешно завершён, результаты сохранены и TestAttempts уменьшены.',
                finalLevel: req.body.finalLevel,
                finalWss: req.body.finalWss
            });
        } else {
            throw new Error('Progress record not found');
        }
    } catch (error) {
        console.error('Error in /api/complete:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};
