# Documentação de Arquitetura, Implantação e APIs - FaceID Biometrics

> **Sistema de Autenticação Biométrica Facial, Controle de Acesso e Gestão da Qualidade (SGQ/SAC)**

---

## 1. Visão Geral do Sistema

O **FaceID Biometrics** é um sistema completo e de alto desempenho projetado para controle de acesso biológico em catracas, portarias, relógios de ponto e auditorias de segurança da informação/qualidade. 

O sistema opera no navegador com aceleração via WebGL através da biblioteca `face-api.js` (TensorFlow.js) e realiza a persistência segura dos dados e descritores faciais (vetores numéricos de 128 dimensões) no banco de dados **PostgreSQL** (com suporte de fallback automático para armazenamento de arquivos JSON em ambientes de desenvolvimento sem banco).

### Destaques do Sistema:
- **Biometria em Tempo Real**: Leitura facial ultra-rápida via webcam/dispositivo móvel com indicador visual de enquadramento (oval proporcional a todas as resoluções).
- **Gestão de Perfis de Acesso (RBAC)**: Herança dinâmica de privilégios com base em grupos/perfis (`Administrador`, `Operador de Portaria`, `Auditor / SGQ`, etc.).
- **Auditoria Imutável e Integridade**: Registro inviolável de acessos e operações do sistema, armazenando matricula, filial, foto original capturada no instante do evento e timestamp com marcação indelével.
- **Arquitetura Limpa (Clean Architecture)**: Separação rigorosa entre Entidades de Domínio, Casos de Uso, Infraestrutura e Controladores HTTP.
- **Sistema Integrado de Migrações SQL**: Versionamento automático de schema para banco de dados relacional.
- **Documentação de API Interativa (Swagger / OpenAPI 3.0)**: Interface gráfica interativa para teste e integração no endpoint `/api-docs`.

---

## 2. Arquitetura da Aplicação (Clean Architecture & SOLID)

A estrutura do projeto segue os princípios da **Clean Architecture (Uncle Bob)** e **Domain-Driven Design (DDD)**:

```
FaceId/
├── public/                     # Interface Web (HTML5, CSS3 Glassmorphism, JS ES6 Vanilla)
│   ├── css/style.css           # Design System responsivo e regras mobile-first
│   ├── js/app.js               # Orquestração do Frontend e comunicação REST
│   └── index.html              # Layout principal SPA (Single Page Application)
├── src/
│   ├── domain/                 # Regras de Negócio e Entidades Puramente Tecnológicas
│   │   ├── entities/
│   │   │   ├── User.js         # Entidade Usuário Credenciado (Biometria)
│   │   │   ├── AccessLog.js    # Entidade Registro de Coleta Biométrica / Acesso
│   │   │   ├── SystemUser.js   # Entidade Operador / Usuário do Sistema
│   │   │   └── Profile.js      # Entidade Perfil / Grupo de Permissões
│   │   └── repositories/       # Contratos/Interfaces de Repositórios
│   ├── application/            # Casos de Uso (Application Services)
│   │   ├── use-cases/
│   │   │   ├── UserUseCases.js
│   │   │   ├── SystemUserUseCases.js
│   │   │   ├── ProfileUseCases.js
│   │   │   └── AuditUseCases.js
│   ├── infrastructure/         # Frameworks, Banco de Dados e Serviços Externos
│   │   ├── database/
│   │   │   ├── initPostgres.js # Conexão e Inicialização do Pool PostgreSQL (pg)
│   │   │   ├── MigrationRunner.js # Executor de Migrações de Schema SQL
│   │   │   └── migrations/     # Scripts SQL versionados (.sql)
│   │   ├── repositories/       # Implementações dos Repositórios (PostgreSQL & JSON Fallback)
│   │   └── swagger/
│   │       └── swagger.js      # Especificação OpenAPI 3.0 e Swagger UI Express
│   └── presentation/           # Camada REST / HTTP (Controllers & Express Routes)
│       ├── controllers/
│       └── routes/
├── certs/                      # Certificados SSL/TLS para execução em HTTPS
├── models/                     # Modelos de Redes Neurais para Leitura Facial (face-api.js)
├── server.js                   # Ponto de Entrada da Aplicação (Express HTTPS & Repositories DI)
└── DOCUMENTATION.md            # Guia Oficial do Sistema (este documento)
```

