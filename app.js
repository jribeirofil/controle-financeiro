const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytuEnOItCWqncrChzMe_kINOPQtLfjIPxaO-yCvo3bb9tAph-j2KqdxCDRASEvs4bG/exec';

// ── Membros da família ────────────────────────────────────────────────────────
const ADULTOS       = ['Jayme', 'Rita'];
const CRIANCAS      = ['Davi', 'Lucas'];
const TODOS_MEMBROS = ['Família', ...ADULTOS, ...CRIANCAS];

// ── Categorias ────────────────────────────────────────────────────────────────
const CATS = {
  despesa: {
    'Moradia':      ['Aluguel / Financ.', 'Condomínio', 'IPTU', 'Manutenção', 'Outros'],
    'Alimentação':  ['Mercado', 'Restaurante', 'Delivery', 'Padaria / Café', 'Outros'],
    'Transporte':   ['Combustível', 'Uber / Táxi', 'Transporte Público', 'Manutenção Veículo'],
    'Saúde':        ['Plano de Saúde', 'Médico / Dentista', 'Farmácia', 'Exames'],
    'Educação':     ['Escola / Faculdade', 'Cursos', 'Livros / Material'],
    'Casa':         ['Luz', 'Água / Gás', 'Internet', 'Celular', 'Outros'],
    'Lazer':        ['Streaming', 'Cinema / Passeios', 'Viagens', 'Esporte', 'Outros'],
    'Vestuário':    ['Roupas', 'Calçados', 'Acessórios'],
    'Outros':       ['Presente / Doação', 'Imprevistos', 'Outros'],
  },
  receita: {
    'Renda': ['Salário', 'Freelance / Extra', 'Bônus', 'Aluguel Recebido', 'Outros'],
  },
  poupanca: {
    'Poupança': ['Reserva de Emergência', 'Investimentos', 'Outros'],
  }
};

const ICONES = {
  'Moradia':'ti-home','Alimentação':'ti-salad','Transporte':'ti-car',
  'Saúde':'ti-heart','Educação':'ti-book','Casa':'ti-bolt',
  'Lazer':'ti-device-tv','Vestuário':'ti-shirt','Renda':'ti-trending-up',
  'Poupança':'ti-piggy-bank','Outros':'ti-dots',
};

// ── Estado ────────────────────────────────────────────────────────────────────
let tipoAtual     = 'despesa';
let paraQuemAtual = 'Família';
let filtroAtual   = 'todos';
let filtroMes     = '';
let lancamentos   = [];
let editandoId    = null;

// ── Limites por categoria (localStorage) ─────────────────────────────────────
function getLimites() {
  try { return JSON.parse(localStorage.getItem('limites_cat') || '{}'); } catch(e) { return {}; }
}
function salvarLimites(limites) {
  localStorage.setItem('limites_cat', JSON.stringify(limites));
}

// ── Mês do resumo ─────────────────────────────────────────────────────────────
function getMesResumo() {
  const el = document.getElementById('resumo-mes-sel');
  return el ? el.value : '';
}

