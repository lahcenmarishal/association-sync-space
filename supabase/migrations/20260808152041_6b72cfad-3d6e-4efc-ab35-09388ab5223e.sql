CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.generer_salaires_permanents_auto()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_periode text := to_char(current_date, 'YYYY-MM');
  v_cat uuid;
  v_dep uuid;
  v_count int := 0;
  w record;
BEGIN
  SELECT id INTO v_cat FROM public.categories
    WHERE type = 'depense' AND nom IN ('المستخدمين','Salaires') LIMIT 1;

  FOR w IN
    SELECT t.* FROM public.travailleurs t
    WHERE t.statut = 'actif' AND t.type_contrat = 'permanent' AND t.salaire > 0
      AND NOT EXISTS (SELECT 1 FROM public.salaires s WHERE s.travailleur_id = t.id AND s.periode = v_periode)
  LOOP
    INSERT INTO public.depenses (date, categorie_id, fournisseur, montant, moyen_paiement, description)
    VALUES (current_date, v_cat, w.nom_complet, w.salaire, 'especes',
            'أجرة ' || v_periode || ' — ' || w.fonction)
    RETURNING id INTO v_dep;

    INSERT INTO public.salaires (travailleur_id, periode, montant, date_paiement, mode, depense_id)
    VALUES (w.id, v_periode, w.salaire, current_date, 'auto', v_dep);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END; $function$;

REVOKE ALL ON FUNCTION public.generer_salaires_permanents_auto() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generer_salaires_permanents_auto() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'salaires-permanents-mensuel') THEN
    PERFORM cron.unschedule('salaires-permanents-mensuel');
  END IF;
  PERFORM cron.schedule('salaires-permanents-mensuel', '0 3 27-31 * *',
    $cron$SELECT public.generer_salaires_permanents_auto();$cron$);
END $$;