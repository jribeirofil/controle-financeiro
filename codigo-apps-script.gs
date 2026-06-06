const SHEET_NAME = 'Lançamentos';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    let action = 'listar';
    let body = {};

    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
      action = body.action || 'adicionar';
    } else if (e.parameter && e.parameter.action) {
      action = e.parameter.action;
    }

    let resultado;
    if (action === 'listar') {
      resultado = listar();
    } else if (action === 'adicionar') {
      resultado = adicionar(body);
    } else if (action === 'atualizar') {
      resultado = atualizar(body);
    } else if (action === 'deletar') {
      resultado = deletar(e.parameter ? e.parameter.id : null);
    } else {
      resultado = { erro: 'Acao desconhecida' };
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
    const header = sheet.getRange(1, 1, 1, 9);
    header.setValues([['ID', 'Data', 'Tipo', 'Categoria', 'Subcategoria', 'Descricao', 'Valor', 'Para Quem', 'Registrado Por']]);
    header.setBackground('#1F3864');
    header.setFontColor('#FFFFFF');
    header.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function listar() {
  const sheet = getSheet();
  const dados = sheet.getDataRange().getValues();

  if (dados.length <= 1) {
    return { lancamentos: [] };
  }

  const lancamentos = dados.slice(1).map(function(row) {
    return {
      id:            String(row[0]),
      data:          row[1] ? Utilities.formatDate(new Date(row[1]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
      tipo:          row[2],
      cat:           row[3],
      subcat:        row[4],
      desc:          row[5],
      valor:         parseFloat(row[6]) || 0,
      paraQuem:      row[7] || '',
      registradoPor: row[8] || '',
    };
  }).reverse();

  return { lancamentos: lancamentos };
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
    lanc.paraQuem || 'Família',
    lanc.registradoPor || '',
  ]);

  return { sucesso: true, id: id };
}

function deletar(id) {
  if (!id) {
    return { erro: 'ID nao informado' };
  }

  const sheet = getSheet();
  const dados = sheet.getDataRange().getValues();

  for (var i = dados.length - 1; i >= 1; i--) {
    if (String(dados[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { sucesso: true };
    }
  }

  return { erro: 'Lancamento nao encontrado' };
}

function atualizar(lanc) {
  if (!lanc.id) return { erro: 'ID nao informado' };

  const sheet = getSheet();
  const dados = sheet.getDataRange().getValues();

  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(lanc.id)) {
      sheet.getRange(i + 1, 1, 1, 9).setValues([[
        lanc.id,
        lanc.data || dados[i][1],
        lanc.tipo || dados[i][2],
        lanc.cat  || dados[i][3],
        lanc.subcat !== undefined ? lanc.subcat : dados[i][4],
        lanc.desc || dados[i][5],
        lanc.valor || dados[i][6],
        lanc.paraQuem !== undefined ? lanc.paraQuem : dados[i][7],
        lanc.registradoPor !== undefined ? lanc.registradoPor : dados[i][8],
      ]]);
      return { sucesso: true };
    }
  }
  return { erro: 'Lancamento nao encontrado' };
}

function testeDirecto() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  Logger.log('Aba: ' + sheet.getName());
  sheet.appendRow(['999', '2025-06-05', 'despesa', 'Outros', 'Outros', 'Teste direto', 10, 'Casal']);
}
