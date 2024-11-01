// api/middleware/cors.js
module.exports = (req, res) => {
    // Разрешаем запросы с wiseman-skills.com
    res.setHeader('Access-Control-Allow-Origin', 'https://wiseman-skills.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Обработка preflight запросов
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
};