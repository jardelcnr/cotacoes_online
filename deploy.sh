#!/bin/bash

################################################################################
# Script de Deploy - Sistema de Cotação de Obras
# Desenvolvido por: Jardel Ribeiro
#
# Este script facilita o processo de deploy para cada cliente
################################################################################

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir título
print_title() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

# Função para exibir mensagem de sucesso
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Função para exibir mensagem de erro
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função para exibir mensagem de aviso
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Função para exibir mensagem de info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

################################################################################
# INÍCIO DO SCRIPT
################################################################################

print_title "DEPLOY - Sistema de Cotação de Obras"

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    print_error "package.json não encontrado!"
    print_error "Execute este script na raiz do projeto."
    exit 1
fi

# Verificar se pnpm está instalado
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm não está instalado!"
    print_info "Instale com: npm install -g pnpm"
    exit 1
fi

################################################################################
# ETAPA 1: Coletar informações do cliente
################################################################################

print_title "ETAPA 1: Informações do Cliente"

echo -e "Digite o nome do cliente (ex: Empresa XYZ Ltda):"
read -r CLIENT_NAME

echo -e "\nDigite o domínio principal (ex: app.empresaxyz.com.br):"
read -r DOMAIN_MAIN

echo -e "\nDeseja adicionar domínio alternativo? (www.empresaxyz.com.br) [s/N]:"
read -r ADD_WWW
if [[ $ADD_WWW =~ ^[Ss]$ ]]; then
    echo -e "Digite o domínio alternativo:"
    read -r DOMAIN_ALT
fi

# Gerar Installation ID único
DATE_NOW=$(date +%Y-%m-%d)
INSTALLATION_ID=$(echo "$CLIENT_NAME-$DATE_NOW" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')

print_success "Installation ID gerado: $INSTALLATION_ID"

################################################################################
# ETAPA 2: Criar cópia do projeto para o cliente
################################################################################

print_title "ETAPA 2: Preparando Projeto"

# Nome da pasta do cliente
CLIENT_FOLDER=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')
BACKUP_FOLDER="../clientes/$CLIENT_FOLDER"

echo -e "Deseja criar cópia do projeto em '$BACKUP_FOLDER'? [s/N]:"
read -r CREATE_BACKUP
if [[ $CREATE_BACKUP =~ ^[Ss]$ ]]; then
    mkdir -p "../clientes"
    print_info "Copiando projeto..."
    cp -r . "$BACKUP_FOLDER"
    print_success "Cópia criada em: $BACKUP_FOLDER"
fi

################################################################################
# ETAPA 3: Configurar Licenciamento
################################################################################

print_title "ETAPA 3: Configurando Licenciamento"

LICENSE_FILE="src/app/utils/license.ts"

if [ ! -f "$LICENSE_FILE" ]; then
    print_error "Arquivo $LICENSE_FILE não encontrado!"
    exit 1
fi

# Backup do arquivo original
cp "$LICENSE_FILE" "${LICENSE_FILE}.backup"

print_info "Configurando domínios autorizados..."

# Construir lista de domínios
DOMAINS="'$DOMAIN_MAIN'"
if [ -n "$DOMAIN_ALT" ]; then
    DOMAINS="$DOMAINS,\n  '$DOMAIN_ALT'"
fi

# Atualizar arquivo de licença
# Nota: Esta é uma versão simplificada. Em produção, use ferramentas mais robustas.
print_warning "ATENÇÃO: Você precisa editar manualmente o arquivo:"
print_info "Arquivo: $LICENSE_FILE"
print_info ""
print_info "Altere para:"
echo -e "${YELLOW}"
echo "const AUTHORIZED_DOMAINS = ["
echo -e "  $DOMAINS"
echo "];"
echo ""
echo "const INSTALLATION_ID = '$INSTALLATION_ID';"
echo "const LICENSE_HOLDER = '$CLIENT_NAME';"
echo "const LICENSE_DATE = '$DATE_NOW';"
echo -e "${NC}"

echo -e "\nPressione ENTER após editar o arquivo..."
read -r

################################################################################
# ETAPA 4: Instalar Dependências
################################################################################

print_title "ETAPA 4: Instalando Dependências"

if [ -d "node_modules" ]; then
    print_warning "node_modules já existe. Deseja reinstalar? [s/N]:"
    read -r REINSTALL
    if [[ $REINSTALL =~ ^[Ss]$ ]]; then
        rm -rf node_modules
        pnpm install
    fi
else
    print_info "Instalando dependências..."
    pnpm install
fi

print_success "Dependências instaladas!"

################################################################################
# ETAPA 5: Build de Produção
################################################################################

print_title "ETAPA 5: Build de Produção"

print_info "Limpando build anterior..."
rm -rf dist

print_info "Gerando build de produção..."
pnpm run build

if [ ! -d "dist" ]; then
    print_error "Build falhou! Pasta dist não foi criada."
    exit 1
fi

print_success "Build concluído!"

# Verificar tamanho
DIST_SIZE=$(du -sh dist | cut -f1)
print_info "Tamanho do build: $DIST_SIZE"

################################################################################
# ETAPA 6: Escolher Plataforma de Deploy
################################################################################

print_title "ETAPA 6: Deploy"

echo "Escolha a plataforma de deploy:"
echo "1) Vercel (recomendado - gratuito)"
echo "2) Netlify (gratuito)"
echo "3) Manual (apenas preparar arquivos)"
echo "0) Pular deploy"
echo ""
read -p "Opção: " DEPLOY_OPTION

case $DEPLOY_OPTION in
    1)
        print_info "Deploy via Vercel..."

        # Verificar se Vercel CLI está instalado
        if ! command -v vercel &> /dev/null; then
            print_warning "Vercel CLI não instalado. Instalando..."
            npm i -g vercel
        fi

        print_info "Executando deploy..."
        vercel --prod

        print_success "Deploy concluído!"
        ;;

    2)
        print_info "Deploy via Netlify..."

        # Verificar se Netlify CLI está instalado
        if ! command -v netlify &> /dev/null; then
            print_warning "Netlify CLI não instalado. Instalando..."
            npm i -g netlify-cli
        fi

        print_info "Executando deploy..."
        netlify deploy --prod --dir=dist

        print_success "Deploy concluído!"
        ;;

    3)
        print_info "Arquivos prontos para deploy manual!"
        print_info "Pasta: ./dist/"
        print_info ""
        print_info "Próximos passos:"
        print_info "1. Acesse seu servidor via FTP/SSH"
        print_info "2. Envie todos os arquivos da pasta 'dist/' para o servidor"
        print_info "3. Configure SSL/HTTPS"
        print_success "Build pronto para deploy manual!"
        ;;

    0)
        print_warning "Deploy pulado."
        ;;

    *)
        print_error "Opção inválida!"
        ;;
