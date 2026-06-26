# 📘 API E-commerce — Documentação de Rotas (Sprints 1–4)

Documentação de referência rápida de todas as rotas implementadas até o momento. Cada rota mostra **o que faz**, **erros possíveis** e exemplos de **entrada/saída em JSON** prontos para copiar.

> **Base URL:** `http://localhost:3000`
> **Autenticação:** rotas marcadas com 🔒 exigem o header `Authorization: Bearer {accessToken}`. Rotas com 🔒👑 exigem também que o usuário seja `ADMIN`.

---

## 📑 Sumário

- [Erros Comuns (toda a API)](#-erros-comuns-toda-a-api)
- [Sprint 1 — Sistema](#-sprint-1--sistema)
- [Sprint 2 — Autenticação](#-sprint-2--autenticação)
- [Sprint 2 — Usuários](#-sprint-2--usuários)
- [Sprint 3 — Categorias](#-sprint-3--categorias)
- [Sprint 3 — Produtos](#-sprint-3--produtos)
- [Sprint 4 — Carrinho](#-sprint-4--carrinho)
- [Sprint 4 — Wishlist](#-sprint-4--wishlist)
- [Sprint 4 — Avaliações](#-sprint-4--avaliações)

---

## ⚠️ Erros Comuns (toda a API)

Esses formatos de erro podem aparecer em **qualquer rota**. Os erros específicos de cada rota estão listados individualmente nas seções abaixo.

| Código | Significado         | Quando ocorre                                            |
| ------ | ------------------- | -------------------------------------------------------- |
| `400`  | Requisição inválida | Regra de negócio violada (ex: estoque insuficiente)      |
| `401`  | Não autorizado      | Token ausente, inválido ou expirado                      |
| `403`  | Acesso negado       | Usuário autenticado, mas sem permissão (ex: não é admin) |
| `404`  | Não encontrado      | Recurso não existe ou foi removido                       |
| `409`  | Conflito            | Duplicidade (ex: e-mail ou SKU já existe)                |
| `415`  | Tipo não suportado  | Upload de arquivo em formato não permitido               |
| `422`  | Erro de validação   | Dados do corpo/query não passaram na validação Zod       |
| `429`  | Muitas requisições  | Rate limit excedido (100 req/15min)                      |
| `500`  | Erro interno        | Falha inesperada no servidor                             |

```json
// 400 / 401 / 403 / 404 / 409 / 415 — formato padrão
{
  "status": "error",
  "message": "Descrição legível do erro"
}
```

```json
// 422 — erro de validação (Zod), com detalhe por campo
{
  "status": "error",
  "message": "Dados inválidos",
  "errors": {
    "email": ["E-mail inválido"],
    "password": ["Senha deve ter pelo menos 8 caracteres"]
  }
}
```

```json
// 429 — limite de requisições
{
  "status": "error",
  "message": "Muitas requisições, tente novamente mais tarde."
}
```

```json
// 500 — erro interno (detalhes ocultos em produção)
{
  "status": "error",
  "message": "Erro interno do servidor"
}
```

---

## 🖥 Sprint 1 — Sistema

### `GET /health`

**O que faz:** Verifica se a API está no ar.
**Autenticação:** Nenhuma
**Erros possíveis:** Nenhum específico

**Saída (200):**

```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2026-06-26T12:00:00.000Z"
}
```

---

## 🔑 Sprint 2 — Autenticação

### `POST /api/v1/auth/register`

**O que faz:** Cria uma nova conta de usuário e já retorna os tokens de acesso.
**Autenticação:** Nenhuma
**Erros possíveis:** `409` e-mail já cadastrado · `422` dados inválidos

**Entrada:**

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "Senha@123"
}
```

**Saída (201):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "role": "CUSTOMER",
      "createdAt": "2026-06-26T12:00:00.000Z"
    },
    "accessToken": "jwt.token.aqui",
    "refreshToken": "jwt.token.aqui"
  }
}
```

---

### `POST /api/v1/auth/login`

**O que faz:** Autentica o usuário com e-mail e senha e retorna os tokens.
**Autenticação:** Nenhuma
**Erros possíveis:** `401` e-mail ou senha inválidos · `422` dados inválidos

**Entrada:**

```json
{
  "email": "joao@email.com",
  "password": "Senha@123"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "role": "CUSTOMER"
    },
    "accessToken": "jwt.token.aqui",
    "refreshToken": "jwt.token.aqui"
  }
}
```

---

### `POST /api/v1/auth/refresh`

**O que faz:** Troca um refresh token válido por um novo par de tokens (rotação).
**Autenticação:** Nenhuma (usa o refresh token no corpo)
**Erros possíveis:** `401` token inválido ou expirado · `422` dados inválidos

**Entrada:**

```json
{
  "refreshToken": "jwt.token.aqui"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "accessToken": "novo.jwt.token",
    "refreshToken": "novo.jwt.token"
  }
}
```

---

### `POST /api/v1/auth/logout`

**O que faz:** Invalida o refresh token, encerrando a sessão.
**Autenticação:** Nenhuma (usa o refresh token no corpo)
**Erros possíveis:** `422` dados inválidos

**Entrada:**

```json
{
  "refreshToken": "jwt.token.aqui"
}
```

**Saída (204):** Sem corpo de resposta.

---

### `POST /api/v1/auth/forgot-password`

**O que faz:** Gera um token de redefinição de senha (em produção, envia por e-mail).
**Autenticação:** Nenhuma
**Erros possíveis:** `422` e-mail inválido

> Sempre retorna sucesso, mesmo se o e-mail não existir (proteção contra enumeração de contas).

**Entrada:**

```json
{
  "email": "joao@email.com"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "message": "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
  "debug_token": "apenas-em-desenvolvimento"
}
```

---

### `POST /api/v1/auth/reset-password`

**O que faz:** Define uma nova senha usando o token recebido por e-mail.
**Autenticação:** Nenhuma
**Erros possíveis:** `400` token inválido, já usado ou expirado · `422` dados inválidos

**Entrada:**

```json
{
  "token": "token-recebido-por-email",
  "password": "NovaSenha@123"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "message": "Senha alterada com sucesso"
}
```

---

## 👤 Sprint 2 — Usuários

### `GET /api/v1/users/me` 🔒

**O que faz:** Retorna o perfil completo do usuário logado, incluindo endereços.
**Erros possíveis:** `401` não autenticado

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "CUSTOMER",
    "createdAt": "2026-06-26T12:00:00.000Z",
    "addresses": []
  }
}
```

---

### `PUT /api/v1/users/me` 🔒

**O que faz:** Atualiza o nome do usuário logado.
**Erros possíveis:** `401` não autenticado · `422` dados inválidos

**Entrada:**

```json
{
  "name": "João Silva Santos"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "João Silva Santos",
    "email": "joao@email.com",
    "role": "CUSTOMER"
  }
}
```

---

### `PUT /api/v1/users/me/password` 🔒

**O que faz:** Troca a senha do usuário logado, exigindo a senha atual.
**Erros possíveis:** `400` senha atual incorreta · `401` não autenticado · `422` senhas não coincidem ou são fracas

**Entrada:**

```json
{
  "currentPassword": "Senha@123",
  "newPassword": "NovaSenha@456",
  "confirmPassword": "NovaSenha@456"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "message": "Senha alterada com sucesso"
}
```

---

### `GET /api/v1/users/me/addresses` 🔒

**O que faz:** Lista todos os endereços cadastrados pelo usuário.
**Erros possíveis:** `401` não autenticado

**Saída (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "label": "Casa",
      "street": "Rua das Flores",
      "number": "123",
      "complement": null,
      "district": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01310-100",
      "isDefault": true
    }
  ]
}
```

---

### `POST /api/v1/users/me/addresses` 🔒

**O que faz:** Adiciona um novo endereço ao usuário.
**Erros possíveis:** `401` não autenticado · `422` dados inválidos (ex: CEP fora do padrão)

**Entrada:**

```json
{
  "label": "Casa",
  "street": "Rua das Flores",
  "number": "123",
  "complement": "Apto 45",
  "district": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01310-100",
  "isDefault": true
}
```

**Saída (201):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "label": "Casa",
    "street": "Rua das Flores",
    "number": "123",
    "isDefault": true
  }
}
```

---

### `PUT /api/v1/users/me/addresses/:id` 🔒

**O que faz:** Atualiza um endereço existente do usuário.
**Erros possíveis:** `401` não autenticado · `404` endereço não encontrado · `422` dados inválidos

**Entrada:**

```json
{
  "street": "Rua das Palmeiras",
  "number": "456"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "street": "Rua das Palmeiras",
    "number": "456"
  }
}
```

---

### `DELETE /api/v1/users/me/addresses/:id` 🔒

**O que faz:** Remove um endereço do usuário.
**Erros possíveis:** `401` não autenticado · `404` endereço não encontrado

**Saída (204):** Sem corpo de resposta.

---

### `GET /api/v1/users` 🔒👑

**O que faz:** Lista todos os usuários do sistema, com paginação.
**Erros possíveis:** `401` não autenticado · `403` não é admin

**Entrada (query params):**

```json
{ "page": 1, "limit": 20 }
```

**Saída (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "email": "joao@email.com",
      "role": "CUSTOMER",
      "isActive": true,
      "createdAt": "2026-06-26T12:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### `GET /api/v1/users/:id` 🔒👑

**O que faz:** Retorna os detalhes de um usuário específico.
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` usuário não encontrado

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "CUSTOMER",
    "isActive": true,
    "createdAt": "2026-06-26T12:00:00.000Z"
  }
}
```

---

### `PATCH /api/v1/users/:id/status` 🔒👑

**O que faz:** Ativa ou desativa a conta de um usuário (toggle).
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` usuário não encontrado

