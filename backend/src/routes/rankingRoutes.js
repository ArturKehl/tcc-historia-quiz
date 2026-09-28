const router = require('express').Router();
const c = require('../controllers/rankingController');
const { autenticar } = require('../middlewares/auth');
router.get('/geral', autenticar, c.rankingGeral);
router.get('/turma/:turma_id', autenticar, c.rankingTurma);
router.get('/periodo/:dias', autenticar, c.rankingPeriodo);
module.exports = router;
