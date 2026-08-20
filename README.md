# 🚀 Automação de Boletos: Google Sheets + Mercado Pago API

Este projeto consiste em uma automação desenvolvida em **Google Apps Script (JavaScript)** para automatizar a geração de boletos bancários via API do **Mercado Pago** a partir de uma base de dados no **Google Sheets**, enviando as notificações automaticamente aos clientes por e-mail.

## 💡 Funcionalidades

- **Processamento em Lote:** Varre as linhas da planilha processando cliente por cliente.
- **Tratamento de Dados:** Normalização de valores monetários, sanitização de CPF/CNPJ (restauração de zeros à esquerda) e tratamento de e-mails múltiplos.
- **Cálculo de Vencimento:** Define dinamicamente o vencimento para o último dia do mês corrente.
- **Integração com API REST:** Envia requisições seguras com chave de idempotência para evitar cobranças duplicadas.
- **Notificação:** Dispara um e-mail personalizado para o cliente com o link direto do boleto.
- **Controle de Estado:** Registra o status da operação na própria planilha (`criado`, `Erro API` ou `Erro Script`) para não reprocessar registros.

## 📋 Estrutura da Planilha

Para o funcionamento correto do script, nao altere a posicao ou nome das colunas
Segue link da planilha modelo

https://docs.google.com/spreadsheets/d/12K3LJ1bvqJ6glCc1iR96nN_z-325oL4i0pIGiq2p_Cs/copy

## 🛠️ Como Utilizar

1. Copie o código contido no arquivo [`script.js)`](./script.js).
2. Na sua planilha do Google Sheets, acesse **Extensões** > **Apps Script**.
3. Cole o código no editor.
4. Insira seu `accessToken` de produção do Mercado Pago na variável `accessToken`.
5. Execute a função `gerarBoletosGerais()`.

## 🧰 Tecnologias Utilizadas

- Google Apps Script (JavaScript V8)
- Mercado Pago Payments API
- Google Sheets API & MailApp
