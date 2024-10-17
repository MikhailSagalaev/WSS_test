const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log("Получен запрос на /api/resetProgress");
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;
    const { userLogin } = req.body;

    console.log("Переменные окружения:", { AIRTABLE_PAT: !!AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE });
    console.log("Данные запроса:", { userLogin });

    if (!userLogin) {
        return res.status(400).json({ error: 'Не указан userLogin' });
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}`;
    const filterFormula = `({UserLogin} = '${userLogin}')`;

    console.log("URL запроса:", url);
    console.log("Формула фильтра:", filterFormula);

    try {
        // Получаем текущую запись прогресса
        const getResponse = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!getResponse.ok) {
            throw new Error(`Ошибка при запросе к Airtable: ${getResponse.status} ${getResponse.statusText}`);
        }

        const getData = await getResponse.json();
        console.log("Полученные данные:", getData);
        
        if (getData.records.length === 0) {
            return res.status(404).json({ error: 'Запись прогресса не найдена' });
        }

        const record = getData.records[0];
        console.log("Найденная запись:", record);

        // Сбрасываем прогресс
        const updateResponse = await fetch(`${url}/${record.id}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    CurrentStageIndex: 0,
                    CurrentLevel: 1,
                    CorrectCount: 0,
                    IncorrectCount: 0,
                    TotalQuestions: 0,
                    CorrectHigherLevel: 0,
                    IncorrectLowerLevel: 0,
                    GroupCorrectAnswers: 0,
                    GroupTotalAnswers: 0,
                    GroupsAnswered: 0,
                    QuestionsOnCurrentLevel: 0
                }
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            console.error("Ошибка при обновлении Airtable:", errorData);
            throw new Error(`Ошибка при обновлении Airtable: ${updateResponse.status} ${updateResponse.statusText}`);
        }

        const updatedData = await updateResponse.json();
        console.log("Обновленные данные:", updatedData);

        console.log("Прогресс успешно сброшен");
        res.status(200).json({ message: 'Прогресс успешно сброшен' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message, stack: error.stack });
    }
};
