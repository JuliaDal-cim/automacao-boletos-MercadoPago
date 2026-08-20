/**
 * Script de Automação de Cobranças via Mercado Pago para Google Sheets
 */

function gerarBoletosGerais() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Geral'); 
  
  if (!sheet) {
    Logger.log("Erro: Não foi possível encontrar a aba com o nome 'Geral'.");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const url = 'https://api.mercadopago.com/v1/payments';
  
  // INSIRA SEU ACCESS TOKEN DO MERCADO PAGO AQUI:
  const accessToken = 'SEU_ACCESS_TOKEN_AQUI'; 

  // Varre a planilha da linha 2 (índice 1) até a última linha preenchida
  for (let i = 1; i < data.length; i++) { 
    
    // Mapeamento baseado nas colunas da planilha
    let nomeCompleto = data[i][0] ? data[i][0].toString().trim() : "";   // Coluna A
    let documentoRaw = data[i][1] ? data[i][1].toString().trim() : "";   // Coluna B
    let identificador = data[i][2] ? data[i][2].toString().trim() : "";  // Coluna C
    let cepRaw = data[i][3] ? data[i][3].toString().trim() : "";         // Coluna D
    let rua = data[i][4] ? data[i][4].toString().trim() : "";            // Coluna E
    let numeroCasa = data[i][5] ? data[i][5].toString().trim() : "";     // Coluna F
    let bairro = data[i][6] ? data[i][6].toString().trim() : "";         // Coluna G
    let city = data[i][7] ? data[i][7].toString().trim() : "";           // Coluna H
    let estadoUF = data[i][8] ? data[i][8].toString().trim() : "";       // Coluna I
    let emailRaw = data[i][9] ? data[i][9].toString().trim() : "";       // Coluna J
    let mesCompetencia = data[i][12] ? data[i][12].toString().trim() : ""; // Coluna M

    // CONFIGURAÇÃO DE CONTROLE:
    let valorRaw = data[i][13]; // Coluna N (Valor)
    let statusAtual = data[i][14] ? data[i][14].toString().trim() : ""; // Coluna O (Status)
    
    // Tratamento dinâmico do Valor financeiro
    let valor = 0;
    if (typeof valorRaw === 'number') {
      valor = valorRaw;
    } else if (valorRaw) {
      let valorStr = valorRaw.toString().replace("R$", "").replace(/\s/g, "");
      if (valorStr.includes(',') && valorStr.includes('.')) {
        valorStr = valorStr.replace(/\./g, "").replace(",", ".");
      } else if (valorStr.includes(',')) {
        valorStr = valorStr.replace(",", ".");
      }
      valor = parseFloat(valorStr);
    }

    // Pula se a linha for inválida ou se o boleto já tiver sido gerado
    if (!valor || valor <= 0 || statusAtual === 'criado' || !nomeCompleto || !mesCompetencia) {
      continue; 
    }

    Logger.log(`Processando Linha ${i+1} -> Cliente: ${nomeCompleto} | Identificador: ${identificador}`);

    // Divisão de nome e sobrenome de forma dinâmica
    let partesDoNome = nomeCompleto.split(" ");
    let primeiroNome = partesDoNome[0];
    let sobrenome = partesDoNome.slice(1).join(" ") || "Não Informado";

    // Tratamento do CPF/CNPJ (garante que os zeros à esquerda apagados pela planilha sejam restaurados)
    let documento = documentoRaw.replace(/\D/g, '');
    let tipoDocumento = "CPF";
    if (documento.length <= 11 && documento.length > 0) {
      documento = documento.padStart(11, '0');
    } else if (documento.length > 11) {
      documento = documento.padStart(14, '0');
      tipoDocumento = "CNPJ";
    }

    let cep = cepRaw.replace(/\D/g, '');
    
    // Limpeza de e-mails múltiplos (pega apenas o primeiro antes de ponto e vírgula, vírgula ou barra)
    let emailParaAPI = emailRaw.split(/[;,/]+/)[0].trim();
    if (!emailParaAPI || !emailParaAPI.includes('@')) {
      emailParaAPI = "email.vazio@exemplo.com"; 
    }

    // --- CÁLCULO BASEADO NA DATA ATUAL DA EXECUÇÃO boleto será gerado para o ultimo dia do mes ---
    let hoje = new Date();
    let anoAtual = hoje.getFullYear();
    let mesAtual = hoje.getMonth(); 
    
    // Retorna exatamente o último dia do mês atual
    let ultimoDiaData = new Date(anoAtual, mesAtual + 1, 0);
    
    // Formata a data no padrão ISO exigido pelo Mercado Pago (limite até às 23:59:59)
    let dataFormatada = Utilities.formatDate(ultimoDiaData, "GMT-3", "yyyy-MM-dd'T'23:59:59.000-03:00");
    
    // Payload com as variáveis dinâmicas de cada linha da planilha
    let payload = {
      "transaction_amount": valor,
      "description": "Taxa Condominial - Competência " + mesCompetencia + " - " + identificador,
      "payment_method_id": "bolbradesco",
      "date_of_expiration": dataFormatada,
      "payer": {
        "email": emailParaAPI,
        "first_name": primeiroNome,
        "last_name": sobrenome,
        "identification": {
          "type": tipoDocumento,
          "number": documento
        },
        "address": {
          "zip_code": cep,
          "street_name": rua || "Não Informado",
          "street_number": numeroCasa || "S/N",
          "neighborhood": bairro || "Não Informado",
          "city": city || "Não Informado",
          "federal_unit": estadoUF || "MG"
        }
      }
    };

    let options = {
      "method": "post",
      "headers": {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
        "X-Idempotency-Key": Utilities.getUuid()
      },
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    try {
      let response = UrlFetchApp.fetch(url, options);
      let json = JSON.parse(response.getContentText());

      if (response.getResponseCode() === 201 || response.getResponseCode() === 200) {
        
        let URLBoleto = "";
        if (json.point_of_interaction && json.point_of_interaction.transaction_data) {
          URLBoleto = json.point_of_interaction.transaction_data.ticket_url;
        }

        // Grava o status na Coluna O (15ª coluna)
        sheet.getRange(i + 1, 15).setValue('criado'); 
        
        // Envio do e-mail de notificação para o cliente
        if (emailParaAPI && emailParaAPI.includes('@') && emailParaAPI !== "email.vazio@exemplo.com" && URLBoleto) {
          let assunto = `Seu boleto da Competência ${mesCompetencia} está pronto!`;
          let corpoEmail = `Olá, ${nomeCompleto}.\n\nO boleto referente ao identificador ${identificador} (Competência: ${mesCompetencia}) já foi gerado com sucesso.\n\nValor: R$ ${valor.toFixed(2).replace('.', ',')}\n\nAcesse o link abaixo para visualizar e pagar o boleto:\n${URLBoleto}\n\nAtenciosamente.`;
          
          MailApp.sendEmail({
            to: emailParaAPI,
            subject: assunto,
            body: corpoEmail
          });
        }
        Logger.log(`Linha ${i+1} finalizada com sucesso.`);
      } else {
        sheet.getRange(i + 1, 15).setValue('Erro API');
        Logger.log(`Erro retornado na linha ${i+1}: ` + response.getContentText());
      }
    } catch (error) {
      sheet.getRange(i + 1, 15).setValue('Erro Script');
      Logger.log(`Erro crítico na linha ${i+1}: ` + error.message);
    }
    
    // Aguarda 1.5 segundos entre requisições para respeitar os limites da API
    Utilities.sleep(1500); 
  }
}