function popularSeletorMesResumo() {
  const sel = document.getElementById('resumo-mes-sel');
  if (!sel) return;
  const meses = {};
  lancamentos.forEach(l => {
    if (l.data) {
      const m = String(l.data).substring(0,7);
      if (m) meses[m] = true;
    }
  });
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todos os meses</option>';
  Object.keys(meses).sort().reverse().forEach(m => {
    const [ano, mes] = m.split('-');
    const label = new Date(ano, mes-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    sel.innerHTML += `<option value="${m}">${label}</option>`;
  });
  if (atual) sel.value = atual;
  else {
    // Seleciona o mês atual por padrão se existir
    const hoje = new Date().toISOString().substring(0,7);
    if (meses[hoje]) sel.value = hoje;
  }
}

function scriptConfigurado() {
  return SCRIPT_URL && SCRIPT_URL !== 'COLE_A_URL_DO_APPS_SCRIPT_AQUI';
}

// ── Perfil ────────────────────────────────────────────────────────────────────
function getPerfil() { return localStorage.getItem('perfil_usuario'); }
function setPerfil(nome) { localStorage.setItem('perfil_usuario', nome); }
function escolherPerfil(nome) {
  setPerfil(nome);
  document.getElementById('tela-perfil').classList.remove('active');
  document.getElementById('perfil-badge').textContent = nome;
  mostrarToast('Olá, ' + nome + '!', 'sucesso');
}
function trocarPerfil() {
  if (!confirm('Trocar de usuário?')) return;
  localStorage.removeItem('perfil_usuario');
  document.getElementById('tela-perfil').classList.add('active');
}

// ── Tela de limites ───────────────────────────────────────────────────────────
function abrirLimites() {
  const limites = getLimites();
  const cats = Object.keys(CATS.despesa);
  const lista = document.getElementById('limites-lista');
  lista.innerHTML = cats.map(cat => `
    <div class="limite-item">
      <label class="limite-label">
        <i class="ti ${ICONES[cat] || 'ti-circle'}" aria-hidden="true"></i>
        ${cat}
      </label>
      <div class="limite-input-wrap">
        <span class="limite-prefix">R$</span>
        <input type="text" inputmode="decimal" class="limite-input"
          data-cat="${cat}"
          value="${limites[cat] ? String(limites[cat]).replace('.',',') : ''}"
          placeholder="Sem limite">
      </div>
    </div>
  `).join('');
  document.getElementById('tela-limites').classList.add('active');
}

function fecharLimites() {
  document.getElementById('tela-limites').classList.remove('active');
}

function salvarTodosLimites() {
  const limites = {};
  document.querySelectorAll('.limite-input').forEach(inp => {
    const cat = inp.dataset.cat;
    const val = parseFloat(inp.value.replace(',','.'));
    if (val && val > 0) limites[cat] = val;
  });
  salvarLimites(limites);
  fecharLimites();
  renderResumo();
  mostrarToast('Limites salvos!', 'sucesso');
}

// ── API ───────────────────────────────────────────────────────────────────────
async function apiListar() {
  const res = await fetch(`${SCRIPT_URL}?action=listar`);
  const json = await res.json();
  return json.lancamentos || [];
}
async function apiAdicionar(lanc) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ ...lanc, action: 'adicionar' }),
  });
  return res.json();
}
async function apiAtualizar(lanc) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ ...lanc, action: 'atualizar' }),
  });
  return res.json();
}
async function apiDeletar(id) {
  const res = await fetch(`${SCRIPT_URL}?action=deletar&id=${id}`);
  return res.json();
}

// ── Carregar ──────────────────────────────────────────────────────────────────
async function carregarDados(silencioso) {
  if (!scriptConfigurado()) { renderHistorico(); renderResumo(); return; }
  mostrarSkeleton();
  try { lancamentos = await apiListar(); }
  catch (e) { mostrarToast('Erro ao carregar. Verifique a conexão.', 'erro'); }
  renderHistorico();
  renderResumo();
  const aba = document.querySelector('.section.active');
  if (aba && aba.id === 'sec-resumo')    renderResumo();
  if (aba && aba.id === 'sec-historico') renderHistorico();
}

function mostrarSkeleton() {
  const lista = document.getElementById('lista');
  if (lista) lista.innerHTML = `
    <div class="skeleton-item"></div>
    <div class="skeleton-item"></div>
    <div class="skeleton-item"></div>`;
}

// ── Navegação ─────────────────────────────────────────────────────────────────
function irPara(id, btn) {
  document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  btn.setAttribute('aria-selected','true');
  document.getElementById('sec-' + id).classList.add('active');
  if (id === 'resumo')    renderResumo();
  if (id === 'historico') renderHistorico();
  if (id === 'lancar') {
    setTimeout(() => {
      const campoValor = document.getElementById('valor');
      if (campoValor && !editandoId) campoValor.focus();
    }, 150);
  }
}

