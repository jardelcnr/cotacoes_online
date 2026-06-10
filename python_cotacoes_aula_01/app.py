import sqlite3  # Importa o sqlite3 para conseguirmos tratar erros vindos do banco SQLite.
from flask import Flask, redirect, render_template, request, url_for  # Importa ferramentas do Flask para paginas, formularios e redirecionamentos.
from database import buscar_obra_por_id, criar_cotacao_fornecedor, criar_item_obra, criar_obra, init_db, listar_cotacoes_da_obra, listar_itens_da_obra, listar_obras  # Importa as funcoes que criamos para trabalhar com o banco de dados.


app = Flask(__name__)  # Cria a aplicacao Flask; __name__ ajuda o Flask a encontrar arquivos do projeto.


init_db()  # Cria o banco e as tabelas necessarias assim que o sistema inicia.


@app.route("/")  # Define a rota principal do sistema, ou seja, o endereco inicial: http://127.0.0.1:5000/
def home():  # Cria a funcao que sera executada quando o usuario acessar a rota principal.
    return render_template("home.html")  # Mostra o arquivo home.html que esta dentro da pasta templates.


@app.route("/obras")  # Define a rota usada para mostrar a tela de obras.
def obras():  # Cria a funcao executada quando o usuario acessar /obras.
    lista_de_obras = listar_obras()  # Busca no banco todas as obras ja cadastradas.
    return render_template("obras.html", obras=lista_de_obras, erro=None)  # Mostra a pagina de obras e envia a lista para o HTML.


@app.route("/obras/nova", methods=["POST"])  # Define uma rota que recebe os dados enviados pelo formulario de nova obra.
def nova_obra():  # Cria a funcao responsavel por cadastrar uma obra no banco.
    nome_obra = request.form.get("nome_obra", "").strip()  # Pega o nome da obra digitado no formulario e remove espacos extras.
    numero_solicitacao = request.form.get("numero_solicitacao", "").strip()  # Pega o numero da solicitacao digitado no formulario.
    tipos_produtos = request.form.get("tipos_produtos", "").strip()  # Pega os tipos de produtos digitados no formulario.

    if not nome_obra or not numero_solicitacao or not tipos_produtos:  # Verifica se algum campo obrigatorio ficou vazio.
        lista_de_obras = listar_obras()  # Busca as obras novamente para continuar mostrando a lista na tela.
        return render_template("obras.html", obras=lista_de_obras, erro="Preencha todos os campos.")  # Mostra a tela com uma mensagem de erro.

    try:  # Inicia uma tentativa de gravar os dados no banco.
        criar_obra(nome_obra, numero_solicitacao, tipos_produtos)  # Chama a funcao que salva a obra no banco de dados.
    except sqlite3.IntegrityError:  # Captura o erro quando o numero da solicitacao ja existe.
        lista_de_obras = listar_obras()  # Busca as obras novamente para exibir a lista atualizada.
        return render_template("obras.html", obras=lista_de_obras, erro="Este numero de solicitacao ja existe.")  # Mostra uma mensagem amigavel.

    return redirect(url_for("obras"))  # Depois de salvar, volta para a tela de obras para evitar reenviar o formulario.


@app.route("/obras/<int:obra_id>/itens")  # Define uma rota dinamica; <int:obra_id> recebe o ID da obra pela URL.
def itens_obra(obra_id):  # Cria a funcao que mostra os itens de uma obra especifica.
    obra = buscar_obra_por_id(obra_id)  # Busca no banco a obra que corresponde ao ID recebido na URL.

    if obra is None:  # Verifica se nenhuma obra foi encontrada para o ID informado.
        return redirect(url_for("obras"))  # Se a obra nao existe, volta para a lista de obras.

    itens = listar_itens_da_obra(obra_id)  # Busca todos os itens cadastrados para esta obra.
    return render_template("obra_itens.html", obra=obra, itens=itens, erro=None)  # Mostra a pagina de itens enviando obra, itens e erro vazio.


