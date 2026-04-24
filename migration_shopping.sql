-- Lista de compras (uma ativa por sessão anônima)
CREATE TABLE shopping_lists (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX ON shopping_lists(session_id);

-- Itens da lista
CREATE TABLE shopping_list_items (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shopping_list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity         integer DEFAULT 1 NOT NULL,
  added_at         timestamptz DEFAULT now(),
  UNIQUE(shopping_list_id, product_id)
);

-- Compra registrada em outro supermercado
CREATE TABLE purchases (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    text NOT NULL,
  store_name    text NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX ON purchases(session_id);

-- Itens da compra com preço real pago e preço Argus no momento
CREATE TABLE purchase_items (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id     uuid REFERENCES purchases(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name    text NOT NULL,
  quantity        integer DEFAULT 1 NOT NULL,
  unit_price_paid numeric(10,2) NOT NULL,
  argus_price     numeric(10,2),
  added_at        timestamptz DEFAULT now()
);
