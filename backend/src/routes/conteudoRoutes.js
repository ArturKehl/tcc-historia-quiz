const router = require('express').Router();
const { autenticar } = require('../middlewares/auth');

// Mapa de conteudos completos disponiveis
const CONTEUDOS = {
  'Historia do Brasil': require('../data/conteudo/brasil'),
  'Segunda Guerra Mundial': require('../data/conteudo/segunda-guerra'),
  'Revolucao Francesa': require('../data/conteudo/revolucao-francesa'),
  'Revolucao Industrial': require('../data/conteudo/revolucao-industrial'),
  'Antiguidade': require('../data/conteudo/antiguidade'),
  'Idade Media': require('../data/conteudo/idade-media'),
  'Idade Moderna': require('../data/conteudo/idade-moderna'),
  'Idade Contemporanea': require('../data/conteudo/idade-contemporanea')
};

// Lista todos os conteudos completos
router.get('/completos', autenticar, (req, res) => {
  const lista = Object.values(CONTEUDOS).map(c => ({
    tema: c.tema,
    subtitulo: c.subtitulo,
    duracao: c.duracao,
    totalSecoes: c.secoes.length,
    introducao: c.introducao
  }));
  res.json(lista);
});

// Retorna um conteudo completo por tema
router.get('/completo/:tema', autenticar, (req, res) => {
  const tema = decodeURIComponent(req.params.tema);
  const conteudo = CONTEUDOS[tema];
  if (!conteudo) return res.status(404).json({ erro: 'Conteudo nao encontrado' });
  res.json(conteudo);
});

module.exports = router;
