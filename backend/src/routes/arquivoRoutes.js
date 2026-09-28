const router = require('express').Router();
const c = require('../controllers/arquivoController');
const { autenticar, apenasProfessor } = require('../middlewares/auth');

// Listar arquivos (todos autenticados)
router.get('/', autenticar, c.listarArquivos);

// Detalhes de um arquivo
router.get('/:id', autenticar, c.obterArquivo);

// Download / visualizacao
router.get('/:id/download', autenticar, c.downloadArquivo);

// Upload (somente professor)
router.post('/',
  autenticar,
  apenasProfessor,
  c.middlewareUpload,
  c.uploadArquivo
);

// Excluir (somente professor)
router.delete('/:id', autenticar, apenasProfessor, c.excluirArquivo);

module.exports = router;