**Saída (200):**

```json
{
  "status": "success",
  "data": { "id": "uuid", "isActive": false }
}
```

---

## 🗂 Sprint 3 — Categorias

### `GET /api/v1/categories`

**O que faz:** Lista a árvore completa de categorias ativas (pai → filho → neto).
**Erros possíveis:** Nenhum específico

**Saída (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Eletrônicos",
      "slug": "eletronicos",
      "children": [
        {
          "id": "uuid",
          "name": "Smartphones",
          "slug": "smartphones",
          "children": []
        }
      ]
    }
  ]
}
```

---

### `GET /api/v1/categories/:slug`

**O que faz:** Detalha uma categoria, incluindo suas subcategorias diretas.
**Erros possíveis:** `404` categoria não encontrada

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Smartphones",
    "slug": "smartphones",
    "parent": { "id": "uuid", "name": "Eletrônicos", "slug": "eletronicos" },
    "children": []
  }
}
```

---

### `POST /api/v1/admin/categories` 🔒👑

**O que faz:** Cria uma nova categoria (slug gerado automaticamente).
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` categoria pai não encontrada · `422` dados inválidos

**Entrada:**

```json
{
  "name": "Eletrônicos",
  "description": "Produtos eletrônicos em geral",
  "parentId": null,
  "sortOrder": 1
}
```

**Saída (201):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Eletrônicos",
    "slug": "eletronicos",
    "isActive": true
  }
}
```