esac

################################################################################
# ETAPA 7: Criar Documentação do Cliente
################################################################################

print_title "ETAPA 7: Documentação"

DOC_FILE="CLIENTE_${CLIENT_FOLDER}.txt"

cat > "$DOC_FILE" << EOF
================================================================================
SISTEMA DE COTAÇÃO DE OBRAS - INFORMAÇÕES DO CLIENTE
================================================================================

CLIENTE: $CLIENT_NAME
INSTALLATION ID: $INSTALLATION_ID
DATA DE INSTALAÇÃO: $DATE_NOW
VALIDADE: $(date -d "+1 year" +%Y-%m-%d 2>/dev/null || date -v+1y +%Y-%m-%d 2>/dev/null || echo "N/A")

DOMÍNIOS AUTORIZADOS:
- $DOMAIN_MAIN
$([ -n "$DOMAIN_ALT" ] && echo "- $DOMAIN_ALT")

SENHAS DO SISTEMA:
- Login Obra: MASTER
- Login Relatórios: MASTER
- Backup/Restauração: MASTER
- Exclusão de Fornecedor: MASTER

ARQUIVOS DO PROJETO:
- Pasta local: $BACKUP_FOLDER
- Build: ./dist/
- Tamanho: $DIST_SIZE

DEPLOY:
- Data: $(date +"%d/%m/%Y %H:%M")
- Por: $(whoami)

================================================================================
INSTRUÇÕES PARA O CLIENTE:
================================================================================

ACESSO AO SISTEMA:
URL: https://$DOMAIN_MAIN

DADOS:
- Os dados são salvos localmente no navegador do usuário
- IMPORTANTE: Fazer backup semanal usando o botão "Fazer Backup"
- Não limpar cache/cookies do navegador onde usa o sistema

NAVEGADORES COMPATÍVEIS:
- Google Chrome (recomendado)
- Microsoft Edge
- Mozilla Firefox
- Safari (versão recente)

SUPORTE TÉCNICO:
Email: [SEU EMAIL]
Telefone: [SEU TELEFONE]
Horário: Segunda a Sexta, 9h às 18h

================================================================================
EOF

print_success "Documentação criada: $DOC_FILE"

################################################################################
# FINALIZAÇÃO
################################################################################

print_title "✅ DEPLOY CONCLUÍDO COM SUCESSO!"

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    RESUMO DO DEPLOY                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Cliente: $CLIENT_NAME"
echo "Domínio: $DOMAIN_MAIN"
echo "Installation ID: $INSTALLATION_ID"
echo "Build: ./dist/ ($DIST_SIZE)"
echo "Documentação: $DOC_FILE"
echo ""
echo "PRÓXIMOS PASSOS:"
echo "1. Testar a aplicação em: https://$DOMAIN_MAIN"
echo "2. Verificar se proteção de domínio está funcionando"
echo "3. Enviar credenciais para o cliente"
echo "4. Fazer backup do projeto configurado"
echo ""
echo -e "${NC}"

print_success "Tudo pronto! 🚀"
