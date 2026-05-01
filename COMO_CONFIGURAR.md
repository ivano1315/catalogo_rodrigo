# Como configurar o Catálogo

## 1. Criar conta no MongoDB Atlas (gratuito)

1. Acesse: https://www.mongodb.com/cloud/atlas/register
2. Crie uma conta gratuita
3. Crie um cluster (escolha M0 FREE)
4. Em "Database Access": crie um usuário e senha
5. Em "Network Access": adicione `0.0.0.0/0` (permite qualquer IP)
6. Clique em "Connect" → "Drivers" → copie a string de conexão

## 2. Configurar a string de conexão

Edite o arquivo `.env.local` e substitua:
```
MONGODB_URI=mongodb+srv://SEU_USUARIO:SUA_SENHA@cluster0.xxxxx.mongodb.net/catalogo?retryWrites=true&w=majority
```

Exemplo real:
```
MONGODB_URI=mongodb+srv://rodrigo:minhasenha123@cluster0.abc12.mongodb.net/catalogo?retryWrites=true&w=majority
```

## 3. Importar os produtos do Excel

1. Copie o arquivo Excel para: `scripts/TABELA.xlsx`
2. Execute:
```bash
npm run importar
```

Aguarde a mensagem: `Concluido! 562 inseridos`

## 4. Rodar o app localmente

```bash
npm run dev
```

Acesse: http://localhost:3000

## 5. Publicar no Vercel

1. Instale o Vercel CLI: `npm install -g vercel`
2. Execute: `vercel`
3. Siga as instruções
4. No painel do Vercel, vá em Settings → Environment Variables
5. Adicione: `MONGODB_URI` com o mesmo valor do `.env.local`
6. Execute: `vercel --prod`
