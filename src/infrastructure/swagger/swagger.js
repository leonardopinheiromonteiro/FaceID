/**
 * Swagger OpenAPI 3.0 Specifications & Interactive Documentation Handler
 */
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'FaceID Biometrics API',
    version: '2.5.0',
    description: 'API de Autenticação Biométrica Facial em Tempo Real com Reconhecimento Neural de 128D, Controle de Acesso por Grupos/Perfis, Logs de Auditoria Imutáveis e Persistência Dupla (PostgreSQL / JSON).'
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Servidor HTTP Local (Desktop)' },
    { url: 'https://localhost:3443', description: 'Servidor HTTPS Local (Mobile/SSL)' }
  ],
  components: {
    securitySchemes: {
      OperatorAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-user-id',
        description: 'ID do Operador Autenticado no Sistema'
      }
    }
  },
  paths: {
    '/api/auth/login': {
      post: {
        summary: 'Autenticar Operador no Sistema',
        tags: ['Autenticação'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'admin123' }
                },
                required: ['username', 'password']
              }
            }
          }
        },
        responses: {
          200: { description: 'Login efetuado com sucesso' },
          401: { description: 'Usuário ou senha inválidos' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Consultar Operador Logado',
        tags: ['Autenticação'],
        security: [{ OperatorAuth: [] }],
        responses: {
          200: { description: 'Dados do operador autenticado' },
          401: { description: 'Não autenticado' }
        }
      }
    },
    '/api/verify': {
      post: {
        summary: 'Verificação Biométrica Facial em Tempo Real (128D)',
        tags: ['Biometria'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  descriptor: { type: 'array', items: { type: 'number' }, description: 'Vetor numérico 128D da face' },
                  image: { type: 'string', description: 'Imagem Base64 capturada com marca d água' }
                },
                required: ['descriptor']
              }
            }
          }
        },
        responses: {
          200: { description: 'Resultado da verificação biométrica (Sucesso / Falha)' }
        }
      }
    },
    '/api/register': {
      post: {
        summary: 'Cadastrar Nova Credencial Biométrica',
        tags: ['Credenciais Biométricas'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  branch: { type: 'string', example: '0101' },
                  registration: { type: 'string', example: 'MAT_000100' },
                  name: { type: 'string', example: 'João da Silva' },
                  department: { type: 'string', example: 'TI' },
                  role: { type: 'string', example: 'Analista de Sistemas' },
                  descriptor: { type: 'array', items: { type: 'number' } },
                  image: { type: 'string' }
                },
                required: ['registration', 'name', 'descriptor']
              }
            }
          }
        },
        responses: {
          201: { description: 'Credencial cadastrada com sucesso' },
          400: { description: 'Erro de validação ou matrícula duplicada' }
        }
      }
    },
    '/api/users': {
      get: {
        summary: 'Listar Todas as Credenciais Biométricas',
        tags: ['Credenciais Biométricas'],
        responses: {
          200: { description: 'Lista de credenciais' }
        }
      }
    },
    '/api/profiles': {
      get: {
        summary: 'Listar Perfis / Grupos de Acesso',
        tags: ['Perfis de Acesso'],
        responses: { 200: { description: 'Lista de perfis com permissões' } }
      },
      post: {
        summary: 'Criar Novo Perfil / Grupo de Acesso',
        tags: ['Perfis de Acesso'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Operadores de Portaria' },
                  description: { type: 'string', example: 'Acesso apenas ao módulo de leitura biométrica' },
                  permissions: { type: 'array', items: { type: 'string' }, example: ['auth', 'register'] }
                },
                required: ['name']
              }
            }
          }
        },
        responses: { 201: { description: 'Perfil criado com sucesso' } }
      }
    },
    '/api/system-users': {
      get: {
        summary: 'Listar Usuários do Sistema',
        tags: ['Usuários do Sistema'],
        responses: { 200: { description: 'Lista de usuários e logins' } }
      },
      post: {
        summary: 'Criar Usuário do Sistema e Vincular a um Perfil',
        tags: ['Usuários do Sistema'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'operador_portaria' },
                  name: { type: 'string', example: 'Carlos Eduardo' },
                  password: { type: 'string', example: 'senha123' },
                  profileId: { type: 'string', example: 'prf_portaria' }
                },
                required: ['username', 'name', 'password']
              }
            }
          }
        },
        responses: { 201: { description: 'Usuário criado com sucesso' } }
      }
    },
    '/api/logs': {
      get: {
        summary: 'Histórico de Acessos Biométricos',
        tags: ['Auditoria'],
        responses: { 200: { description: 'Lista de acessos gravados' } }
      },
      delete: {
        summary: 'Excluir Histórico (BLOQUEADO / IMPERMITIDO)',
        tags: ['Auditoria'],
        responses: { 403: { description: 'Exclusão proibida por políticas de imutabilidade' } }
      }
    },
    '/api/system-logs': {
      get: {
        summary: 'Trilha de Auditoria de Alterações no Banco de Dados',
        tags: ['Auditoria'],
        responses: { 200: { description: 'Registros de mutações no banco' } }
      }
    }
  }
};

function serveSwaggerUI(req, res) {
  const jsonSpec = JSON.stringify(openApiSpec);
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>FaceID API - Swagger Documentation</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <style>
        body { margin: 0; background: #090d16; color: #fff; font-family: sans-serif; }
        .swagger-ui { background: #0d1320; filter: invert(88%) hue-rotate(180deg); }
        .swagger-ui .topbar { display: none; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
      <script>
        window.onload = function() {
          SwaggerUIBundle({
            spec: ${jsonSpec},
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [SwaggerUIBundle.presets.apis]
          });
        };
      </script>
    </body>
    </html>
  `;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

module.exports = {
  openApiSpec,
  serveSwaggerUI
};
