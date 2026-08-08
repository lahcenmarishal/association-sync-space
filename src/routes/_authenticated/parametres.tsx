import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useParametres } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Gestion d'association" },
      {
        name: "description",
        content:
          "Configurez le nom de l'association et la devise utilisée dans toute l'application.",
      },
      { property: "og:title", content: "Paramètres — Gestion d'association" },
      { property: "og:description", content: "Configuration générale de l'application." },
    ],
  }),
  component: ParametresPage,
});

function ParametresPage() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const { data: params } = useParametres();
  const qc = useQueryClient();
  const [nom, setNom] = useState("");
  const [devise, setDevise] = useState("DH");

  useEffect(() => {
    if (params) {
      setNom((params as { nom_association?: string }).nom_association ?? "");
      setDevise((params as { devise?: string }).devise ?? "DH");
    }
  }, [params]);

  const save = useMutation({
    mutationFn: async () => {
      const id = (params as { id?: string } | null)?.id;
      const values = { nom_association: nom.trim().slice(0, 150), devise: devise.trim().slice(0, 10) };
      const { error } = id
        ? await supabase.from("parametres").update(values as never).eq("id", id)
        : await supabase.from("parametres").insert(values as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parametres"] });
      toast.success(t("Paramètres enregistrés"));
    },
    onError: (e: Error) => toast.error(e.message || t("Enregistrement impossible")),
  });

  if (!isAdmin) {
    return (
      <AppShell title="Paramètres" description="Accès réservé">
        <div className="surface p-8 text-center text-sm text-muted-foreground">
          {t("Seul un administrateur peut modifier les paramètres.")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Paramètres" description="Configuration générale de l'application">
      <div className="surface mb-4 max-w-xl space-y-2 p-5">
        <Label>{t("Langue de l'interface")}</Label>
        <div>
          <LanguageSwitcher />
        </div>
      </div>
      <div className="surface max-w-xl space-y-4 p-5">
        <div>
          <Label>{t("Nom de l'association")}</Label>
          <Input value={nom} maxLength={150} onChange={(e) => setNom(e.target.value)} />
        </div>
        <div>
          <Label>{t("Devise")}</Label>
          <Input value={devise} maxLength={10} onChange={(e) => setDevise(e.target.value)} />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {t("Enregistrer")}
        </Button>
      </div>
    </AppShell>
  );
}
