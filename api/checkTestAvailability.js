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
        const response = await fetch(`${url}?filterByFormula=${encodeURIComponent(filterFormula)}`, {
            headers: {
                Authorization: `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Ошибка при запросе к Airtable');
        }

        const data = await response.json();
        
        if (data.records.length === 0) {
            return res.status(404).json({ error: 'Польз��ватель не найден' });
        }

        const testAttempts = data.records[0].fields.TestAttempts || 0;
        
        res.status(200).json({ available: testAttempts > 0 });
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};

