const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_STORY_TABLE } = process.env;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_STORY_TABLE)}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        res.status(200).json(result);
    } catch (error) {
        console.error('Ошибка при отправке результатов в Airtable:', error);
        res.status(500).json({ error: 'Ошибка при отправке результатов' });
    }
<<<<<<< HEAD
};
=======
};
>>>>>>> 2960c604c4b595dacb4b738ca9ba3ef0787e455d
