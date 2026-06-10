import sqlite3  # Importa o modulo sqlite3, que permite usar banco de dados SQLite com Python.
from datetime import datetime  # Importa datetime para registrar a data e hora de criacao da obra.
from pathlib import Path  # Importa Path para montar caminhos de arquivos de forma mais segura.


BASE_DIR = Path(__file__).resolve().parent  # Descobre a pasta onde este arquivo database.py esta salvo.
DATABASE_PATH = BASE_DIR / "cotacoes.db"  # Define o caminho completo do arquivo de banco de dados SQLite.


def get_connection():  # Cria uma funcao para abrir conexao com o banco sempre do mesmo jeito.
    connection = sqlite3.connect(DATABASE_PATH)  # Abre uma conexao com o arquivo cotacoes.db; se nao existir, o SQLite cria.
    connection.row_factory = sqlite3.Row  # Faz o SQLite devolver resultados parecidos com dicionarios, usando nomes das colunas.
    connection.execute("PRAGMA foreign_keys = ON")  # Liga a verificacao de chaves estrangeiras no SQLite.
    return connection  # Devolve a conexao para quem chamou a funcao.


def init_db():  # Cria uma funcao responsavel por preparar o banco de dados.
    connection = get_connection()  # Abre uma conexao com o banco de dados.
    connection.execute(  # Executa um comando SQL no banco.
        """ 
        CREATE TABLE IF NOT EXISTS obras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_obra TEXT NOT NULL,
            numero_solicitacao TEXT NOT NULL UNIQUE,
            tipos_produtos TEXT NOT NULL,
            data_criacao TEXT NOT NULL
        )
        """
    )  # Cria a tabela obras apenas se ela ainda nao existir.
    connection.execute(  # Executa outro comando SQL para criar a tabela de itens da obra.
        """
        CREATE TABLE IF NOT EXISTS itens_obra (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            obra_id INTEGER NOT NULL,
            produto TEXT NOT NULL,
            unidade TEXT NOT NULL,
            quantidade REAL NOT NULL,
            orcamento_obra REAL NOT NULL DEFAULT 0,
            FOREIGN KEY (obra_id) REFERENCES obras(id)
        )
        """
    )  # Cria a tabela itens_obra apenas se ela ainda nao existir.
    connection.execute(  # Executa um comando SQL para criar a tabela de cotacoes dos fornecedores.
        """
        CREATE TABLE IF NOT EXISTS cotacoes_fornecedor (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            obra_id INTEGER NOT NULL,
            nome_empresa TEXT NOT NULL,
            nome_vendedor TEXT NOT NULL,
            condicao_pagamento TEXT NOT NULL DEFAULT '',
            prazo_orcamento TEXT NOT NULL DEFAULT '',
            prazo_entrega TEXT NOT NULL DEFAULT '',
            frete REAL NOT NULL DEFAULT 0,
            desconto REAL NOT NULL DEFAULT 0,
            total_produtos REAL NOT NULL DEFAULT 0,
            valor_final REAL NOT NULL DEFAULT 0,
            data_cotacao TEXT NOT NULL,
            FOREIGN KEY (obra_id) REFERENCES obras(id)
        )
        """
    )  # Cria a tabela cotacoes_fornecedor apenas se ela ainda nao existir.
    connection.execute(  # Executa um comando SQL para criar a tabela de itens cotados.
        """
        CREATE TABLE IF NOT EXISTS itens_cotacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cotacao_id INTEGER NOT NULL,
            item_obra_id INTEGER NOT NULL,
            valor_unitario REAL NOT NULL,
            valor_total REAL NOT NULL,
            FOREIGN KEY (cotacao_id) REFERENCES cotacoes_fornecedor(id),
            FOREIGN KEY (item_obra_id) REFERENCES itens_obra(id)
        )
        """
    )  # Cria a tabela itens_cotacao apenas se ela ainda nao existir.
    connection.commit()  # Confirma as alteracoes feitas no banco.
    connection.close()  # Fecha a conexao para liberar o arquivo do banco.


def criar_obra(nome_obra, numero_solicitacao, tipos_produtos):  # Cria uma funcao para cadastrar uma nova obra.
    connection = get_connection()  # Abre uma conexao com o banco de dados.
    data_criacao = datetime.now().isoformat(timespec="seconds")  # Gera a data e hora atual em formato de texto.
    connection.execute(  # Executa o comando SQL que insere uma obra na tabela.
        """
        INSERT INTO obras (nome_obra, numero_solicitacao, tipos_produtos, data_criacao)
        VALUES (?, ?, ?, ?)
        """,
        (nome_obra, numero_solicitacao, tipos_produtos, data_criacao),
    )  # Envia os valores separados para evitar SQL Injection e deixar o codigo mais seguro.
    connection.commit()  # Confirma a gravacao da obra no banco.
    connection.close()  # Fecha a conexao com o banco.


def listar_obras():  # Cria uma funcao para buscar todas as obras cadastradas.
    connection = get_connection()  # Abre uma conexao com o banco de dados.
    obras = connection.execute(  # Executa uma consulta SQL e guarda o resultado.
        """
        SELECT id, nome_obra, numero_solicitacao, tipos_produtos, data_criacao
        FROM obras
        ORDER BY id DESC
        """
    ).fetchall()  # Busca todas as linhas encontradas pela consulta.
    connection.close()  # Fecha a conexao com o banco.
    return obras  # Devolve a lista de obras para quem chamou a funcao.


