import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Coins, Download } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTravailleurs,
  useSalaires,
  useSaveRow,
  useDeleteRow,
  useParametres,
  type Travailleur,
} from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatMontant, todayISO } from "@/lib/format";
import {
  TYPES_CONTRAT,
  TYPE_CONTRAT_LABELS,
  STATUTS_TRAVAILLEUR,
  STATUT_TRAVAILLEUR_LABELS,
} from "@/lib/constants";
import { telechargerFichePdf, telechargerFichesPdf } from "@/lib/workers-pdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/travailleurs")({
  head: () => ({
    meta: [
      { title: "Travailleurs et salaires — Association Eddahab" },
      {
        name: "description",
        content:
          "Gestion des travailleurs de l'association : fiches complètes, coordonnées bancaires, contrats et paiement automatique des salaires.",
      },
      { property: "og:title", content: "Travailleurs et salaires — Association Eddahab" },
      {
        property: "og:description",
        content: "Fiches travailleurs, RIB, contrats et suivi des salaires mensuels.",
      },
    ],
  }),
  component: TravailleursPage,
});

const empty = {
  nom_complet: "",
  cin: "",
  telephone: "",
  adresse: "",
  fonction: "",
  banque: "",
  rib: "",
  salaire: "",
  type_contrat: "permanent",
  date_embauche: todayISO(),
  statut: "actif",
  observations: "",
};