---

### `PUT /api/v1/admin/categories/:id` 🔒👑

**O que faz:** Atualiza uma categoria existente.
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` categoria não encontrada · `409` categoria não pode ser pai de si mesma · `422` dados inválidos

**Entrada:**

```json
{
  "name": "Eletrônicos e Tecnologia"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Eletrônicos e Tecnologia",
    "slug": "eletronicos-e-tecnologia"
  }
}
```

---

### `DELETE /api/v1/admin/categories/:id` 🔒👑

**O que faz:** Remove (desativa) uma categoria que não tenha subcategorias.
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` categoria não encontrada · `409` categoria possui subcategorias

**Saída (204):** Sem corpo de resposta.

---

## 📦 Sprint 3 — Produtos

### `GET /api/v1/products`

**O que faz:** Lista produtos ativos com busca, filtros e paginação.
**Erros possíveis:** `422` filtros inválidos (ex: minPrice maior que maxPrice)

**Entrada (query params):**

```json
{
  "page": 1,
  "limit": 20,
  "search": "fone",
  "categorySlug": "eletronicos",
  "minPrice": 100,
  "maxPrice": 500,
  "brand": "AudioBrand",
  "inStock": true,
  "isFeatured": false,
  "sortBy": "basePrice",
  "sortOrder": "asc"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Fone Bluetooth X",
      "slug": "fone-bluetooth-x",
      "basePrice": 299.9,
      "discountPrice": 249.9,
      "brand": "AudioBrand",
      "avgRating": 4.5,
      "reviewCount": 12,
      "images": [{ "url": "http://localhost:3000/uploads/products/foto.webp" }],
      "categories": [{ "category": { "name": "Eletrônicos", "slug": "eletronicos" } }],
      "variants": [{ "id": "uuid", "name": "Preto", "price": null, "stock": 30 }]
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### `GET /api/v1/products/:slug`

**O que faz:** Detalha um produto com imagens, variantes e atributos.
**Erros possíveis:** `404` produto não encontrado

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Fone Bluetooth X",
    "slug": "fone-bluetooth-x",
    "description": "Fone sem fio com cancelamento de ruído",
    "basePrice": 299.9,
    "discountPrice": 249.9,
    "images": [{ "url": "...", "isCover": true }],
    "variants": [{ "id": "uuid", "name": "Preto", "stock": 30, "sku": "FONE-X-BLK" }],
    "attributes": [{ "name": "Conectividade", "value": "Bluetooth 5.0" }],
    "categories": [{ "category": { "name": "Eletrônicos", "slug": "eletronicos" } }]
  }
}
```

