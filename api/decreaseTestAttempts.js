const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_USERS_TABLE } = process.env;
    const { userLogin } = req.body;

    if (!userLogin) {
        return res.status(400).json({ error: 'Не указан userLogin' });
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
    const filterFormula = `({login} = '${userLogin}')`;

    try {
        // Получаем текущее значение TestAttempts
        const getResponse = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!getResponse.ok) {
            throw new Error('Ошибка при запросе к Airtable');
        }

        const getData = await getResponse.json();
        
        if (getData.records.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const record = getData.records[0];
        const currentTestAttempts = record.fields.TestAttempts || 0;

        if (currentTestAttempts <= 0) {
            return res.status(400).json({ error: 'Нет доступных попыток' });
        }

        // Уменьшаем TestAttempts на 1
        const updateResponse = await fetch(`${url}/${record.id}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    TestAttempts: currentTestAttempts - 1
                }
            })
        });

        if (!updateResponse.ok) {
            throw new Error('Ошибка при обновлении Airtable');
        }

        res.status(200).json({ message: 'Количество попыток успешно уменьшено' });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};