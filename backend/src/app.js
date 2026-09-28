const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/ranking', require('./routes/rankingRoutes'));
app.use('/api/professor', require('./routes/professorRoutes'));
app.use('/api/turmas', require('./routes/turmaRoutes'));
app.use('/api/qrcode', require('./routes/qrRoutes'));
app.use('/api/materiais', require('./routes/materialRoutes'));
app.use('/api/conteudos', require('./routes/conteudoRoutes'));
app.use('/api/arquivos', require('./routes/arquivoRoutes'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/index.html')));
module.exports = app;




