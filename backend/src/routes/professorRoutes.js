const router = require('express').Router();
const c = require('../controllers/professorController');
const { autenticar, apenasProfessor } = require('../middlewares/auth');

router.use(autenticar, apenasProfessor);

// Dashboard
router.get('/dashboard', c.dashboard);

// Alunos
router.get('/alunos', c.listarAlunos);
router.get('/aluno/:id', c.desempenhoAluno);

// Turmas
router.get('/turmas', c.listarTurmas);

// Perguntas - CRUD
router.get('/perguntas', c.listarPerguntas);
router.get('/perguntas/:id', c.obterPergunta);
router.post('/perguntas', c.criarPergunta);
router.put('/perguntas/:id', c.editarPergunta);
router.delete('/perguntas/:id', c.excluirPergunta);

// Quizzes - CRUD completo
router.get('/quizzes', c.listarQuizzes);
router.get('/quizzes/:id', c.obterQuiz);
router.post('/quizzes', c.criarQuiz);
router.put('/quizzes/:id', c.editarQuiz);
router.delete('/quizzes/:id', c.excluirQuiz);
router.patch('/quizzes/:id/publicar', c.publicarQuiz);
router.post('/quizzes/:id/duplicar', c.duplicarQuiz);
router.get('/quizzes/:id/estatisticas', c.estatisticasQuiz);

module.exports = router;
