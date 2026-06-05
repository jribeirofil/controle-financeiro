# Controle Financeiro Familiar

App web para lançamento rápido de despesas e receitas do casal.

## Como hospedar no GitHub Pages (gratuito)

### Passo a passo

1. Acesse [github.com](https://github.com) e crie uma conta gratuita (se ainda não tiver).

2. Clique em **New repository** (botão verde no canto superior direito).
   - Nome sugerido: `controle-financeiro`
   - Marque **Public**
   - Clique em **Create repository**

3. Na tela do repositório vazio, clique em **uploading an existing file**.

4. Arraste todos os arquivos desta pasta:
   - `index.html`
   - `style.css`
   - `app.js`
   - `manifest.json`
   - `icon-192.png` (se tiver)
   - `icon-512.png` (se tiver)

5. Clique em **Commit changes**.

6. Vá em **Settings** (aba do repositório) → **Pages** (menu lateral).

7. Em **Source**, selecione `Deploy from a branch` → branch `main` → pasta `/ (root)`.

8. Clique em **Save**. Em alguns minutos o site estará disponível em:
   `https://SEU-USUARIO.github.io/controle-financeiro/`

---

## Como adicionar na tela inicial do celular

### Android (Chrome)
1. Abra o link no Chrome.
2. Toque nos três pontos no canto superior direito.
3. Toque em **Adicionar à tela inicial**.
4. Confirme. O app aparecerá como ícone, sem barra do navegador.

### iPhone (Safari)
1. Abra o link no Safari.
2. Toque no ícone de compartilhar (quadrado com seta para cima).
3. Toque em **Adicionar à Tela de Início**.
4. Confirme. O app abrirá em tela cheia como um aplicativo nativo.

---

## Sobre os dados

Os lançamentos ficam salvos no armazenamento local do dispositivo (localStorage).
Isso significa que cada aparelho tem sua própria lista. Para sincronizar entre dois
celulares, a próxima etapa seria conectar ao Google Sheets via API — o que pode ser
feito futuramente.

---

## Estrutura dos arquivos

```
index.html     → estrutura da página
style.css      → visual e tema (modo claro e escuro automático)
app.js         → lógica, categorias e persistência local
manifest.json  → configurações para instalação como app
```
