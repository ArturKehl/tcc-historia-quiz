const router = require('express').Router();
const c = require('../controllers/authController');
router.post('/cadastro', c.cadastrar);
router.post('/login', c.login);
module.exports = router;