---

### `POST /api/v1/admin/products` 🔒👑

**O que faz:** Cria um novo produto (slug gerado automaticamente).
**Erros possíveis:** `401` não autenticado · `403` não é admin · `409` SKU já cadastrado · `422` dados inválidos

**Entrada:**

```json
{
  "name": "Fone Bluetooth X",
  "description": "Fone sem fio com cancelamento de ruído",
  "basePrice": 299.9,
  "discountPrice": 249.9,
  "sku": "FONE-X-001",
  "brand": "AudioBrand",
  "categoryIds": ["uuid-categoria"],
  "isFeatured": true,
  "attributes": [{ "name": "Conectividade", "value": "Bluetooth 5.0" }]
}
```

**Saída (201):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Fone Bluetooth X",
    "slug": "fone-bluetooth-x",
    "isActive": false
  }
}
```

---

### `PUT /api/v1/admin/products/:id` 🔒👑

**O que faz:** Atualiza dados, categorias e/ou atributos de um produto.
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` produto não encontrado · `422` dados inválidos

**Entrada:**

```json
{
  "basePrice": 279.9,
  "categoryIds": ["uuid-categoria-1", "uuid-categoria-2"]
}
```

**Saída (200):**

```json
{
  "status": "success",
  "data": { "id": "uuid", "basePrice": 279.9 }
}
```

---

### `DELETE /api/v1/admin/products/:id` 🔒👑

**O que faz:** Remove um produto (soft delete — fica oculto, mas não é apagado do banco).
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` produto não encontrado

**Saída (204):** Sem corpo de resposta.

---

### `PATCH /api/v1/admin/products/:id/status` 🔒👑

**O que faz:** Publica ou despublica um produto (toggle de `isActive`).
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` produto não encontrado

