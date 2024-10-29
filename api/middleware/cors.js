// api/middleware/cors.js
module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://wiseman-skills.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
};