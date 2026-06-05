// ── Configuração ──────────────────────────────────────────────────────────────
// Após publicar o Apps Script, cole a URL aqui:
const SCRIPT_URL = 'COLE_A_URL_DO_APPS_SCRIPT_AQUI';

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
let tipoAtual   = 'despesa';
let respAtual   = 'Pessoa 1';
let filtroAtual = 'todos';
let lancamentos = [];

function scriptConfigurado() {
  return SCRIPT_URL && SCRIPT_URL !== 'COLE_A_URL_DO_APPS_SCRIPT_AQUI';
}

// ── API Google Sheets ─────────────────────────────────────────────────────────
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

async function apiDeletar(id) {
  const res = await fetch(`${SCRIPT_URL}?action=deletar&id=${id}`);
  return res.json();
}

// ── Carregar lançamentos ──────────────────────────────────────────────────────
async function carregarDados(silencioso) {
  if (!scriptConfigurado()) {
    renderHistorico();
    renderResumo();
    return;
  }

  mostrarSkeleton();
  try {
    lancamentos = await apiListar();
  } catch (e) {
    mostrarToast('Erro ao carregar. Verifique a conexão.', 'erro');
  }

  renderHistorico();
  renderResumo();

  // Garante que a aba visível no momento reflete os dados novos imediatamente
  const abaAtiva = document.querySelector('.section.active');
  if (abaAtiva && abaAtiva.id === 'sec-resumo') renderResumo();
  if (abaAtiva && abaAtiva.id === 'sec-historico') renderHistorico();
}

function mostrarSkeleton() {
  const lista = document.getElementById('lista');
  if (lista) {
    lista.innerHTML = `
      <div class="skeleton-item"></div>
      <div class="skeleton-item"></div>
      <div class="skeleton-item"></div>`;
  }
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
}

// ── Tipo e Responsável ────────────────────────────────────────────────────────
function setTipo(tipo, btn) {
  tipoAtual = tipo;
  document.querySelectorAll('.tipo-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed','true');
  popularCats();
}

function setResp(resp, btn) {
  respAtual = resp;
  document.querySelectorAll('.resp-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed','true');
}

function setFiltro(filtro, btn) {
  filtroAtual = filtro;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
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
    CATS[tipoAtual][cat].forEach(s => {
      sel.innerHTML += `<option value="${s}">${s}</option>`;
    });
  }
}

// ── Lançar ────────────────────────────────────────────────────────────────────
async function lancar() {
  const valor  = parseFloat(document.getElementById('valor').value);
  const cat    = document.getElementById('categoria').value;
  const subcat = document.getElementById('subcategoria').value;
  const desc   = document.getElementById('descricao').value.trim();
  const data   = document.getElementById('data').value;

  if (!valor || valor <= 0) { mostrarToast('Informe o valor', 'erro'); return; }
  if (!cat) { mostrarToast('Selecione a categoria', 'erro'); return; }

  const lanc = {
    id: String(Date.now()),
    tipo: tipoAtual, valor, cat, subcat,
    desc: desc || (subcat || cat),
    resp: respAtual, data,
  };

  // Sem API: só salva local e mostra
  if (!scriptConfigurado()) {
    lancamentos.unshift(lanc);
    limparFormulario();
    mostrarToast('Lançamento salvo localmente', 'sucesso');
    return;
  }

  const btnLancar = document.querySelector('.btn-lancar');
  btnLancar.disabled = true;
  btnLancar.innerHTML = '<i class="ti ti-loader-2 spin" aria-hidden="true"></i> Salvando...';

  try {
    await apiAdicionar(lanc);
    lancamentos.unshift(lanc);
    limparFormulario();
    mostrarToast('Lançamento salvo!', 'sucesso');
  } catch (e) {
    mostrarToast('Erro ao salvar. Tente novamente.', 'erro');
  } finally {
    btnLancar.disabled = false;
    btnLancar.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Confirmar lançamento';
  }
}