**Saída (200):**

```json
{
  "status": "success",
  "data": { "id": "uuid", "isActive": true }
}
```

---

### `POST /api/v1/admin/products/:id/images` 🔒👑

**O que faz:** Envia uma imagem para o produto (a primeira enviada vira capa automaticamente).
**Autenticação:** Bearer Token (admin) — envio via `multipart/form-data`, campo `image`
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` produto não encontrado · `400` limite de 10 imagens atingido · `415` tipo de arquivo não permitido

**Entrada:** `multipart/form-data` com o campo `image` (arquivo `.jpg`, `.png` ou `.webp`, até 5MB)

**Saída (201):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "url": "http://localhost:3000/uploads/products/foto.webp",
    "isCover": true,
    "sortOrder": 0
  }
}
```

---

### `DELETE /api/v1/admin/products/:id/images/:imgId` 🔒👑

**O que faz:** Remove uma imagem do produto. Se era a capa, promove a próxima automaticamente.
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` imagem não encontrada

**Saída (204):** Sem corpo de resposta.

---

### `PATCH /api/v1/admin/products/:id/images/:imgId/cover` 🔒👑

**O que faz:** Define uma imagem específica como capa do produto.
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` imagem não encontrada

**Saída (200):**

```json
{
  "status": "success",
  "message": "Imagem de capa atualizada"
}
```

---

### `POST /api/v1/admin/products/:id/variants` 🔒👑

**O que faz:** Adiciona uma nova variante (ex: cor/tamanho) ao produto, com estoque inicial.
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` produto não encontrado · `409` SKU já em uso · `422` dados inválidos

**Entrada:**

```json
{
  "name": "Preto / 128GB",
  "sku": "FONE-X-BLK",
  "price": null,
  "stock": 30,
  "stockMin": 5,
  "weight": 0.2,
  "attributes": { "Cor": "Preto" }
}
```

**Saída (201):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "Preto / 128GB",
    "sku": "FONE-X-BLK",
    "stock": 30
  }
}
```

---

### `PUT /api/v1/admin/products/:id/variants/:vid` 🔒👑

**O que faz:** Atualiza dados de uma variante (nome, preço, peso etc).
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` variante não encontrada · `409` novo SKU já em uso · `422` dados inválidos

**Entrada:**

```json
{
  "price": 279.9
}
```

**Saída (200):**

```json
{
  "status": "success",
  "data": { "id": "uuid", "price": 279.9 }
}
```

---

### `PATCH /api/v1/admin/products/:id/variants/:vid/stock` 🔒👑

**O que faz:** Ajusta o estoque da variante (entrada, saída ou ajuste manual) e registra o histórico.
**Erros possíveis:** `401` não autenticado · `403` não é admin · `404` variante não encontrada · `400` estoque insuficiente para saída · `422` dados inválidos

**Entrada:**

```json
{
  "type": "IN",
  "quantity": 50,
  "reason": "Reposição de estoque"
}
```

**Saída (200):**

```json
{
  "status": "success",
  "data": { "id": "uuid", "stock": 80 }
}
```

---

## 🛒 Sprint 4 — Carrinho

> Funciona para **anônimos** (header `x-cart-session: {sessionId}`) e **autenticados** (Bearer Token). Algumas rotas exigem login.

### `GET /api/v1/cart`

**O que faz:** Retorna o carrinho atual (anônimo ou autenticado) com totais calculados.
**Erros possíveis:** Nenhum específico (retorna carrinho vazio se não existir)

**Entrada (header):**

```json
{ "x-cart-session": "minha-sessao-uuid" }
```

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "uuid",
        "variantId": "uuid",
        "quantity": 2,
        "unitPrice": 150.0,
        "subtotal": 300.0,
        "variant": { "name": "Padrão", "stock": 8 }
      }
    ],
    "coupon": null,
    "totals": {
      "subtotal": 300.0,
      "discount": 0,
      "shipping": 0,
      "total": 300.0,
      "freeShipping": false
    },
    "itemCount": 2
  }
}
```

