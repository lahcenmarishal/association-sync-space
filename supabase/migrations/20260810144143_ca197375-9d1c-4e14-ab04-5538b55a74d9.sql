ALTER TABLE public.recettes ADD COLUMN IF NOT EXISTS numero_facture text NOT NULL DEFAULT '';
ALTER TABLE public.depenses ADD COLUMN IF NOT EXISTS numero_cheque text NOT NULL DEFAULT '';