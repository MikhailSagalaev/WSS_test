const fetch = require('node-fetch');

module.exports = async (req, res) => {
    console.log("Получен запрос на /api/getProgress");
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TESTS_TABLE } = process.env;
    const { userLogin } = req.body;

    console.log("Переменные окружения:", { AIRTABLE_PAT: !!AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TESTS_TABLE });
    console.log("Данные запроса:", { userLogin });

    if (!userLogin) {
        return res.status(400).json({ error: 'Не указан userLogin' });
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TESTS_TABLE)}`;
    const filterFormula = `AND({UserLogin} = '${userLogin}', {Finished} = FALSE())`;

    console.log("URL запроса:", url);
    console.log("Формула фильтра:", filterFormula);

    try {
        const response = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error("Ошибка ответа Airtable:", response.status, response.statusText);
            const errorBody = await response.text();
            console.error("Тело ошибки:", errorBody);
            throw new Error('Ошибка при запросе к Airtable');
        }

        const data = await response.json();
        console.log("Полученные данные:", data);
        
        if (data.records.length === 0) {
            return res.status(200).json({ message: 'Прогресс не найден' });
        }

        const latestProgress = data.records[0].fields;

        const progress = {
            currentStageIndex: latestProgress.CurrentStageIndex,
            currentLevel: latestProgress.CurrentLevel,
            correctCount: latestProgress.CorrectCount,
            incorrectCount: latestProgress.IncorrectCount,
            totalQuestions: latestProgress.TotalQuestions,
            correctHigherLevel: latestProgress.CorrectHigherLevel,
            incorrectLowerLevel: latestProgress.IncorrectLowerLevel,
            groupCorrectAnswers: latestProgress.GroupCorrectAnswers,
            groupTotalAnswers: latestProgress.GroupTotalAnswers,
            groupsAnswered: latestProgress.GroupsAnswered,
            questionsOnCurrentLevel: latestProgress.QuestionsOnCurrentLevel
        };

        console.log("Отправляемый прогресс:", progress);
        res.status(200).json({ progress });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
    }
};