@app.route("/obras/<int:obra_id>/itens/novo", methods=["POST"])  # Define a rota que recebe o formulario de novo item da obra.
def novo_item_obra(obra_id):  # Cria a funcao responsavel por cadastrar um item em uma obra.
    obra = buscar_obra_por_id(obra_id)  # Busca a obra para garantir que ela existe antes de cadastrar o item.

    if obra is None:  # Verifica se o usuario tentou cadastrar item em uma obra inexistente.
        return redirect(url_for("obras"))  # Se a obra nao existe, redireciona para a lista de obras.

    produto = request.form.get("produto", "").strip()  # Pega o produto ou servico digitado no formulario.
    unidade = request.form.get("unidade", "").strip()  # Pega a unidade digitada no formulario, como UN, KG ou M2.
    quantidade_texto = request.form.get("quantidade", "").strip()  # Pega a quantidade como texto, porque formulario sempre envia texto.
    orcamento_texto = request.form.get("orcamento_obra", "").strip()  # Pega o orcamento como texto pelo mesmo motivo.

    if not produto or not unidade or not quantidade_texto or not orcamento_texto:  # Verifica se algum campo obrigatorio ficou vazio.
        itens = listar_itens_da_obra(obra_id)  # Busca os itens ja cadastrados para manter a tabela na tela.
        return render_template("obra_itens.html", obra=obra, itens=itens, erro="Preencha todos os campos.")  # Mostra a mensagem de erro.

    try:  # Inicia uma tentativa de converter textos numericos em numeros de verdade.
        quantidade = float(quantidade_texto.replace(",", "."))  # Converte a quantidade para numero decimal e aceita virgula ou ponto.
        orcamento_obra = float(orcamento_texto.replace(",", "."))  # Converte o orcamento para numero decimal e aceita virgula ou ponto.
    except ValueError:  # Captura erro quando o usuario digita algo que nao pode virar numero.
        itens = listar_itens_da_obra(obra_id)  # Busca os itens ja cadastrados para manter a tabela na tela.
        return render_template("obra_itens.html", obra=obra, itens=itens, erro="Quantidade e orcamento precisam ser numeros.")  # Mostra uma mensagem clara.

    if quantidade <= 0:  # Verifica se a quantidade e menor ou igual a zero.
        itens = listar_itens_da_obra(obra_id)  # Busca os itens ja cadastrados para manter a tabela na tela.
        return render_template("obra_itens.html", obra=obra, itens=itens, erro="A quantidade precisa ser maior que zero.")  # Mostra uma mensagem de validacao.

    if orcamento_obra < 0:  # Verifica se o orcamento e negativo.
        itens = listar_itens_da_obra(obra_id)  # Busca os itens ja cadastrados para manter a tabela na tela.
        return render_template("obra_itens.html", obra=obra, itens=itens, erro="O orcamento nao pode ser negativo.")  # Mostra uma mensagem de validacao.

    criar_item_obra(obra_id, produto, unidade, quantidade, orcamento_obra)  # Salva o item da obra no banco de dados.
    return redirect(url_for("itens_obra", obra_id=obra_id))  # Volta para a tela de itens da mesma obra depois de salvar.


def converter_numero(texto, valor_padrao=None):  # Cria uma funcao auxiliar para transformar texto do formulario em numero.
    texto_limpo = texto.strip().replace(",", ".")  # Remove espacos extras e troca virgula por ponto.

    if texto_limpo == "" and valor_padrao is not None:  # Verifica se o campo veio vazio e existe um valor padrao.
        return valor_padrao  # Devolve o valor padrao definido por quem chamou a funcao.

    return float(texto_limpo)  # Converte o texto limpo em numero decimal.


@app.route("/fornecedor")  # Define a rota usada pelos fornecedores para escolher uma obra.
def fornecedor():  # Cria a funcao executada quando o usuario acessar /fornecedor.
    lista_de_obras = listar_obras()  # Busca todas as obras cadastradas para o fornecedor escolher.
    return render_template("fornecedor.html", obras=lista_de_obras)  # Mostra a tela do fornecedor enviando a lista de obras.


@app.route("/fornecedor/<int:obra_id>")  # Define a rota que mostra o formulario de cotacao para uma obra especifica.
def cotar_obra(obra_id):  # Cria a funcao que prepara a tela de cotacao do fornecedor.
    obra = buscar_obra_por_id(obra_id)  # Busca a obra escolhida pelo fornecedor.

    if obra is None:  # Verifica se a obra nao existe.
        return redirect(url_for("fornecedor"))  # Se a obra nao existe, volta para a tela de escolha.

    itens = listar_itens_da_obra(obra_id)  # Busca os itens cadastrados para esta obra.
    cotacoes = listar_cotacoes_da_obra(obra_id)  # Busca cotacoes ja enviadas para esta obra.
    return render_template("fornecedor_cotacao.html", obra=obra, itens=itens, cotacoes=cotacoes, erro=None)  # Mostra a tela de cotacao.


