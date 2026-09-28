const router = require('express').Router();
const { dbWrapper: db } = require('../config/database');
const { autenticar } = require('../middlewares/auth');

// Lista todos os temas disponiveis
router.get('/temas', autenticar, (req, res) => {
  const temas = db.prepare("SELECT DISTINCT tema FROM materiais_estudo ORDER BY tema").all();
  res.json(temas.map(t => t.tema));
});

// Materiais por tema (com filtro opcional de tipo)
router.get('/tema/:tema', autenticar, (req, res) => {
  const { tipo } = req.query;
  if (tipo) {
    res.json(db.prepare('SELECT * FROM materiais_estudo WHERE tema=? AND tipo=?').all(req.params.tema, tipo));
  } else {
    res.json(db.prepare('SELECT * FROM materiais_estudo WHERE tema=?').all(req.params.tema));
  }
});

// Material por id
router.get('/:id', autenticar, (req, res) => {
  const m = db.prepare('SELECT * FROM materiais_estudo WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ erro: 'Nao encontrado' });
  res.json(m);
});

module.exports = router;