def buscar_obra_por_id(obra_id):  # Cria uma funcao para buscar uma unica obra pelo codigo dela.
    connection = get_connection()  # Abre uma conexao com o banco de dados.
    obra = connection.execute(  # Executa uma consulta SQL para procurar a obra desejada.
        """
        SELECT id, nome_obra, numero_solicitacao, tipos_produtos, data_criacao
        FROM obras
        WHERE id = ?
        """,
        (obra_id,),
    ).fetchone()  # Busca apenas uma linha, porque o ID identifica uma unica obra.
    connection.close()  # Fecha a conexao com o banco.
    return obra  # Devolve a obra encontrada, ou None se o ID nao existir.


def criar_item_obra(obra_id, produto, unidade, quantidade, orcamento_obra):  # Cria uma funcao para cadastrar um item dentro de uma obra.
    connection = get_connection()  # Abre uma conexao com o banco de dados.
    connection.execute(  # Executa o comando SQL que insere um item na tabela itens_obra.
        """
        INSERT INTO itens_obra (obra_id, produto, unidade, quantidade, orcamento_obra)
        VALUES (?, ?, ?, ?, ?)
        """,
        (obra_id, produto, unidade, quantidade, orcamento_obra),
    )  # Envia os valores separados para o SQLite preencher os pontos de interrogacao com seguranca.
    connection.commit()  # Confirma a gravacao do item no banco.
    connection.close()  # Fecha a conexao com o banco.


def listar_itens_da_obra(obra_id):  # Cria uma funcao para listar todos os itens de uma obra especifica.
    connection = get_connection()  # Abre uma conexao com o banco de dados.
    itens = connection.execute(  # Executa uma consulta SQL buscando apenas itens da obra escolhida.
        """
        SELECT id, obra_id, produto, unidade, quantidade, orcamento_obra
        FROM itens_obra
        WHERE obra_id = ?
        ORDER BY id DESC
        """,
        (obra_id,),
    ).fetchall()  # Busca todas as linhas encontradas pela consulta.
    connection.close()  # Fecha a conexao com o banco.
    return itens  # Devolve a lista de itens para quem chamou a funcao.


def criar_cotacao_fornecedor(obra_id, nome_empresa, nome_vendedor, condicao_pagamento, prazo_orcamento, prazo_entrega, frete, desconto, itens_cotados):  # Cria uma funcao para salvar uma cotacao completa.
    connection = get_connection()  # Abre uma conexao com o banco de dados.
    total_produtos = sum(item["valor_total"] for item in itens_cotados)  # Soma o valor total de todos os itens cotados.
    valor_final = total_produtos + frete - desconto  # Calcula o valor final da cotacao usando produtos, frete e desconto.
    data_cotacao = datetime.now().isoformat(timespec="seconds")  # Gera a data e hora atual para registrar quando a cotacao foi feita.

    try:  # Inicia um bloco de tentativa para salvar a cotacao e os itens juntos.
        cursor = connection.execute(  # Insere a cotacao principal na tabela cotacoes_fornecedor.
            """
            INSERT INTO cotacoes_fornecedor (
                obra_id, nome_empresa, nome_vendedor, condicao_pagamento,
                prazo_orcamento, prazo_entrega, frete, desconto,
                total_produtos, valor_final, data_cotacao
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                obra_id,
                nome_empresa,
                nome_vendedor,
                condicao_pagamento,
                prazo_orcamento,
                prazo_entrega,
                frete,
                desconto,
                total_produtos,
                valor_final,
                data_cotacao,
            ),
        )  # Envia os valores da cotacao de forma segura para o SQLite.
        cotacao_id = cursor.lastrowid  # Guarda o ID que o banco criou para a cotacao.

        for item in itens_cotados:  # Percorre cada item cotado pelo fornecedor.
            connection.execute(  # Insere um item cotado na tabela itens_cotacao.
                """
                INSERT INTO itens_cotacao (cotacao_id, item_obra_id, valor_unitario, valor_total)
                VALUES (?, ?, ?, ?)
                """,
                (cotacao_id, item["item_obra_id"], item["valor_unitario"], item["valor_total"]),
            )  # Salva o valor unitario e o valor total daquele item.

        connection.commit()  # Confirma a cotacao inteira no banco.
    except Exception:  # Captura qualquer erro ocorrido durante a gravacao da cotacao.
        connection.rollback()  # Desfaz tudo se algum item falhar, para nao salvar cotacao incompleta.
        raise  # Envia o erro novamente para o Flask mostrar ou tratar.
    finally:  # Define um bloco que sempre sera executado, com erro ou sem erro.
        connection.close()  # Fecha a conexao com o banco.

    return cotacao_id  # Devolve o ID da cotacao criada.


def listar_cotacoes_da_obra(obra_id):  # Cria uma funcao para listar as cotacoes ja enviadas para uma obra.
    connection = get_connection()  # Abre uma conexao com o banco de dados.
    cotacoes = connection.execute(  # Executa uma consulta SQL buscando cotacoes da obra escolhida.
        """
        SELECT id, obra_id, nome_empresa, nome_vendedor, condicao_pagamento,
               prazo_orcamento, prazo_entrega, frete, desconto,
               total_produtos, valor_final, data_cotacao
        FROM cotacoes_fornecedor
        WHERE obra_id = ?
        ORDER BY id DESC
        """,
        (obra_id,),
    ).fetchall()  # Busca todas as cotacoes encontradas.
    connection.close()  # Fecha a conexao com o banco.
    return cotacoes  # Devolve a lista de cotacoes para quem chamou a funcao.