@app.route("/fornecedor/<int:obra_id>/salvar", methods=["POST"])  # Define a rota que recebe o formulario preenchido pelo fornecedor.
def salvar_cotacao(obra_id):  # Cria a funcao responsavel por validar e salvar a cotacao.
    obra = buscar_obra_por_id(obra_id)  # Busca a obra para garantir que ela existe.

    if obra is None:  # Verifica se a obra nao foi encontrada.
        return redirect(url_for("fornecedor"))  # Se a obra nao existe, volta para a tela do fornecedor.

    itens = listar_itens_da_obra(obra_id)  # Busca os itens da obra que precisam ser cotados.
    cotacoes = listar_cotacoes_da_obra(obra_id)  # Busca cotacoes existentes para continuar mostrando o historico.

    if not itens:  # Verifica se a obra ainda nao tem itens cadastrados.
        return render_template("fornecedor_cotacao.html", obra=obra, itens=itens, cotacoes=cotacoes, erro="Esta obra ainda nao possui itens para cotar.")  # Mostra erro se nao ha itens.

    nome_empresa = request.form.get("nome_empresa", "").strip()  # Pega o nome da empresa informado pelo fornecedor.
    nome_vendedor = request.form.get("nome_vendedor", "").strip()  # Pega o nome do vendedor informado pelo fornecedor.
    condicao_pagamento = request.form.get("condicao_pagamento", "").strip()  # Pega a condicao de pagamento informada.
    prazo_orcamento = request.form.get("prazo_orcamento", "").strip()  # Pega o prazo de validade do orcamento.
    prazo_entrega = request.form.get("prazo_entrega", "").strip()  # Pega o prazo de entrega informado.
    frete_texto = request.form.get("frete", "").strip()  # Pega o frete como texto.
    desconto_texto = request.form.get("desconto", "").strip()  # Pega o desconto como texto.

    if not nome_empresa or not nome_vendedor:  # Verifica se os campos obrigatorios do fornecedor foram preenchidos.
        return render_template("fornecedor_cotacao.html", obra=obra, itens=itens, cotacoes=cotacoes, erro="Informe o nome da empresa e do vendedor.")  # Mostra erro se faltar empresa ou vendedor.

    try:  # Inicia uma tentativa de converter os campos numericos.
        frete = converter_numero(frete_texto, 0)  # Converte o frete para numero e usa zero se estiver vazio.
        desconto = converter_numero(desconto_texto, 0)  # Converte o desconto para numero e usa zero se estiver vazio.
        itens_cotados = []  # Cria uma lista vazia para guardar os itens cotados.

        for item in itens:  # Percorre cada item da obra.
            campo = f"valor_unitario_{item['id']}"  # Monta o nome do campo HTML que contem o valor unitario deste item.
            valor_unitario = converter_numero(request.form.get(campo, ""))  # Converte o valor unitario digitado para numero.
            valor_total = valor_unitario * item["quantidade"]  # Calcula o total do item multiplicando valor unitario pela quantidade.

            if valor_unitario <= 0:  # Verifica se o valor unitario e menor ou igual a zero.
                raise ValueError  # Gera um erro para cair na mensagem de validacao.

            itens_cotados.append(  # Adiciona o item cotado na lista que sera salva no banco.
                {
                    "item_obra_id": item["id"],
                    "valor_unitario": valor_unitario,
                    "valor_total": valor_total,
                }
            )  # Fecha o dicionario com os dados do item cotado.
    except ValueError:  # Captura erro quando algum numero foi digitado incorretamente.
        return render_template("fornecedor_cotacao.html", obra=obra, itens=itens, cotacoes=cotacoes, erro="Preencha frete, desconto e valores unitarios com numeros validos maiores que zero.")  # Mostra erro numerico.

    if frete < 0 or desconto < 0:  # Verifica se frete ou desconto sao negativos.
        return render_template("fornecedor_cotacao.html", obra=obra, itens=itens, cotacoes=cotacoes, erro="Frete e desconto nao podem ser negativos.")  # Mostra erro se houver valor negativo.

    criar_cotacao_fornecedor(obra_id, nome_empresa, nome_vendedor, condicao_pagamento, prazo_orcamento, prazo_entrega, frete, desconto, itens_cotados)  # Salva a cotacao completa no banco.
    return redirect(url_for("cotar_obra", obra_id=obra_id))  # Volta para a tela da mesma obra apos salvar a cotacao.


@app.route("/comparativo")  # Define a rota que futuramente mostrara a comparacao de precos.
def comparativo():  # Cria a funcao executada quando o usuario acessar /comparativo.
    return "Aqui ficara a tela de comparativo de cotacoes."  # Retorna um texto simples temporario para testarmos a rota.


if __name__ == "__main__":  # Verifica se este arquivo esta sendo executado diretamente pelo Python.
    app.run(debug=True)  # Inicia o servidor Flask em modo debug, que ajuda a encontrar erros durante o aprendizado.
