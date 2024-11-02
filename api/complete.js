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

        // Подготавливаем данные для обновления с учетом типов полей Airtable
        const progressData = {
            fields: {
                UserLogin: userLogin, // Single line text
                Status: 'Completed', // Single select
                Stage: 'reading', // Single select
                Level: 'pre-A1', // Single select
                CorrectCount: Number(correctCount || 0), // Number
                IncorrectCount: Number(incorrectCount || 0), // Number
                TotalQuestions: Number(totalQuestions || 0), // Number
                CurrentQuestionId: '', // Single line text
                AnsweredQuestions: '[]', // Long text
                TimeSpent: 0, // Number
                FinalLevel: String(finalLevel || 'N/A'), // Single line text
                FinalWSS: Number(finalWss || 0), // Number
                CompletedAt: new Date(timestamp || Date.now()).toISOString() // Date
            }
        };

        console.log('Updating progress with data:', progressData);

        // Обновляем запись
        const progressResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}/${recordId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(progressData)
            }
        );

        if (!progressResponse.ok) {
            const errorData = await progressResponse.json();
            console.error('Airtable error response:', errorData);
            throw new Error(`Failed to update progress: ${progressResponse.status}. Details: ${JSON.stringify(errorData)}`);
        }

        const progressResult = await progressResponse.json();
        console.log('Progress update result:', progressResult);

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
        const storyResponse = await fetch(
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
                        FinalLevel: finalLevel || 'N/A',
                        FinalWSS: finalWss || 0,
                        CorrectCount: correctCount || 0,
                        IncorrectCount: incorrectCount || 0,
                        TotalQuestions: totalQuestions || 0,
                        CompletedAt: timestamp || new Date().toISOString(),
                        ForcedCompletion: forcedCompletion || false
                    }
                })
            }
        );

        if (!storyResponse.ok) {
            console.error('Ошибка при сохранении в Story:', await storyResponse.json());
        } else {
            console.log('Результаты успешно сохранены в Story');
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
            message: error.message,
            stack: error.stack
        });
    }
};
