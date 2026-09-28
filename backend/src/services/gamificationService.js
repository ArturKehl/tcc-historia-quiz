const NIVEIS = [
  { nivel: 1, nome: 'Iniciante', xpMin: 0 },
  { nivel: 2, nome: 'Aprendiz', xpMin: 500 },
  { nivel: 3, nome: 'Estudante de Historia', xpMin: 1500 },
  { nivel: 4, nome: 'Historiador', xpMin: 3000 },
  { nivel: 5, nome: 'Mestre da Historia', xpMin: 6000 }
];
const PONTOS_ACERTO = 100;
const BONUS_SEQUENCIA = 25;
const BONUS_QUIZ = 200;

function calcularNivel(xp) {
  let atual = NIVEIS[0];
  for (const n of NIVEIS) if (xp >= n.xpMin) atual = n;
  const prox = NIVEIS.find(n => n.xpMin > xp);
  return {
    nivel: atual.nivel, nome: atual.nome,
    xpAtual: xp, xpProximo: prox ? prox.xpMin : xp,
    proximoNome: prox ? prox.nome : 'Maximo',
    progresso: prox ? Math.round(((xp - atual.xpMin) / (prox.xpMin - atual.xpMin)) * 100) : 100
  };
}
module.exports = { NIVEIS, PONTOS_ACERTO, BONUS_SEQUENCIA, BONUS_QUIZ, calcularNivel };
