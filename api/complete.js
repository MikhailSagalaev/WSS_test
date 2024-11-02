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
        console.log('Received request body:', req.body);

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

        // Получаем существующую запись
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

        const data = await getResponse.json();
        console.log('Current record:', data);

        if (!data.records || data.records.length === 0) {
            throw new Error('No progress record found');
        }

        const recordId = data.records[0].id;

        // Подготавливаем данные для обновления
        const updateFields = {
            Status: 'Completed',
            FinalLevel: String(finalLevel || 'N/A'),
            FinalWSS: Number(finalWss || 0),
            CorrectCount: Number(correctCount || 0),
            IncorrectCount: Number(incorrectCount || 0),
            TotalQuestions: Number(totalQuestions || 0),
            CompletedAt: timestamp || new Date().toISOString(),
            AnsweredQuestions: '[]'
        };

        console.log('Update fields:', updateFields);

        // Обновляем запись
        const updateResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}/${recordId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: updateFields
                })
            }
        );

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error('Update response error:', errorData);
            throw new Error(`Failed to update record: ${updateResponse.status}. Error: ${JSON.stringify(errorData)}`);
        }

        const updateResult = await updateResponse.json();
        console.log('Update result:', updateResult);

        // Логируем процесс обновления попыток
        console.log('Получаем данные пользователя:', userLogin);
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

        const userData = await userResponse.json();
        console.log('Данные пользователя:', userData);

        if (userData.records && userData.records.length > 0) {
            const userRecord = userData.records[0];
            const currentAttempts = Number(userRecord.fields.TestAttempts || 0);
            console.log('Текущее количество попыток:', currentAttempts);

            const updateResponse = await fetch(
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

            if (!updateResponse.ok) {
                console.error('Ошибка при обновлении попыток:', await updateResponse.json());
            } else {
                console.log('Попытки успешно обновлены');
            }
        } else {
            console.error('Пользователь не найден:', userLogin);
        }

        // После успешного обновления прогресса
        // Сохраняем результаты в Story таблицу
        const { AIRTABLE_STORY_TABLE } = process.env;
        await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STORY_TABLE)}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        UserLogin: userLogin,
                        FinalLevel: String(finalLevel || 'N/A'),
                        FinalWSS: Number(finalWss || 0),
                        CorrectCount: Number(correctCount || 0),
                        IncorrectCount: Number(incorrectCount || 0),
                        TotalQuestions: Number(totalQuestions || 0),
                        CompletedAt: timestamp || new Date().toISOString()
                    }
                })
            }
        );

        res.status(200).json({
            message: 'Тест успешно завершён, результаты сохранены и TestAttempts уменьшены.',
            finalLevel,
            finalWss
        });
    } catch (error) {
        console.error('Error in /api/complete:', error);
        res.status(500).json({ 
            error: 'Internal Server Error', 
            message: error.message,
            stack: error.stack
        });
    }
};
