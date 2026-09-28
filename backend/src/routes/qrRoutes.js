const router = require('express').Router();
const c = require('../controllers/qrController');
const { autenticar, apenasProfessor } = require('../middlewares/auth');

router.get('/ip-base', c.ipBase);

router.use(autenticar, apenasProfessor);

router.get('/turma/:id', c.gerarQRCodeTurma);
router.get('/turma/:id/svg', c.gerarQRCodeTurmaSVG);
router.get('/turma/:id/url', c.urlConvite);

module.exports = router;