---

## 3. Gestão de Usuários, Perfis e Permissões (RBAC)

O controle de privilégios é baseado em **Perfis / Grupos de Acesso**:

### Perfis Padrão do Sistema:
1. **Administrador (`admin`)**: Possui acesso irrestrito a todas as opções do sistema.
2. **Operador de Portaria (`operator`)**: Permissões focadas na verificação biométrica em tempo real (`auth`) e consulta de status (`status`).
3. **Auditor / SGQ (`auditor`)**: Acesso especializado à consulta de Histórico de Auditoria (`audit`) e logs do sistema (`system_logs`).

### Matriz de Módulos / Permissões do Sistema:
| Código da Permissão | Nome na Interface | Descrição |
| :--- | :--- | :--- |
| `auth` | Autenticação Biométrica | Acesso à tela de verificação e liberação de catraca em tempo real. |
| `register` | Credenciamento Biométrico | Acesso ao cadastro de novos usuários biométricos e captura de face. |
| `credentials` | Lista de Credenciados | Visualização, consulta e alteração do status de credenciados. |
| `status` | Status do Servidor | Monitoramento em tempo real do status dos serviços e banco de dados. |
| `audit` | Histórico de Coletas/Auditoria | Acesso à consulta completa de coletas biométricas e fotos capturadas. |
| `system_users` | Gestão de Operadores | Cadastro e controle de acessos de operadores do sistema. |
| `profiles` | Perfis e Permissões | Criação e manutenção de perfis/grupos de acesso. |

---

## 4. Auditoria Imutável e Segurança dos Dados

O FaceID Biometrics garante a rastreabilidade total das operações com foco nas normas da **LGPD** e de auditoria de qualidade (**ISO 9001 / SGQ**):

1. **Inviolabilidade do Histórico**:
   - É estritamente **proibida** qualquer rotina de deleção (`DELETE`) ou substituição no histórico de auditoria (`access_logs` e `system_logs`).
   - Todos os botões ou endpoints de exclusão de logs foram removidos do sistema.
2. **Carimbo d'Água nas Imagens de Auditoria**:
   - Toda validação biométrica gera uma captura de imagem gravada em base64 com marcação indelével contendo: Data, Hora e Matrícula do indivíduo.
3. **Log de Operações administrativas**:
   - Qualquer inserção, modificação de perfil ou alteração de status de operador fica registrado na tabela `system_logs`.

---

## 5. Sistema de Migrações de Banco de Dados SQL

O projeto conta com o **`MigrationRunner`**, um orquestrador automático de scripts SQL localizado em `src/infrastructure/database/migrations/`.

### Como Funciona:
Ao iniciar a aplicação (`node server.js`), o sistema executa o runner que verifica a tabela `schema_migrations`. Caso existam novos arquivos `.sql`, eles são executados em ordem alfabética dentro de transações seguras:

1. `001_initial_schema.sql`: Cria as tabelas principais (`users`, `access_logs`, `system_logs`, `system_users`).
2. `002_create_profiles.sql`: Cria a tabela `system_profiles` e adiciona a chave estrangeira `profile_id` na tabela `system_users`.

---

## 6. Documentação de APIs com Swagger UI (OpenAPI 3.0)

O sistema expõe a especificação de API de forma interativa e visual através da ferramenta **Swagger UI**.

- **URL do Swagger UI**: `https://<SEU_DOMINIO_OU_IP>:3443/api-docs` (ou `http://localhost:3000/api-docs`).

