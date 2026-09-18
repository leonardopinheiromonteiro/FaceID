FROM node:20-alpine

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar código fonte, modelos neurais e frontend
COPY . .

# Variáveis padrão de ambiente para produção
ENV NODE_ENV=production
ENV PORT=8080

# Expor porta do Cloud Run
EXPOSE 8080

# Iniciar o servidor
CMD ["node", "server.js"]
