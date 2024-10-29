const fetch = require('node-fetch');
const cors = require('./middleware/cors');

module.exports = async (req, res) => {
    // Проверка CORS
    if (cors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_USERS_TABLE } = process.env;
    const { userLogin } = req.body;

    if (!userLogin) {
        return res.status(400).json({ error: 'Не указан userLogin' });
    }

    console.log('Проверка доступности теста для:', userLogin);

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
    const filterFormula = `({login} = '${userLogin}')`;

    try {
        const response = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Ошибка при запросе к Airtable:', response.status, response.statusText);
            throw new Error('Ошибка при запросе к Airtable');
        }

        const data = await response.json();
        console.log('Получены данные из Airtable:', data);
        
        if (data.records.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const testAttempts = data.records[0].fields.TestAttempts || 0;
        console.log('Количество доступных попыток:', testAttempts);
        
        res.status(200).json({ available: testAttempts > 0 });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message,
            stack: error.stack
        });
    }
};