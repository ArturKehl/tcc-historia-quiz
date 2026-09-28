async function telaRanking() {
  const app = document.getElementById('main');
  app.innerHTML = '<div class="card">Carregando ranking...</div>';

  try {
    const lista = await api('/ranking/geral');
    app.innerHTML = `
      <div class="card">
        <h2>🏆 Ranking Geral</h2>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>#</th><th>Aluno</th><th>Turma</th><th>Pontos</th><th>Quizzes</th></tr></thead>
            <tbody>
              ${lista.map((r, i) => `
                <tr>
                  <td class="${i < 3 ? 'rank-' + (i+1) : ''}">${i+1}${i < 3 ? (i === 0 ? ' 🥇' : i === 1 ? ' 🥈' : ' 🥉') : ''}</td>
                  <td>${r.nome}</td>
                  <td>${r.turma || '-'}</td>
                  <td><strong>${r.pontos}</strong></td>
                  <td>${r.quizzes}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) {
    app.innerHTML = `<div class="card alerta erro">${e.message}</div>`;
  }
}

window.telaRanking = telaRanking;
