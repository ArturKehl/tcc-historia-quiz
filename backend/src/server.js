require('dotenv').config();
const { initDatabase } = require('./config/database');

(async () => {
  console.log('[BOOT] Iniciando servidor...');
  console.log('[BOOT] JWT_SECRET configurado:', process.env.JWT_SECRET ? 'SIM' : 'NAO');

  await initDatabase();

  const app = require('./app');
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  HistoriaQuiz rodando!');
    console.log('  http://localhost:' + PORT);
    console.log('========================================');
    console.log('  Professor: professor@escola.com / 123456');
    console.log('  Aluno: ana@aluno.com / 123456');
    console.log('========================================');
    console.log('');
  });
})();
