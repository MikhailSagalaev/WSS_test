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
            timestamp,
            forcedCompletion,
            readingCorrectCount,
            readingIncorrectCount,
            readingLevel,
            readingWss,
            listeningCorrectCount,
            listeningIncorrectCount,
            listeningLevel,
            listeningWss,
            stagesResults
        } = req.body;

        if (!userLogin) {
            return res.status(400).json({ error: 'UserLogin is required' });
        }

        const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;

        // Получам существующую запись
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

        // Подготавливаем данные для обновления только с существующими полями
        const progressData = {
            fields: {
                UserLogin: userLogin,
                Status: 'Completed',
                Stage: 'reading',
                Level: 'pre-A1',
                CorrectCount: Number(correctCount || 0),
                IncorrectCount: Number(incorrectCount || 0),
                TotalQuestions: Number(totalQuestions || 0),
                CurrentQuestionId: '',
                AnsweredQuestions: '[]',
                FinalLevel: String(finalLevel || 'N/A'),
                FinalWSS: Number(finalWss || 0),
                CompletedAt: new Date(timestamp || Date.now()).toISOString(),
                QuestionsOnCurrentLevel: 0,
                QuestionsCountByLevel: JSON.stringify({
                    'pre-A1': 0,
                    'A1': 0,
                    'A2': 0,
                    'B1': 0,
                    'B2': 0,
                    'C1': 0
                })
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

        // Логируем процесс обновлеия попыток
        console.log('Получаем данные пользователя:', userLogin);
        const { AIRTABLE_USERS_TABLE } = process.env;
        const userResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}?filterByFormula=${encodeURIComponent(`{login} = '${userLogin}'`)}`,
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
        console.log('Сохраняем результаты в Story таблицу');
        const { AIRTABLE_STORY_TABLE } = process.env;

        // Проверяем наличие переменной окружения
        if (!AIRTABLE_STORY_TABLE) {
            console.error('AIRTABLE_STORY_TABLE не определена');
            throw new Error('AIRTABLE_STORY_TABLE not configured');
        }

        const storyData = {
            fields: {
                UserLogin: userLogin,
                FinalLevel: String(finalLevel || 'N/A'),
                FinalWSS: Number(finalWss || 0),
                CorrectCount: Number(correctCount || 0),
                IncorrectCount: Number(incorrectCount || 0),
                TotalQuestions: Number(totalQuestions || 0),
                CompletedAt: new Date(timestamp || Date.now()).toISOString(),
                ForcedCompletion: Boolean(forcedCompletion),
                ReadingLevel: String(readingLevel || 'N/A'),
                ReadingWSS: Number(readingWss || 0),
                ReadingCorrectCount: Number(readingCorrectCount || 0),
                ReadingIncorrectCount: Number(readingIncorrectCount || 0),
                ListeningLevel: String(listeningLevel || 'N/A'),
                ListeningWSS: Number(listeningWss || 0),
                ListeningCorrectCount: Number(listeningCorrectCount || 0),
                ListeningIncorrectCount: Number(listeningIncorrectCount || 0),
                StagesResults: JSON.stringify(stagesResults || [])
            }
        };

        console.log('Данные для Story:', storyData);

        const storyResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STORY_TABLE)}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    records: [{ fields: storyData.fields }]
                })
            }
        );

        if (!storyResponse.ok) {
            const errorData = await storyResponse.json();
            console.error('Ошибка при сохранении в Story:', errorData);
            throw new Error(`Failed to save to Story: ${storyResponse.status}. Details: ${JSON.stringify(errorData)}`);
        } else {
            const storyResult = await storyResponse.json();
            console.log('Результаты успешно сохранены в Story:', storyResult);
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
