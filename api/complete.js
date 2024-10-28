// api/complete.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Настройка CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Обработка OPTIONS запросов
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    console.log("Получен запрос к /api/complete");
    console.log("Тело запроса:", req.body);

    if (req.method !== 'POST') {
        console.warn(`Метод ${req.method} не разрешён`);
        return res.status(405).json({ error: 'Метод не разрешён' });
    }

    const { 
        userLogin, stagesResults, finalWss, finalLevel, timestamp,
        stage, level, correctCount, incorrectCount, totalQuestions, 
        correctHigherLevel, incorrectLowerLevel, questionsOnCurrentLevel
    } = req.body;

    // Проверка наличия обязательных полей
    if (!userLogin || !stagesResults || finalWss === undefined || !finalLevel || !timestamp ||
        !stage || !level || correctCount === undefined || incorrectCount === undefined || 
        totalQuestions === undefined || correctHigherLevel === undefined || incorrectLowerLevel === undefined || 
        questionsOnCurrentLevel === undefined) {
        console.error("Недос��аточно данных для завершения теста");
        return res.status(400).json({ error: 'Недостаточно данных для завершения теста' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_USERS_TABLE, AIRTABLE_STORY_TABLE } = process.env;

    const usersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
    const storyUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STORY_TABLE)}`;

    try {
        // Шаг 1: Запись результатов в таблицу Story
        console.log("Создание записи в таблицу Story");
        const storyData = {
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
                Timestamp: timestamp,
                FinalWSS: finalWss,
                FinalLevel: finalLevel,
                StagesResults: JSON.stringify(stagesResults)
            }
        };

        const createStoryResponse = await fetch(storyUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(storyData)
        });

        if (!createStoryResponse.ok) {
            const errorData = await createStoryResponse.json();
            console.error("Ошибка при создании записи в Story:", errorData);
            return res.status(createStoryResponse.status).json({ error: errorData.error });
        }

        const newStoryRecord = await createStoryResponse.json();
        console.log("Запись успешно создана в Story:", newStoryRecord);

        // Шаг 2: Обновление поля TestAttempts в таблице Users
        const userFilterFormula = `({login} = "${userLogin}")`;
        const userFetchUrl = `${usersUrl}?filterByFormula=${encodeURIComponent(userFilterFormula)}`;
        console.log(`Запрос пользователя: ${userFetchUrl}`);

        const userResponse = await fetch(userFetchUrl, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!userResponse.ok) {
            const errorData = await userResponse.json();
            console.error("Ошибка при получении пользователя из Airtable:", errorData);
            return res.status(userResponse.status).json({ error: errorData.error });
        }

        const userDataResponse = await userResponse.json();
        console.log(`Найдено пользователей: ${userDataResponse.records.length}`);

        if (userDataResponse.records.length === 0) {
            console.error(`Пользователь с login ${userLogin} не найден в таблице Users`);
            return res.status(404).json({ error: `Пользователь с login ${userLogin} не найден` });
        }

        const userRecord = userDataResponse.records[0];
        const userRecordId = userRecord.id;
        const currentTestAttempts = userRecord.fields.TestAttempts || 0;

        console.log(`Текущие TestAttempts для пользователя ${userLogin}: ${currentTestAttempts}`);

        // Проверка, что TestAttempts больше 0
        if (currentTestAttempts <= 0) {
            console.warn(`У пользователя ${userLogin} не осталось TestAttempts`);
            return res.status(400).json({ error: 'У пользователя не осталось TestAttempts' });
        }

        const updatedTestAttempts = currentTestAttempts - 1;

        console.log(`Обновление TestAttempts для пользователя ${userLogin} до ${updatedTestAttempts}`);

        const updateUserData = {
            fields: {
                TestAttempts: updatedTestAttempts
            }
        };

        const updateUserResponse = await fetch(`${usersUrl}/${userRecordId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateUserData)
        });

        if (!updateUserResponse.ok) {
            const errorData = await updateUserResponse.json();
            console.error("Ошибка при обновлении TestAttempts в Airtable:", errorData);
            return res.status(updateUserResponse.status).json({ error: errorData.error });
        }

        const updatedUserRecord = await updateUserResponse.json();
        console.log("TestAttempts спешно обновлены в Airtable:", updatedUserRecord);

        // Ответ успешного выполнения
        res.status(200).json({ 
            message: 'Тест успешно завершён, результаты сохранены и TestAttempts уменьшены.',
            finalLevel: finalLevel,
            finalWss: finalWss
        });

    } catch (error) {
        console.error("Внутренняя ошибка сервера:", error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
