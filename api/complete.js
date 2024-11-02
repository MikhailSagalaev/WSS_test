// api/complete.js
const fetch = require('node-fetch');
const cors = require('./middleware/cors');

module.exports = async (req, res) => {
    // Проверка CORS
    if (cors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { 
            userLogin, 
            finalLevel, 
            finalWss, 
            correctCount, 
            incorrectCount, 
            totalQuestions, 
            timestamp 
        } = req.body;

        if (!userLogin) {
            return res.status(400).json({ error: 'UserLogin is required' });
        }

        const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;

        // Сначала получаем существующую запись
        const filterFormula = `({UserLogin} = '${userLogin}')`;
        const getResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}?filterByFormula=${encodeURIComponent(filterFormula)}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!getResponse.ok) {
            throw new Error(`Failed to get record: ${getResponse.status}`);
        }

        const data = await getResponse.json();
        
        if (!data.records || data.records.length === 0) {
            throw new Error('No progress record found');
        }

        const recordId = data.records[0].id;

        // Обновляем запись с результатами теста
        const updateResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}/${recordId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        Status: 'Completed',
                        FinalLevel: finalLevel || 'N/A',
                        FinalWSS: finalWss || 0,
                        CorrectCount: correctCount || 0,
                        IncorrectCount: incorrectCount || 0,
                        TotalQuestions: totalQuestions || 0,
                        CompletedAt: timestamp || new Date().toISOString(),
                        AnsweredQuestions: '[]' // Очищаем список отвеченных вопросов
                    }
                })
            }
        );

        if (!updateResponse.ok) {
            throw new Error(`Failed to update record: ${updateResponse.status}`);
        }

        // Обновляем количество попыток в таблице пользователей
        const { AIRTABLE_USERS_TABLE } = process.env;
        const userResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}?filterByFormula=${encodeURIComponent(`{Email} = '${userLogin}'`)}`,
            {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!userResponse.ok) {
            throw new Error(`Failed to get user: ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        if (userData.records && userData.records.length > 0) {
            const userRecord = userData.records[0];
            const currentAttempts = userRecord.fields.TestAttempts || 0;

            await fetch(
                `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}/${userRecord.id}`,
                {
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
                }
            );
        }

        res.status(200).json({
            message: 'Тест успешно завершён, результаты сохранены и TestAttempts уменьшены.',
            finalLevel,
            finalWss
        });
    } catch (error) {
        console.error('Error in /api/complete:', error);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            message: error.message 
        });
    }
};
