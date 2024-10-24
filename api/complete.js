// api/complete.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log("Получен запрос к /api/complete");

    if (req.method !== 'POST') {
        console.warn(`Метод ${req.method} не разрешён`);
        return res.status(405).json({ error: 'Метод не разрешён' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_USERS_TABLE, AIRTABLE_STORY_TABLE } = process.env;

    const usersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
    const storyUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STORY_TABLE)}`;

    const { userLogin, stagesResults, finishDate } = req.body;

    // Проверка наличия обязательных полей
    if (!userLogin || !stagesResults || !finishDate) {
        console.error("Недостаточно данных для завершения теста (userLogin, stagesResults, finishDate)");
        return res.status(400).json({ error: 'Недостаточно данных для завершения теста (userLogin, stagesResults, finishDate)' });
    }

    try {
        // Шаг 1: Запись результатов в таблицу Story
        console.log("Создание записи в таблицу Story");
        const storyData = {
            fields: {
                UserLogin: userLogin,
                StagesResults: JSON.stringify(stagesResults), // Убедитесь, что stagesResults содержит информацию о каждом этапе
                FinishDate: finishDate
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
        console.log("TestAttempts успешно обновлены в Airtable:", updatedUserRecord);

        // Ответ успешного выполнения
        res.status(200).json({ message: 'Тест успешно завершён, результаты сохранены и TestAttempts уменьшены.' });

    } catch (error) {
        console.error("Внутренняя ошибка сервера:", error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
