// ════════════════════════════════════════════════════════════════
//  CONTROLE FINANCEIRO FAMILIAR — Google Apps Script
//  Cole este código no editor de script da sua planilha.
//  Instruções completas no README.md
// ════════════════════════════════════════════════════════════════

const SHEET_NAME = 'Lançamentos';

const COLUNAS = ['id', 'data', 'tipo', 'cat', 'subcat', 'desc', 'valor', 'resp'];

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const params = e.parameter || {};
    const action = params.action || 'listar';

    let resultado;

    if (action === 'listar') {
      resultado = listar();
    } else if (action === 'adicionar') {
      const body = JSON.parse(e.postData ? e.postData.contents : '{}');
      resultado = adicionar(body);
    } else if (action === 'deletar') {
      resultado = deletar(params.id);
    } else {
      resultado = { erro: 'Ação desconhecida' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ erro: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Cabeçalho
    sheet.appendRow(['ID', 'Data', 'Tipo', 'Categoria', 'Subcategoria', 'Descrição', 'Valor', 'Responsável']);
    // Formatar cabeçalho
    const header = sheet.getRange(1, 1, 1, 8);
    header.setBackground('#1F3864');
    header.setFontColor('#FFFFFF');
    header.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(2, 100);
    sheet.setColumnWidth(3, 90);
    sheet.setColumnWidth(4, 130);
    sheet.setColumnWidth(5, 160);
    sheet.setColumnWidth(6, 220);
    sheet.setColumnWidth(7, 100);
    sheet.setColumnWidth(8, 110);
  }

  return sheet;
}

function listar() {
  const sheet = getSheet();
  const dados = sheet.getDataRange().getValues();

  if (dados.length <= 1) return { lancamentos: [] };

  const lancamentos = dados.slice(1).map(row => ({
    id:     String(row[0]),
    data:   row[1] ? String(row[1]).substring(0, 10) : '',
    tipo:   row[2],
    cat:    row[3],
    subcat: row[4],
    desc:   row[5],
    valor:  parseFloat(row[6]) || 0,
    resp:   row[7],
  })).reverse(); // mais recentes primeiro

  return { lancamentos };
}

function adicionar(lanc) {
  if (!lanc.valor || !lanc.cat) {
    return { erro: 'Dados incompletos' };
  }

  const sheet = getSheet();
  const id = lanc.id || String(Date.now());

  sheet.appendRow([
    id,
    lanc.data || new Date().toISOString().substring(0, 10),
    lanc.tipo || 'despesa',
    lanc.cat,
    lanc.subcat || '',
    lanc.desc || lanc.cat,
    lanc.valor,
    lanc.resp || 'Casal',
  ]);

  // Formatar linha adicionada
  const ultima = sheet.getLastRow();
  sheet.getRange(ultima, 7).setNumberFormat('R$ #,##0.00');

  return { sucesso: true, id };
}

function deletar(id) {
  if (!id) return { erro: 'ID não informado' };

  const sheet = getSheet();
  const dados = sheet.getDataRange().getValues();

  for (let i = dados.length - 1; i >= 1; i--) {
    if (String(dados[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { sucesso: true };
    }
  }

  return { erro: 'Lançamento não encontrado' };
}
