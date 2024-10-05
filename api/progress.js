// api/progress.js
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log("Получен запрос к /api/progress");

    if (req.method !== 'POST') {
        console.warn(`Метод ${req.method} не разрешён`);
        return res.status(405).json({ error: 'Метод не разрешён' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE, AIRTABLE_USERS_TABLE } = process.env;

    const progressUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}`;
    const usersUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;

    const { userLogin, stage, level, correctCount, incorrectCount, totalQuestions, correctHigherLevel, incorrectLowerLevel, timestamp } = req.body;

    // Проверка наличия обязательных полей
    if (!userLogin) {
        console.error("Недостаточно данных для сохранения прогресса (userLogin)");
        return res.status(400).json({ error: 'Недостаточно данных для сохранения прогресса (userLogin)' });
    }

    try {
        // Шаг 1: Проверка существующей записи прогресса
        const filterFormula = `({UserLogin} = "${userLogin}")`;
        const progressFetchUrl = `${progressUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`;
        console.log(`Запрос существующего прогресса: ${progressFetchUrl}`);

        const progressResponse = await fetch(progressFetchUrl, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!progressResponse.ok) {
            const errorData = await progressResponse.json();
            console.error("Ошибка при получении прогресса из Airtable:", errorData);
            return res.status(progressResponse.status).json({ error: errorData.error });
        }

        const progressDataResponse = await progressResponse.json();
        console.log(`Найдено записей прогресса: ${progressDataResponse.records.length}`);

        let recordId = null;

        if (progressDataResponse.records.length > 0) {
            // Запись существует, обновляем её
            recordId = progressDataResponse.records[0].id;
            console.log(`Обновление существующей записи прогресса с ID: ${recordId}`);

            const updateData = {
                fields: {
                    Stage: stage,
                    Level: level,
                    CorrectCount: correctCount,
                    IncorrectCount: incorrectCount,
                    TotalQuestions: totalQuestions,
                    CorrectHigherLevel: correctHigherLevel,
                    IncorrectLowerLevel: incorrectLowerLevel,
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
                console.error("Ошибка при обновлении прогресса в Airtable:", errorData);
                return res.status(updateResponse.status).json({ error: errorData.error });
            }

            const updatedRecord = await updateResponse.json();
            console.log("Прогресс успешно обновлён в Airtable:", updatedRecord);
        } else {
            // Запись не существует, создаём новую
            console.log("Создание новой записи прогресса в Airtable");

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
                console.error("Ошибка при создании прогресса в Airtable:", errorData);
                return res.status(createResponse.status).json({ error: errorData.error });
            }

            const newRecord = await createResponse.json();
            recordId = newRecord.id;
            console.log("Новая запись прогресса создана в Airtable:", newRecord);
        }

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
        res.status(200).json({ message: 'Прогресс успешно сохранён и TestAttempts обновлены.' });

    } catch (error) {
        console.error("Внутренняя ошибка сервера:", error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};