### Endpoints Principais:
- **Autenticação**:
  - `POST /api/system-users/login`: Autenticação de operador com login e senha.
- **Biometria & Credenciamento**:
  - `GET /api/users`: Lista todos os usuários credenciados.
  - `POST /api/users`: Cadastra um novo usuário biométrico (valida matrícula duplicada).
  - `POST /api/users/verify`: Processa o vetor facial de 128 posições enviado pelo cliente e retorna match/divergência.
- **Auditoria**:
  - `GET /api/audit-logs`: Consulta o histórico completo de coletas biométricas (com suporte a filtros por matrícula/filial).
  - `GET /api/system-logs`: Consulta logs de eventos administrativos.
- **Gestão de Operadores e Perfis**:
  - `GET /api/profiles`: Lista todos os perfis de acesso cadastrados.
  - `POST /api/profiles`: Cria ou atualiza um perfil de acesso com lista de permissões.
  - `GET /api/system-users`: Lista todos os operadores do sistema.
  - `POST /api/system-users`: Cadastra um novo operador associado a um perfil.

---

## 7. Procedimento de Colocação em Produção

### 7.1 Requisitos do Servidor

- **Sistema Operacional**: Ubuntu Server 22.04 LTS (Recomendado) ou Windows Server 2019/2022.
- **Hardware Mínimo**:
  - 4 vCPUs / 8 GB RAM / 50 GB SSD
- **Softwares Necessários**:
  - Node.js LTS (v18 ou v20+)
  - Docker & Docker Compose (para execução do PostgreSQL)
  - PM2 (Process Manager para Node.js)
  - Nginx (Reverse Proxy & Rescisão SSL/TLS)

---

### 7.2 Instalação e Configuração Passo a Passo

#### Passo 1: Clonar o Repositório e Instalar Dependências
```bash
cd /opt
git clone <URL_DO_REPOSITORIO>/FaceId.git
cd FaceId
npm install --production
```

#### Passo 2: Subir o Banco de Dados PostgreSQL (Docker)
Crie ou ajuste o arquivo `docker-compose.yml` na raiz:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: faceid-postgres
    restart: always
    environment:
      POSTGRES_DB: faceid
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: suasenhaseguraaqui
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Inicialize o container:
```bash
docker-compose up -d
```

#### Passo 3: Configurar Variáveis de Ambiente (`.env`)
Crie um arquivo `.env` na raiz da aplicação:
```env
PORT=3000
HTTPS_PORT=3443
NODE_ENV=production

DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=faceid
DB_USER=postgres
DB_PASSWORD=suasenhaseguraaqui

DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASS=SenhaSuperSegura123!
```

#### Passo 4: Executar com PM2 (Process Manager)
O PM2 garante a reinicialização automática da aplicação em caso de falhas ou reboot do servidor:
```bash
npm install -g pm2
pm2 start server.js --name "faceid-api"
pm2 save
pm2 startup
```

---

### 7.3 Configuração do Proxy Reverso Nginx com HTTPS (SSL)

Para que a câmera abra em navegadores mobile (Chrome, Safari, Edge), a aplicação **DEVE ser servida obrigatoriamente via HTTPS com certificado válido**.

#### Exemplo de arquivo `/etc/nginx/sites-available/faceid.conf`:
```nginx
server {
    listen 80;
    server_name faceid.suaempresa.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name faceid.suaempresa.com.br;

    ssl_certificate /etc/letsencrypt/live/faceid.suaempresa.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/faceid.suaempresa.com.br/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Suporte a uploads de fotos de alta resolução
    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative a configuração no Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/faceid.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Backup e Manutenção Preventiva

### Backup Automático do PostgreSQL:
Crie uma rotina diária no Cron (`crontab -e`):
```bash
0 2 * * * docker exec -t faceid-postgres pg_dump -U postgres faceid | gzip > /backups/faceid_$(date +\%Y\%m\%d).sql.gz
```

---

*Documentação atualizada e validada para ambiente de produção.*