// ── Tipo / Para quem / Filtros ────────────────────────────────────────────────
function setTipo(tipo, btn) {
  tipoAtual = tipo;
  document.querySelectorAll('.tipo-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
  popularCats();
}
function setParaQuem(nome, btn) {
  paraQuemAtual = nome;
  document.querySelectorAll('.paraquem-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
}
function setFiltro(filtro, btn) {
  filtroAtual = filtro;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderHistorico();
}
function setFiltroMes(val) {
  filtroMes = val;
  renderHistorico();
}

// ── Categorias ────────────────────────────────────────────────────────────────
function popularCats() {
  const sel = document.getElementById('categoria');
  sel.innerHTML = '<option value="">Selecione...</option>';
  Object.keys(CATS[tipoAtual]).forEach(c => {
    sel.innerHTML += `<option value="${c}">${c}</option>`;
  });
  document.getElementById('subcategoria').innerHTML = '<option value="">Selecione...</option>';
}
function atualizarSubcat() {
  const cat = document.getElementById('categoria').value;
  const sel = document.getElementById('subcategoria');
  sel.innerHTML = '<option value="">Selecione...</option>';
  if (cat && CATS[tipoAtual][cat]) {
    CATS[tipoAtual][cat].forEach(s => sel.innerHTML += `<option value="${s}">${s}</option>`);
  }
}

function popularFiltroMes() {
  const meses = {};
  lancamentos.forEach(l => {
    if (l.data) { const m = String(l.data).substring(0,7); if (m) meses[m] = true; }
  });
  const sel = document.getElementById('filtro-mes');
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todos os meses</option>';
  Object.keys(meses).sort().reverse().forEach(m => {
    const [ano, mes] = m.split('-');
    const label = new Date(ano, mes-1, 1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    sel.innerHTML += `<option value="${m}">${label}</option>`;
  });
  if (atual) sel.value = atual;
}

// ── Lançar / Editar ───────────────────────────────────────────────────────────
async function lancar() {
  const valorRaw      = document.getElementById('valor').value.replace(',','.');
  const valor         = parseFloat(valorRaw);
  const cat           = document.getElementById('categoria').value;
  const subcat        = document.getElementById('subcategoria').value;
  const desc          = document.getElementById('descricao').value.trim();
  const data          = document.getElementById('data').value;
  const registradoPor = getPerfil() || 'Não identificado';

  if (!valor || valor <= 0) { mostrarToast('Informe o valor', 'erro'); return; }
  if (!cat) { mostrarToast('Selecione a categoria', 'erro'); return; }

  const btnLancar = document.querySelector('.btn-lancar');
  btnLancar.disabled = true;
  btnLancar.innerHTML = '<i class="ti ti-loader-2 spin" aria-hidden="true"></i> Salvando...';

  const lanc = {
    id: editandoId || String(Date.now()),
    tipo: tipoAtual, valor, cat, subcat,
    desc: desc || (subcat || cat),
    paraQuem: paraQuemAtual, registradoPor, data,
  };

  try {
    if (editandoId) {
      if (scriptConfigurado()) await apiAtualizar(lanc);
      const idx = lancamentos.findIndex(l => l.id === editandoId);
      if (idx !== -1) lancamentos[idx] = lanc;
      fecharEdicao();
      mostrarToast('Lançamento atualizado!', 'sucesso');
    } else {
      if (scriptConfigurado()) await apiAdicionar(lanc);
      else lancamentos.unshift(lanc);
      if (scriptConfigurado()) lancamentos.unshift(lanc);
      limparFormulario();
      // Fecha teclado no celular
      document.activeElement && document.activeElement.blur();
      mostrarToast('Lançamento salvo!', 'sucesso');

      // Alerta de limite após novo lançamento
      verificarAlerteLimite(cat, data);
    }
    renderHistorico();
    renderResumo();
  } catch (e) {
    mostrarToast('Erro ao salvar. Tente novamente.', 'erro');
  } finally {
    btnLancar.disabled = false;
    btnLancar.innerHTML = editandoId
      ? '<i class="ti ti-check" aria-hidden="true"></i> Salvar alterações'
      : '<i class="ti ti-check" aria-hidden="true"></i> Confirmar lançamento';
  }
}

function verificarAlerteLimite(cat, data) {
  const limites = getLimites();
  if (!limites[cat]) return;
  const mes = data ? String(data).substring(0,7) : new Date().toISOString().substring(0,7);
  const gasto = lancamentos
    .filter(l => l.tipo==='despesa' && l.cat===cat && l.data && String(l.data).substring(0,7)===mes)
    .reduce((s,l) => s+Number(l.valor), 0);
  const pct = gasto / limites[cat];
  if (pct >= 1) {
    setTimeout(() => mostrarToast(`⚠️ Limite de ${cat} ultrapassado!`, 'erro'), 2600);
  } else if (pct >= 0.8) {
    setTimeout(() => mostrarToast(`⚠️ ${cat} em ${Math.round(pct*100)}% do limite`, 'erro'), 2600);
  }
}

function limparFormulario() {
  document.getElementById('valor').value = '';
  document.getElementById('descricao').value = '';
  document.getElementById('categoria').value = '';
  document.getElementById('subcategoria').innerHTML = '<option value="">Selecione...</option>';
  paraQuemAtual = 'Família';
  document.querySelectorAll('.paraquem-btn').forEach(b => {
    b.classList.remove('active');
    if (b.dataset.nome === 'Família') b.classList.add('active');
  });
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  // Scroll para o topo e foco no campo valor
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => {
    const campoValor = document.getElementById('valor');
    if (campoValor) campoValor.focus();
  }, 300);
}

function abrirEdicao(id) {
  const l = lancamentos.find(l => l.id === id);
  if (!l) return;
  editandoId = id;
  document.getElementById('lancar-titulo').textContent = 'Editar lançamento';
  const btn = document.querySelector('.btn-lancar');
  btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Salvar alterações';
  document.getElementById('btn-cancelar-edicao').style.display = 'flex';
  setTipoSilencioso(l.tipo);
  document.getElementById('valor').value = String(l.valor).replace('.',',');
  popularCats();
  document.getElementById('categoria').value = l.cat;
  atualizarSubcat();
  document.getElementById('subcategoria').value = l.subcat || '';
  document.getElementById('descricao').value = l.desc || '';
  paraQuemAtual = l.paraQuem || 'Família';
  document.querySelectorAll('.paraquem-btn').forEach(b => {
    b.classList.remove('active');
    if (b.dataset.nome === paraQuemAtual) b.classList.add('active');
  });
  document.getElementById('data').value = l.data || '';
  irPara('lancar', document.querySelectorAll('.tab')[0]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setTipoSilencioso(tipo) {
  tipoAtual = tipo;
  document.querySelectorAll('.tipo-btn').forEach(b => {
    b.classList.remove('active'); b.setAttribute('aria-pressed','false');
    if (b.classList.contains(tipo)) { b.classList.add('active'); b.setAttribute('aria-pressed','true'); }
  });
}

function fecharEdicao() {
  editandoId = null;
  document.getElementById('lancar-titulo').textContent = 'Novo lançamento';
  document.querySelector('.btn-lancar').innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Confirmar lançamento';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
  limparFormulario();
  setTipoSilencioso('despesa');
}

// ── Modal de exclusão ────────────────────────────────────────────────────────
let _deletarId   = null;
let _deletarBtn  = null;

function deletar(id, btn) {
  _deletarId  = id;
  _deletarBtn = btn;
  document.getElementById('modal-exclusao').classList.add('active');
  document.getElementById('modal-btn-confirmar').onclick = confirmarExclusao;
}

function fecharModal() {
  document.getElementById('modal-exclusao').classList.remove('active');
}

async function confirmarExclusao() {
  const id  = _deletarId;
  const btn = _deletarBtn;
  fecharModal();
  _deletarId  = null;
  _deletarBtn = null;
  if (!id) return;
  if (btn) btn.disabled = true;
  try {
    if (scriptConfigurado()) await apiDeletar(id);
    lancamentos = lancamentos.filter(l => l.id !== id);
    renderHistorico(); renderResumo();
    mostrarToast('Removido', 'sucesso');
  } catch (e) {
    mostrarToast('Erro ao remover', 'erro');
    if (btn) btn.disabled = false;
  }
}

// ── Duplicar lançamento ──────────────────────────────────────────────────────
function duplicar(id) {
  const l = lancamentos.find(l => l.id === id);
  if (!l) return;

  // Abre formulário preenchido mas com novo ID e data de hoje
  editandoId = null;
  document.getElementById('lancar-titulo').textContent = 'Duplicar lançamento';
  document.querySelector('.btn-lancar').innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i> Confirmar duplicação';
  document.getElementById('btn-cancelar-edicao').style.display = 'flex';

  setTipoSilencioso(l.tipo);
  document.getElementById('valor').value = String(l.valor).replace('.', ',');
  popularCats();
  document.getElementById('categoria').value = l.cat;
  atualizarSubcat();
  document.getElementById('subcategoria').value = l.subcat || '';
  document.getElementById('descricao').value = l.desc || '';
  paraQuemAtual = l.paraQuem || 'Família';
  document.querySelectorAll('.paraquem-btn').forEach(b => {
    b.classList.remove('active');
    if (b.dataset.nome === paraQuemAtual) b.classList.add('active');
  });
  // Data de hoje por padrão
  document.getElementById('data').value = new Date().toISOString().split('T')[0];

  irPara('lancar', document.querySelectorAll('.tab')[0]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => document.getElementById('valor').focus(), 300);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function mostrarToast(msg, tipo) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (tipo || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Formatação ────────────────────────────────────────────────────────────────
function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
}
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function parseFmtData(dataStr) {
  try {
    const p = String(dataStr).substring(0,10).split('-');
    if (p.length===3) return new Date(p[0],p[1]-1,p[2]).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
  } catch(e){}
  return '';
}

// ── Resumo ────────────────────────────────────────────────────────────────────
function renderResumo() {
  popularSeletorMesResumo();
  const mes = getMesResumo();

  const filtrar = arr => mes ? arr.filter(l => l.data && String(l.data).substring(0,7) === mes) : arr;

  const totalReceita  = filtrar(lancamentos.filter(l=>l.tipo==='receita')).reduce((s,l)=>s+Number(l.valor),0);
  const totalDespesa  = filtrar(lancamentos.filter(l=>l.tipo==='despesa')).reduce((s,l)=>s+Number(l.valor),0);
  const totalPoupanca = filtrar(lancamentos.filter(l=>l.tipo==='poupanca')).reduce((s,l)=>s+Number(l.valor),0);
  const saldo = totalReceita - totalDespesa - totalPoupanca;

  document.getElementById('cards-resumo').innerHTML = `
    <div class="stat-card">
      <div class="stat-label"><i class="ti ti-arrow-down-circle" aria-hidden="true"></i>Renda total</div>
      <div class="stat-val verde">${fmtBRL(totalReceita)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i class="ti ti-arrow-up-circle" aria-hidden="true"></i>Despesas</div>
      <div class="stat-val vermelho">${fmtBRL(totalDespesa)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i class="ti ti-piggy-bank" aria-hidden="true"></i>Poupança</div>
      <div class="stat-val roxo">${fmtBRL(totalPoupanca)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i class="ti ti-wallet" aria-hidden="true"></i>Saldo livre</div>
      <div class="stat-val ${saldo>=0?'verde':'vermelho'}">${fmtBRL(saldo)}</div>
    </div>`;

  // Breakdown por membro
  const porMembro = {};
  filtrar(lancamentos.filter(l=>l.tipo==='despesa')).forEach(l => {
    const m = l.paraQuem || 'Família';
    porMembro[m] = (porMembro[m] || 0) + Number(l.valor);
  });
  const sortedMembros = Object.entries(porMembro).sort((a,b)=>b[1]-a[1]);
  const maxMembro = sortedMembros.length ? sortedMembros[0][1] : 1;

  document.getElementById('breakdown-membros').innerHTML = !sortedMembros.length
    ? ''
    : `<p class="secao-title" style="margin-top:1.5rem">Gastos por membro</p>` +
      sortedMembros.map(([m, val]) => {
        const pct = Math.round((val/maxMembro)*100);
        return `<div class="barra-wrap">
          <div class="barra-label"><span>${escHtml(m)}</span><span>${fmtBRL(val)}</span></div>
          <div class="barra-bg"><div class="barra-fill ok" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');

  // Barras por categoria com limites
  const limites = getLimites();
  const porCat = {};
  filtrar(lancamentos.filter(l=>l.tipo==='despesa')).forEach(l => {
    porCat[l.cat] = (porCat[l.cat]||0) + Number(l.valor);
  });
  const sorted = Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
  const maxVal = sorted.length ? sorted[0][1] : 1;

  document.getElementById('barras-cat').innerHTML = !sorted.length
    ? '<div class="empty-state"><i class="ti ti-chart-bar" aria-hidden="true"></i>Nenhuma despesa ainda</div>'
    : sorted.map(([cat, val]) => {
        const limite = limites[cat];
        let pct, classe, labelLimite = '';

        if (limite) {
          pct = Math.min(Math.round((val/limite)*100), 100);
          classe = pct >= 100 ? 'alerta' : pct >= 80 ? 'aviso' : 'ok';
          labelLimite = `<span class="limite-pct ${classe}">${pct}%</span>`;
        } else {
          pct = Math.round((val/maxVal)*100);
          classe = 'ok';
        }

        return `<div class="barra-wrap">
          <div class="barra-label">
            <span>${escHtml(cat)}</span>
            <span class="barra-valores">
              ${fmtBRL(val)}${limite ? ' <span class="limite-ref">/ '+fmtBRL(limite)+'</span>' : ''}
              ${labelLimite}
            </span>
          </div>
          <div class="barra-bg"><div class="barra-fill ${classe}" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');
}

// ── Histórico ─────────────────────────────────────────────────────────────────
function renderHistorico() {
  const lista = document.getElementById('lista');
  if (!lista) return;
  popularFiltroMes();

  let filtrados = filtroAtual==='todos' ? [...lancamentos] : lancamentos.filter(l=>l.tipo===filtroAtual);
  if (filtroMes) filtrados = filtrados.filter(l => l.data && String(l.data).substring(0,7)===filtroMes);

  if (!filtrados.length) {
    lista.innerHTML = '<div class="empty-state"><i class="ti ti-inbox" aria-hidden="true"></i>Nenhum lançamento encontrado</div>';
    return;
  }

  lista.innerHTML = filtrados.map(l => {
    const sinal    = l.tipo==='despesa' ? '–' : '+';
    const icone    = ICONES[l.cat] || 'ti-circle';
    const dataFmt  = l.data ? parseFmtData(l.data) : '';
    const paraQuem = l.paraQuem || l.resp || '';
    const porQuem  = l.registradoPor ? ' · por ' + l.registradoPor : '';
    const hoje     = new Date().toISOString().split('T')[0];
    const ehHoje   = l.data && String(l.data).substring(0,10) === hoje;
    const badgeRecente = ehHoje ? '<span class="badge-recente">Recente</span>' : '';
    return `
      <div class="lanc-item">
        <div class="lanc-icon ${l.tipo}"><i class="ti ${icone}" aria-hidden="true"></i></div>
        <div class="lanc-info">
          <div class="lanc-desc">${badgeRecente}${escHtml(l.desc)}</div>
          <div class="lanc-sub">${escHtml(l.subcat||l.cat)}${paraQuem?' · '+escHtml(paraQuem):''}${porQuem}${dataFmt?' · '+dataFmt:''}</div>
        </div>
        <div class="lanc-val ${l.tipo}">${sinal} ${fmtBRL(l.valor)}</div>
        <button class="btn-edit" onclick="abrirEdicao('${escHtml(String(l.id))}')" aria-label="Editar">
          <i class="ti ti-pencil" aria-hidden="true"></i>
        </button>
        <button class="btn-copy" onclick="duplicar('${escHtml(String(l.id))}')" aria-label="Duplicar">
          <i class="ti ti-copy" aria-hidden="true"></i>
        </button>
        <button class="btn-del" onclick="deletar('${escHtml(String(l.id))}',this)" aria-label="Remover">
          <i class="ti ti-trash" aria-hidden="true"></i>
        </button>
      </div>`;
  }).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
  const hoje = new Date();
  document.getElementById('data').value = hoje.toISOString().split('T')[0];
  document.getElementById('mes-ref').textContent =
    hoje.toLocaleDateString('pt-BR',{month:'short',year:'numeric'});

  const perfil = getPerfil();
  if (perfil) document.getElementById('perfil-badge').textContent = perfil;
  else document.getElementById('tela-perfil').classList.add('active');

  popularCats();
  renderResumo();
  renderHistorico();
  if (scriptConfigurado()) carregarDados();
})();
