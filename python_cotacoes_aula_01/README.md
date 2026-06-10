# Aulas 01, 02, 03 e 04 - Sistema de Cotacoes em Python

Neste projeto voce vai construir, passo a passo, uma versao em Python do sistema de cotacoes.

## Aula 01

- Entender o que e uma aplicacao web.
- Criar o primeiro arquivo `app.py`.
- Criar uma pagina HTML inicial.
- Rodar o sistema no navegador.

## Aula 02

- Entender o que e um banco de dados.
- Criar um banco SQLite chamado `cotacoes.db`.
- Criar a tabela `obras`.
- Criar um formulario para cadastrar obras.
- Listar as obras cadastradas na tela.

## Aula 03

- Criar a tabela `itens_obra`.
- Entender relacionamento entre tabelas usando `obra_id`.
- Criar uma tela para cadastrar itens dentro de uma obra.
- Validar campos vazios.
- Converter textos do formulario em numeros com `float`.
- Listar os itens cadastrados de cada obra.

## Aula 04

- Criar as tabelas `cotacoes_fornecedor` e `itens_cotacao`.
- Criar a tela para o fornecedor escolher uma obra.
- Criar o formulario para cotar todos os itens da obra.
- Calcular valor total por item.
- Calcular total dos produtos, frete, desconto e valor final.
- Salvar a cotacao completa no banco de dados.

## Como rodar

No terminal, entre nesta pasta:

```powershell
cd "D:\Documents\Cotações on-line\python_cotacoes_aula_01"
```

Crie um ambiente virtual:

```powershell
py -m venv .venv
```

Ative o ambiente virtual:

```powershell
.\.venv\Scripts\Activate.ps1
```

Instale o Flask:

```powershell
py -m pip install -r requirements.txt
```

Rode o sistema:

```powershell
py app.py
```

Depois abra no navegador:

```text
http://127.0.0.1:5000
```

## Arquivos importantes

- `app.py`: arquivo principal do sistema Flask.
- `database.py`: arquivo que cuida do banco de dados.
- `templates/home.html`: pagina inicial.
- `templates/obras.html`: pagina de cadastro e listagem de obras.
- `templates/obra_itens.html`: pagina de cadastro e listagem dos itens de uma obra.
- `templates/fornecedor.html`: pagina onde o fornecedor escolhe uma obra.
- `templates/fornecedor_cotacao.html`: pagina onde o fornecedor envia a cotacao.
- `cotacoes.db`: banco de dados criado automaticamente quando o sistema roda.
