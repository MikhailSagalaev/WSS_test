const fetch = require('node-fetch');
const cors = require('./middleware/cors');

module.exports = async (req, res) => {
    // Проверка CORS
    if (cors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_USERS_TABLE } = process.env;

    // Проверяем наличие всех необходимых переменных окружения
    if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_USERS_TABLE) {
        console.error('Отсутствуют необходимые переменные окружения:', {
            hasAirtablePat: !!AIRTABLE_PAT,
            hasBaseId: !!AIRTABLE_BASE_ID,
            hasUsersTable: !!AIRTABLE_USERS_TABLE
        });
        return res.status(500).json({ error: 'Ошибка конфигурации сервера' });
    }

    const { userLogin } = req.body;

    if (!userLogin) {
        return res.status(400).json({ error: 'Не указан userLogin' });
    }

    console.log('Проверка доступности теста для:', userLogin);
    console.log('Используемые параметры:', {
        baseId: AIRTABLE_BASE_ID,
        tableId: AIRTABLE_USERS_TABLE,
        hasToken: !!AIRTABLE_PAT
    });

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
    const filterFormula = `({login} = '${userLogin}')`;
    const fullUrl = `${url}?filterByFormula=${encodeURIComponent(filterFormula)}`;

    console.log('URL запроса:', fullUrl);

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Статус ответа:', response.status);
        console.log('Заголовки ответа:', response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка при запросе к Airtable:', {
                status: response.status,
                statusText: response.statusText,
                errorText
            });
            throw new Error(`Ошибка Airtable: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Получены данные из Airtable:', data);
        
        if (!data || !data.records) {
            console.error('Некорректный формат данных от Airtable:', data);
            throw new Error('Некорректный формат данных от Airtable');
        }

        if (data.records.length === 0) {
            console.log('Пользователь не найден в базе');
            return res.status(404).json({ 
                error: 'Пользователь не найден',
                userLogin 
            });
        }

        const userRecord = data.records[0];
        const testAttempts = userRecord.fields.TestAttempts || 0;
        console.log('Найден пользователь:', {
            recordId: userRecord.id,
            testAttempts,
            fields: userRecord.fields
        });
        
        res.status(200).json({ 
            available: testAttempts > 0,
            attempts: testAttempts
        });
    } catch (error) {
        console.error('Подробная ошибка:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message,
            type: error.name
        });
    }
};