function limparFormulario() {
  document.getElementById('valor').value = '';
  document.getElementById('descricao').value = '';
  document.getElementById('categoria').value = '';
  document.getElementById('subcategoria').innerHTML = '<option value="">Selecione...</option>';
}

// ── Deletar ───────────────────────────────────────────────────────────────────
async function deletar(id, btn) {
  if (!confirm('Remover este lançamento?')) return;
  btn.disabled = true;

  if (!scriptConfigurado()) {
    lancamentos = lancamentos.filter(l => l.id !== id);
    renderHistorico();
    renderResumo();
    mostrarToast('Removido', 'sucesso');
    return;
  }

  try {
    await apiDeletar(id);
    lancamentos = lancamentos.filter(l => l.id !== id);
    renderHistorico();
    renderResumo();
    mostrarToast('Removido', 'sucesso');
  } catch (e) {
    mostrarToast('Erro ao remover', 'erro');
    btn.disabled = false;
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null;
function mostrarToast(msg, tipo) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (tipo || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ── Formatação ────────────────────────────────────────────────────────────────
function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 });
}
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Resumo ────────────────────────────────────────────────────────────────────
function renderResumo() {
  const totalReceita  = lancamentos.filter(l=>l.tipo==='receita').reduce((s,l)=>s+Number(l.valor),0);
  const totalDespesa  = lancamentos.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+Number(l.valor),0);
  const totalPoupanca = lancamentos.filter(l=>l.tipo==='poupanca').reduce((s,l)=>s+Number(l.valor),0);
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

  const porCat = {};
  lancamentos.filter(l=>l.tipo==='despesa').forEach(l=>{ porCat[l.cat]=(porCat[l.cat]||0)+Number(l.valor); });
  const sorted = Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
  const maxVal = sorted.length ? sorted[0][1] : 1;

  document.getElementById('barras-cat').innerHTML = !sorted.length
    ? '<div class="empty-state"><i class="ti ti-chart-bar" aria-hidden="true"></i>Nenhuma despesa ainda</div>'
    : sorted.map(([cat,val]) => {
        const pct = Math.round((val/maxVal)*100);
        return `<div class="barra-wrap">
          <div class="barra-label"><span>${escHtml(cat)}</span><span>${fmtBRL(val)}</span></div>
          <div class="barra-bg"><div class="barra-fill ${pct>80?'alerta':'ok'}" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');
}

// ── Histórico ─────────────────────────────────────────────────────────────────
function renderHistorico() {
  const lista = document.getElementById('lista');
  if (!lista) return;

  const filtrados = filtroAtual==='todos' ? lancamentos : lancamentos.filter(l=>l.tipo===filtroAtual);

  if (!filtrados.length) {
    lista.innerHTML = '<div class="empty-state"><i class="ti ti-inbox" aria-hidden="true"></i>Nenhum lançamento ainda</div>';
    return;
  }

  lista.innerHTML = filtrados.map(l => {
    const sinal = l.tipo==='despesa' ? '–' : '+';
    const icone = ICONES[l.cat] || 'ti-circle';
    let dataFmt = '';
    if (l.data) {
      try { dataFmt = new Date(l.data+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}); } catch(e){}
    }
    return `
      <div class="lanc-item">
        <div class="lanc-icon ${l.tipo}"><i class="ti ${icone}" aria-hidden="true"></i></div>
        <div class="lanc-info">
          <div class="lanc-desc">${escHtml(l.desc)}</div>
          <div class="lanc-sub">${escHtml(l.subcat||l.cat)} · ${escHtml(l.resp)}${dataFmt?' · '+dataFmt:''}</div>
        </div>
        <div class="lanc-val ${l.tipo}">${sinal} ${fmtBRL(l.valor)}</div>
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
  popularCats();
  renderResumo();
  renderHistorico();

  if (!scriptConfigurado()) {
    mostrarToast('Configure a URL do Apps Script no app.js', 'erro');
  } else {
    carregarDados();
  }
})();