---

### `POST /api/v1/cart/items`

**O que faz:** Adiciona um item (variante + quantidade) ao carrinho.
**Erros possíveis:** `400` estoque insuficiente · `404` variante não encontrada · `422` dados inválidos

**Entrada:**

```json
{
  "variantId": "uuid-da-variante",
  "quantity": 2
}
```

**Saída (201):** mesmo formato do `GET /api/v1/cart`

---

### `PUT /api/v1/cart/items/:itemId`

**O que faz:** Atualiza a quantidade de um item. `quantity: 0` remove o item.
**Erros possíveis:** `400` estoque insuficiente · `404` item não encontrado no carrinho · `422` dados inválidos

**Entrada:**

```json
{ "quantity": 5 }
```

**Saída (200):** mesmo formato do `GET /api/v1/cart`

---

### `DELETE /api/v1/cart/items/:itemId`

**O que faz:** Remove um item específico do carrinho.
**Erros possíveis:** `404` item não encontrado no carrinho

**Saída (200):** mesmo formato do `GET /api/v1/cart`

---

### `DELETE /api/v1/cart`

**O que faz:** Esvazia o carrinho por completo (itens e cupom).
**Erros possíveis:** Nenhum específico

**Saída (204):** Sem corpo de resposta.

---

### `POST /api/v1/cart/shipping`

**O que faz:** Calcula opções de frete (prazo e valor) para um CEP, com base no peso do carrinho.
**Erros possíveis:** `422` CEP inválido

**Entrada:**

```json
{ "zipCode": "01310-100" }
```

**Saída (200):**

```json
{
  "status": "success",
  "data": [
    { "code": "STANDARD", "name": "Entrega Padrão (PAC)", "price": 18.5, "estimatedDays": 5 },
    { "code": "EXPRESS", "name": "Entrega Expressa (SEDEX)", "price": 33.3, "estimatedDays": 2 }
  ]
}
```

---

### `POST /api/v1/cart/merge` 🔒

**O que faz:** Mescla o carrinho anônimo (por sessionId) com o carrinho do usuário recém-autenticado.
**Erros possíveis:** `401` não autenticado · `422` dados inválidos

**Entrada:**

```json
{ "sessionId": "minha-sessao-uuid" }
```

**Saída (200):** mesmo formato do `GET /api/v1/cart`

---

### `POST /api/v1/cart/coupon` 🔒

**O que faz:** Aplica um cupom de desconto ao carrinho do usuário.
**Erros possíveis:** `400` carrinho vazio, cupom expirado ou valor mínimo não atingido · `401` não autenticado · `404` cupom não encontrado · `422` dados inválidos

**Entrada:**

```json
{ "code": "BEMVINDO10" }
```

**Saída (200):**

```json
{
  "status": "success",
  "data": {
    "items": [],
    "coupon": { "code": "BEMVINDO10", "discountType": "PERCENTAGE", "discountAmount": 30.0 },
    "totals": {
      "subtotal": 300.0,
      "discount": 30.0,
      "shipping": 0,
      "total": 270.0,
      "freeShipping": false
    }
  }
}
```

---

### `DELETE /api/v1/cart/coupon` 🔒

**O que faz:** Remove o cupom aplicado ao carrinho.
**Erros possíveis:** `401` não autenticado

**Saída (200):** mesmo formato do `GET /api/v1/cart`, com `"coupon": null`

---

## ❤️ Sprint 4 — Wishlist

### `GET /api/v1/wishlist` 🔒

**O que faz:** Lista os produtos favoritados pelo usuário, com paginação.
**Erros possíveis:** `401` não autenticado

**Entrada (query params):**

```json
{ "page": 1, "limit": 20 }
```

