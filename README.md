# Farol em Dia — Front-end

SPA (Single Page Application) para gestão de uma oficina especializada em manutenção de faróis. O projeto foi desenvolvido somente com **HTML, CSS e JavaScript puro**, sem frameworks de SPA.

## Funcionalidades

- Painel com indicadores da oficina;
- Lista e filtros de ordens de serviço;
- Cadastro de clientes, veículos e ordens;
- Atualização do status de cada serviço;
- Exclusão de registros com confirmação;
- Busca por cliente, placa, veículo, serviço ou número da ordem;
- Layout responsivo para computador, tablet e celular;
- Avisos de carregamento, sucesso, validação e falha de conexão;
- Chamadas para todas as rotas implementadas na API.

## Estrutura

```text
farol-em-dia-frontend/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Pré-requisito

A API `farol-em-dia-api` deve estar em execução em:

```text
http://127.0.0.1:5000
```

O endereço é definido na constante `API_URL`, no início do arquivo `app.js`.

## Inicialização

1. Inicie primeiro o projeto da API.
2. Abra o arquivo `index.html` diretamente no navegador.

Não é necessário instalar dependências, iniciar servidor local ou executar comandos adicionais. Isso atende ao requisito de execução direta pelo navegador.

## Tecnologias e restrições atendidas

- HTML semântico;
- CSS personalizado;
- JavaScript puro;
- SPA com troca de telas sem recarregar a página;
- Nenhum Angular, React ou Vue;
- Nenhuma biblioteca ou framework de JavaScript;
- Elementos apresentados em cards e tabelas;
- Integração completa com a API Flask.

## Fluxo recomendado para demonstração

1. Abra a visão geral e apresente os indicadores.
2. Cadastre um cliente.
3. Cadastre um veículo vinculado ao cliente.
4. Crie uma ordem de serviço para esse veículo.
5. Atualize o status da ordem.
6. Use a busca e os filtros.
7. Abra a documentação Swagger da API.
