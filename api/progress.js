// api/progress.js
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
    console.log("Получен запрос к /api/progress");
    console.log("Тело запроса:", req.body);

    if (req.method !== 'POST') {
        console.warn(`Метод ${req.method} не разрешён`);
        return res.status(405).json({ error: 'Метод не разрешён' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_PROGRESS_TABLE } = process.env;

    const progressUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_PROGRESS_TABLE)}`;

    const { 
      userLogin, 
      stage, 
      level, 
      correctCount, 
      incorrectCount, 
      totalQuestions, 
      correctHigherLevel, 
      incorrectLowerLevel,
      questionsOnCurrentLevel,
      timestamp 
    } = req.body;

    try {
        // Проверяем существующую запись прогресса
        const filterFormula = `({UserLogin} = "${userLogin}")`;
        const progressResponse = await fetch(`${progressUrl}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!progressResponse.ok) {
            throw new Error(`HTTP error! status: ${progressResponse.status}`);
        }

        const progressData = await progressResponse.json();

        let recordId = null;

        if (progressData.records.length > 0) {
            // Запись существует, обновляем её
            recordId = progressData.records[0].id;
            const updateData = {
                fields: {
                    Stage: stage,
                    Level: level,
                    CorrectCount: correctCount,
                    IncorrectCount: incorrectCount,
                    TotalQuestions: totalQuestions,
                    CorrectHigherLevel: correctHigherLevel,
                    IncorrectLowerLevel: incorrectLowerLevel,
                    QuestionsOnCurrentLevel: questionsOnCurrentLevel,
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
                throw new Error(`HTTP error! status: ${updateResponse.status}`);
            }
        } else {
            // Запись не существует, создаём новую
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
                    QuestionsOnCurrentLevel: questionsOnCurrentLevel,
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
                throw new Error(`HTTP error! status: ${createResponse.status}`);
            }
        }

        res.status(200).json({ message: 'Прогресс успешно сохранён.' });

    } catch (error) {
        console.error("Ошибка при сохранении прогресса:", error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера', details: error.message });
    }
};
