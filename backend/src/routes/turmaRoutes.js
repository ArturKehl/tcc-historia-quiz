const router = require('express').Router();
const c = require('../controllers/turmaController');
const { autenticar, apenasProfessor, apenasAluno } = require('../middlewares/auth');

router.use(autenticar);

router.get('/todas', c.listarTodasTurmas);
router.get('/minhas', apenasProfessor, c.minhasTurmas);
router.post('/criar', apenasProfessor, c.criarTurma);
router.get('/:id/detalhes', apenasProfessor, c.detalhesTurma);
router.patch('/:id/regenerar-codigo', apenasProfessor, c.regenerarCodigo);
router.delete('/:id', apenasProfessor, c.excluirTurma);
router.delete('/:turma_id/aluno/:aluno_id', apenasProfessor, c.removerAlunoDaTurma);
router.get('/minha', apenasAluno, c.minhaTurma);
router.post('/entrar', apenasAluno, c.entrarNaTurma);

module.exports = router;