function TravailleursPage() {
  const { t } = useI18n();
  const { isAdmin, canManageFinance } = useAuth();
  const qc = useQueryClient();
  const { data: travailleurs = [], isLoading } = useTravailleurs();
  const { data: salaires = [] } = useSalaires();
  const { data: params } = useParametres();
  const devise = params?.devise ?? "DH";
  const save = useSaveRow("travailleurs", ["salaires"]);
  const remove = useDeleteRow("travailleurs", ["salaires"]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Travailleur | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [payer, setPayer] = useState<Travailleur | null>(null);
  const [paiement, setPaiement] = useState({ montant: "", date: todayISO() });

  const periode = todayISO().slice(0, 7);
  const paye = (id: string) => salaires.some((s) => s.travailleur_id === id && s.periode === periode);

  const totaux = useMemo(() => {
    const actifs = travailleurs.filter((w) => w.statut === "actif");
    return {
      actifs: actifs.length,
      permanents: actifs.filter((w) => w.type_contrat === "permanent").length,
      masse: actifs
        .filter((w) => w.type_contrat === "permanent")
        .reduce((sum, w) => sum + Number(w.salaire), 0),
    };
  }, [travailleurs]);

  // Paiement automatique des permanents à partir du 27 du mois
  const lancerPaie = async (silencieux = false) => {
    const { data, error } = await supabase.rpc("generer_salaires_permanents");
    if (error) {
      if (!silencieux) toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["salaires"] });
    qc.invalidateQueries({ queryKey: ["depenses"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    const n = Number(data ?? 0);
    if (n > 0) toast.success(`${n} ${t("salaire(s) permanent(s) payé(s) automatiquement")}`);
    else if (!silencieux) toast.info(t("Aucun salaire à payer pour ce mois."));
  };

  useEffect(() => {
    if (!canManageFinance) return;
    if (new Date().getDate() < 27) return;
    void lancerPaie(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageFinance]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (w: Travailleur) => {
    setEditing(w);
    setForm({
      nom_complet: w.nom_complet,
      cin: w.cin,
      telephone: w.telephone ?? "",
      adresse: w.adresse ?? "",
      fonction: w.fonction,
      banque: w.banque ?? "",
      rib: w.rib ?? "",
      salaire: String(w.salaire),
      type_contrat: w.type_contrat,
      date_embauche: w.date_embauche,
      statut: w.statut,
      observations: w.observations ?? "",
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const salaire = Number(form.salaire);
    if (!form.nom_complet.trim() || !form.cin.trim() || !form.fonction.trim()) {
      toast.error(t("Nom, CIN et fonction sont obligatoires"));
      return;
    }
    if (!Number.isFinite(salaire) || salaire < 0) {
      toast.error(t("Salaire invalide"));
      return;
    }
    await save.mutateAsync({
      id: editing?.id,
      values: {
        nom_complet: form.nom_complet.trim().slice(0, 200),
        cin: form.cin.trim().slice(0, 30),
        telephone: form.telephone.trim().slice(0, 30) || null,
        adresse: form.adresse.trim().slice(0, 300) || null,
        fonction: form.fonction.trim().slice(0, 120),
        banque: form.banque.trim().slice(0, 120) || null,
        rib: form.rib.trim().slice(0, 40) || null,
        salaire,
        type_contrat: form.type_contrat,
        date_embauche: form.date_embauche,
        statut: form.statut,
        observations: form.observations.trim().slice(0, 1000) || null,
      },
    });
    setOpen(false);
  };

  const payerOccasionnel = async () => {
    if (!payer) return;
    const montant = Number(paiement.montant);
    if (!Number.isFinite(montant) || montant <= 0) {
      toast.error(t("Montant invalide"));
      return;
    }
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("type", "depense")
      .in("nom", ["المستخدمين", "Salaires"])
      .limit(1)
      .maybeSingle();

    const { data: dep, error: depErr } = await supabase
      .from("depenses")
      .insert({
        date: paiement.date,
        categorie_id: (cat as { id: string } | null)?.id ?? null,
        fournisseur: payer.nom_complet,
        montant,
        moyen_paiement: "especes",
        description: `أجرة ${paiement.date.slice(0, 7)} — ${payer.fonction}`,
      } as never)
      .select("id")
      .single();
    if (depErr) {
      toast.error(depErr.message);
      return;
    }
    const { error } = await supabase.from("salaires").insert({
      travailleur_id: payer.id,
      periode: paiement.date.slice(0, 7),
      montant,
      date_paiement: paiement.date,
      mode: "manuel",
      depense_id: (dep as { id: string }).id,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["salaires"] });
    qc.invalidateQueries({ queryKey: ["depenses"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
    toast.success(t("Paiement enregistré"));
    setPayer(null);
  };

  const telechargerToutes = (liste: Travailleur[]) =>
    telechargerFichesPdf(
      liste,
      params?.nom_association ?? "جمعية الذهاب للماء الصالح للشرب والتنمية والتعاون",
      devise,
    );

  return (
    <AppShell
      title="Travailleurs"
      description={`${totaux.actifs} ${t("actif(s)")} · ${t("Masse salariale mensuelle")} ${formatMontant(totaux.masse, devise)}`}
      actions={
        isAdmin ? (
          <Button onClick={openNew}>
            <Plus className="size-4" /> {t("Nouveau travailleur")}
          </Button>
        ) : null
      }
    >
      <div className="surface mb-4 flex flex-wrap gap-2 p-4">
        <Button variant="outline" onClick={() => telechargerToutes(travailleurs)}>
          <Download className="size-4" /> {t("Ordre de virement des salaires (PDF)")}
        </Button>
        {canManageFinance && (
          <Button variant="outline" onClick={() => lancerPaie(false)}>
            <Coins className="size-4" /> {t("Payer les permanents (le 27)")}
          </Button>
        )}
        <p className="ml-auto self-center text-xs text-muted-foreground">
          {t("Les permanents sont payés automatiquement le 27 de chaque mois, avec déduction du solde.")}
        </p>
      </div>

      <div className="surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Nom")}</TableHead>
              <TableHead>{t("CIN")}</TableHead>
              <TableHead>{t("Téléphone")}</TableHead>
              <TableHead>{t("Fonction")}</TableHead>
              <TableHead>{t("Banque / RIB")}</TableHead>
              <TableHead className="text-right">{t("Salaire")}</TableHead>
              <TableHead>{t("Contrat")}</TableHead>
              <TableHead>{t("Embauche")}</TableHead>
              <TableHead>{t("Statut")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  {t("Chargement…")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && travailleurs.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  {t("Aucun travailleur enregistré.")}
                </TableCell>
              </TableRow>
            )}
            {travailleurs.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.nom_complet}</TableCell>
                <TableCell>{w.cin}</TableCell>
                <TableCell>{w.telephone ?? "—"}</TableCell>
                <TableCell>{w.fonction}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">
                  {w.banque ?? "—"}
                  {w.rib ? ` · ${w.rib}` : ""}
                </TableCell>
                <TableCell className="text-right">{formatMontant(w.salaire, devise)}</TableCell>
                <TableCell>
                  <Badge variant={w.type_contrat === "permanent" ? "default" : "secondary"}>
                    {t(TYPE_CONTRAT_LABELS[w.type_contrat] ?? w.type_contrat)}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(w.date_embauche)}</TableCell>
                <TableCell>
                  <Badge variant={w.statut === "actif" ? "default" : "secondary"}>
                    {t(STATUT_TRAVAILLEUR_LABELS[w.statut] ?? w.statut)}
                    {paye(w.id) ? ` · ${t("payé")}` : ""}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("Télécharger la fiche PDF")}
                      onClick={async () => {
                        const id = toast.loading(t("Génération de la fiche…"));
                        try {
                          await telechargerFichePdf(
                            w,
                            params?.nom_association ??
                              "جمعية الذهاب للماء الصالح للشرب والتنمية والتعاون",
                            devise,
                          );
                          toast.success(t("Fiche téléchargée"), { id });
                        } catch {
                          toast.error(t("Génération impossible"), { id });
                        }
                      }}
                    >
                      <Download className="size-4 text-primary" />
                    </Button>
                    {canManageFinance && w.type_contrat === "occasionnel" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setPayer(w);
                          setPaiement({ montant: String(w.salaire), date: todayISO() });
                        }}
                      >
                        <Coins className="size-4 text-primary" />
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(w.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("Modifier le travailleur") : t("Nouveau travailleur")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("Nom complet")}</Label>
                <Input
                  value={form.nom_complet}
                  onChange={(e) => setForm({ ...form, nom_complet: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t("CIN")}</Label>
                <Input
                  value={form.cin}
                  onChange={(e) => setForm({ ...form, cin: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t("Téléphone")}</Label>
                <Input
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("Fonction")}</Label>
                <Input
                  value={form.fonction}
                  onChange={(e) => setForm({ ...form, fonction: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>{t("Adresse")}</Label>
              <Input
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("Banque")}</Label>
                <Input
                  value={form.banque}
                  onChange={(e) => setForm({ ...form, banque: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("RIB")}</Label>
                <Input
                  value={form.rib}
                  onChange={(e) => setForm({ ...form, rib: e.target.value })}
                />
              </div>
              <div>
                <Label>
                  {t("Salaire")} ({devise})
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.salaire}
                  onChange={(e) => setForm({ ...form, salaire: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t("Type de contrat")}</Label>
                <Select
                  value={form.type_contrat}
                  onValueChange={(v) => setForm({ ...form, type_contrat: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_CONTRAT.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(TYPE_CONTRAT_LABELS[c]!)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("Date d'embauche")}</Label>
                <Input
                  type="date"
                  value={form.date_embauche}
                  onChange={(e) => setForm({ ...form, date_embauche: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t("Statut")}</Label>
                <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS_TRAVAILLEUR.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(STATUT_TRAVAILLEUR_LABELS[s]!)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("Observations")}</Label>
              <Textarea
                value={form.observations}
                maxLength={1000}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Annuler")}
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {t("Enregistrer")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payer} onOpenChange={(o) => !o && setPayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("Paiement occasionnel")} — {payer?.nom_complet}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>
                {t("Montant")} ({devise})
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={paiement.montant}
                onChange={(e) => setPaiement({ ...paiement, montant: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("Date de paiement")}</Label>
              <Input
                type="date"
                value={paiement.date}
                onChange={(e) => setPaiement({ ...paiement, date: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Une dépense sera créée automatiquement et déduite du solde.")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayer(null)}>
              {t("Annuler")}
            </Button>
            <Button onClick={payerOccasionnel}>{t("Payer")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Supprimer ce travailleur ?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Cette action est définitive.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Annuler")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) remove.mutate(toDelete);
                setToDelete(null);
              }}
            >
              {t("Supprimer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