**Saída (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Fone Bluetooth X",
      "slug": "fone-bluetooth-x",
      "basePrice": 299.9,
      "avgRating": 4.5,
      "inStock": true,
      "addedAt": "2026-06-26T12:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### `POST /api/v1/wishlist/:productId` 🔒

**O que faz:** Adiciona um produto à lista de favoritos.
**Erros possíveis:** `401` não autenticado · `404` produto não encontrado · `409` produto já está na wishlist

**Saída (201):**

```json
{
  "status": "success",
  "data": { "productId": "uuid", "message": "Adicionado aos favoritos" }
}
```

---

### `DELETE /api/v1/wishlist/:productId` 🔒

**O que faz:** Remove um produto da lista de favoritos.
**Erros possíveis:** `401` não autenticado · `404` produto não está na wishlist

**Saída (204):** Sem corpo de resposta.

---

## ⭐ Sprint 4 — Avaliações

### `GET /api/v1/products/:slug/reviews`

**O que faz:** Lista as avaliações de um produto, com estatísticas de distribuição de notas.
**Erros possíveis:** `404` produto não encontrado

**Entrada (query params):**

```json
{ "page": 1, "limit": 10 }
```

**Saída (200):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "title": "Excelente!",
      "body": "Produto incrível, recomendo.",
      "isVerified": true,
      "helpfulCount": 3,
      "user": { "name": "João Silva" },
      "createdAt": "2026-06-26T12:00:00.000Z"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 },
  "stats": {
    "avgRating": 5,
    "reviewCount": 1,
    "distribution": { "5": 1 }
  }
}
```

---

### `POST /api/v1/products/:slug/reviews` 🔒

**O que faz:** Cria uma avaliação (1 a 5 estrelas) para o produto. Detecta automaticamente se foi compra verificada.
**Erros possíveis:** `401` não autenticado · `404` produto não encontrado · `409` usuário já avaliou este produto · `422` dados inválidos

**Entrada:**

```json
{
  "rating": 5,
  "title": "Excelente!",
  "body": "Produto incrível, recomendo."
}
```

**Saída (201):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "rating": 5,
    "title": "Excelente!",
    "isVerified": false,
    "user": { "name": "João Silva" }
  }
}
```

---

### `PUT /api/v1/reviews/:id` 🔒

**O que faz:** Edita uma avaliação criada pelo próprio usuário.
**Erros possíveis:** `401` não autenticado · `404` avaliação não encontrada (ou não pertence ao usuário) · `422` dados inválidos

**Entrada:**

```json
{ "rating": 4, "body": "Atualizando minha opinião após uso prolongado." }
```

**Saída (200):**

```json
{
  "status": "success",
  "data": { "id": "uuid", "rating": 4 }
}
```

---

### `DELETE /api/v1/reviews/:id` 🔒

**O que faz:** Remove uma avaliação do próprio usuário.
**Erros possíveis:** `401` não autenticado · `404` avaliação não encontrada (ou não pertence ao usuário)

**Saída (204):** Sem corpo de resposta.

---

### `POST /api/v1/reviews/:id/helpful` 🔒

**O que faz:** Marca (ou desmarca, se já marcado) uma avaliação de outro usuário como "útil".
**Erros possíveis:** `400` usuário tentando marcar a própria avaliação · `401` não autenticado · `404` avaliação não encontrada

**Saída (200):**

```json
{
  "status": "success",
  "data": { "helpful": true }
}
```

---

## 📊 Resumo por Sprint

| Sprint    | Módulo       | Rotas  |
| --------- | ------------ | ------ |
| 1         | Sistema      | 1      |
| 2         | Autenticação | 6      |
| 2         | Usuários     | 10     |
| 3         | Categorias   | 5      |
| 3         | Produtos     | 12     |
| 4         | Carrinho     | 9      |
| 4         | Wishlist     | 3      |
| 4         | Avaliações   | 5      |
| **Total** |              | **51** |
