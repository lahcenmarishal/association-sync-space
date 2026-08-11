import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { AttachmentsField } from "@/components/AttachmentsField";
import { useFilters, matchFilters, usePagination } from "@/hooks/useFilters";
import {
  useCategories,
  useDepenses,
  useRecettes,
  soldeAvant,
  useCaisses,
  useActivites,
  useSaveRow,
  useDeleteRow,
  uploadDocuments,
  toPiecesJointes,
  getDocumentUrl,
  resoudreDocuments,
  deleteDocument,
  useParametres,
  type Depense,
} from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatMontant, todayISO } from "@/lib/format";
import { MOYENS_PAIEMENT, MOYENS_LABELS } from "@/lib/constants";
import { ouvrirRapportWeb } from "@/lib/report-web";
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

export const Route = createFileRoute("/_authenticated/depenses")({
  head: () => ({
    meta: [
      { title: "Dépenses — Gestion d'association" },
      {
        name: "description",
        content:
          "Saisissez et contrôlez toutes les dépenses de l'association avec justificatifs et rattachement aux activités.",
      },
      { property: "og:title", content: "Dépenses — Gestion d'association" },
      { property: "og:description", content: "Suivi complet des sorties d'argent." },
    ],
  }),
  component: DepensesPage,
});

const empty = {
  date: todayISO(),
  categorie_id: "",
  fournisseur: "",
  montant: "",
  moyen_paiement: "especes",
  numero_cheque: "",
  description: "",
  caisse_id: "none",
  activite_id: "none",
  justificatif: "" as string | null,
  pieces_jointes: [] as string[],
};

function DepensesPage() {
  const { t } = useI18n();
  const { canManageFinance } = useAuth();
  const { data: depenses = [], isLoading } = useDepenses();
  const { data: toutesRecettes = [] } = useRecettes();
  const { data: categories = [] } = useCategories();
  const { data: caisses = [] } = useCaisses();
  const { data: activites = [] } = useActivites();
  const { data: params } = useParametres();
  const devise = params?.devise ?? "DH";
  const save = useSaveRow("depenses", ["caisses", "activites"]);
  const remove = useDeleteRow("depenses", ["caisses", "activites"]);
  const { filters, set, reset } = useFilters();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Depense | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [files, setFiles] = useState<File[]>([]);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const catsDepense = categories.filter((c) => c.type === "depense");
  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.nom ?? t("Sans catégorie");

  const filtered = useMemo(
    () =>
      depenses.filter((d) =>
        matchFilters(
          {
            date: d.date,
            montant: Number(d.montant),
            categorie_id: d.categorie_id,
            texte: `${d.numero_cheque} ${d.fournisseur} ${d.description ?? ""} ${catName(d.categorie_id)}`,
            extra: d.moyen_paiement,
          },
          filters,
        ),
      ),
    [depenses, filters, categories],
  );

  const total = filtered.reduce((t, d) => t + Number(d.montant), 0);
  const { slice, page, totalPages, setPage } = usePagination(filtered, 10);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setFiles([]);
    setOpen(true);
  };

  const openEdit = (d: Depense) => {
    setEditing(d);
    setForm({
      date: d.date,
      categorie_id: d.categorie_id ?? "",
      fournisseur: d.fournisseur,
      montant: String(d.montant),
      moyen_paiement: d.moyen_paiement,
      numero_cheque: d.numero_cheque ?? "",
      description: d.description ?? "",
      caisse_id: d.caisse_id ?? "none",
      activite_id: d.activite_id ?? "none",
      justificatif: d.justificatif,
      pieces_jointes: toPiecesJointes(d.pieces_jointes ?? d.justificatif),
    });
    setFiles([]);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = Number(form.montant);
    if (!form.fournisseur.trim()) {
      toast.error(t("Le bénéficiaire est obligatoire"));
      return;
    }
    if (!Number.isFinite(montant) || montant <= 0) {
      toast.error(t("Le montant doit être supérieur à zéro"));
      return;
    }
    let pieces = [...form.pieces_jointes];
    if (files.length) {
      setUploading(true);
      try {
        pieces = [...pieces, ...(await uploadDocuments(files, "depenses"))];
      } catch {
        toast.error(t("Envoi du fichier impossible"));
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    await save.mutateAsync({
      id: editing?.id,
      values: {
        date: form.date,
        categorie_id: form.categorie_id || null,
        fournisseur: form.fournisseur.trim().slice(0, 200),
        montant,
        moyen_paiement: form.moyen_paiement,
        numero_cheque: form.numero_cheque.trim().slice(0, 60),
        description: form.description.trim().slice(0, 1000) || null,
        caisse_id: form.caisse_id === "none" ? null : form.caisse_id,
        activite_id: form.activite_id === "none" ? null : form.activite_id,
        justificatif: pieces[0] ?? null,
        pieces_jointes: pieces,
      },
    });
    setOpen(false);
  };

      const onExport = async () => {
      const toastId = toast.loading(t("Génération du rapport…"));
      const debut = filtered.map((x) => x.date).sort()[0];
      const soldePrec = soldeAvant(toutesRecettes, depenses, debut);
      const lignes = [];
      for (const d of filtered) {
        const documents = await resoudreDocuments(
          toPiecesJointes(d.pieces_jointes ?? d.justificatif),
        );
        lignes.push({
          cellules: [
            formatDate(d.date),
            catName(d.categorie_id),
            d.fournisseur,
            d.numero_cheque || "—",
            formatMontant(d.montant, devise),
            t(MOYENS_LABELS[d.moyen_paiement] ?? d.moyen_paiement),
            d.description ?? "—",
          ],
          documents,
          variante: "depense" as const,
        });
      }
      ouvrirRapportWeb({
        titre: "تقرير المصاريف",
        sousTitre: `${filtered.length} عملية — المجموع ${formatMontant(total, devise)}`,
        association: params?.nom_association ?? "جمعية الذهاب للماء الصالح للشرب والتنمية والتعاون",
        resume: [
          ["الرصيد السابق", formatMontant(soldePrec, devise)],
          ["عدد العمليات", String(filtered.length)],
          ["مجموع المصاريف", formatMontant(total, devise)],
          ["الرصيد الحالي", formatMontant(soldePrec - total, devise)],
          ["عدد الوثائق المرفقة", String(lignes.reduce((s, l) => s + l.documents.length, 0))],
        ],
        entetes: ["التاريخ", "الصنف", "المستفيد", "رقم الشيك", "المبلغ", "طريقة الأداء", "البيان"],
        lignes,
      });
      toast.success(t("Rapport généré"), { id: toastId });
  };

  return (
    <AppShell
      title={t("Dépenses")}
      description={`${filtered.length} ${t("opération(s)")} · ${t("Total")} ${formatMontant(total, devise)}`}
      actions={
        canManageFinance ? (
          <Button onClick={openNew}>
            <Plus className="size-4" /> {t("Nouvelle dépense")}
          </Button>
        ) : null
      }
    >
      <FilterBar
        filters={filters}
        set={set}
        reset={reset}
        searchPlaceholder="Bénéficiaire, description, n° chèque…"
        categories={catsDepense}
        extra={{
          label: "Moyen de paiement",
          options: MOYENS_PAIEMENT.map((m) => ({ value: m, label: MOYENS_LABELS[m]! })),
        }}
        onExport={onExport}
      />

      <div className="surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Date")}</TableHead>
              <TableHead>{t("Catégorie")}</TableHead>
              <TableHead>{t("Bénéficiaire")}</TableHead>
              <TableHead>{t("N° chèque")}</TableHead>
              <TableHead className="text-right">{t("Montant")}</TableHead>
              <TableHead>{t("Paiement")}</TableHead>
              <TableHead>{t("Justificatif")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t("Chargement…")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && slice.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t("Aucune dépense trouvée.")}
                </TableCell>
              </TableRow>
            )}
            {slice.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{formatDate(d.date)}</TableCell>
                <TableCell>{catName(d.categorie_id)}</TableCell>
                <TableCell className="max-w-[220px] truncate">{d.fournisseur}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {d.numero_cheque || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right font-medium text-destructive">
                  {formatMontant(d.montant, devise)}
                </TableCell>
                <TableCell>{t(MOYENS_LABELS[d.moyen_paiement] ?? d.moyen_paiement)}</TableCell>
                <TableCell>
                  {toPiecesJointes(d.pieces_jointes ?? d.justificatif).length ? (
                    <button
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      onClick={async () => {
                        const list = toPiecesJointes(d.pieces_jointes ?? d.justificatif);
                        try {
                          for (const p of list) window.open(await getDocumentUrl(p), "_blank");
                        } catch {
                          toast.error(t("Fichier introuvable"));
                        }
                      }}
                    >
                      <Paperclip className="size-4" />
                      {toPiecesJointes(d.pieces_jointes ?? d.justificatif).length}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canManageFinance && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(d.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            {t("Précédent")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("Page")} {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("Suivant")}
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("Modifier la dépense") : t("Nouvelle dépense")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("Date")}</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t("Montant")} ({devise})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.montant}
                  onChange={(e) => setForm({ ...form, montant: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>{t("Catégorie")}</Label>
              <Select
                value={form.categorie_id}
                onValueChange={(v) => setForm({ ...form, categorie_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Choisir une catégorie")} />
                </SelectTrigger>
                <SelectContent>
                  {catsDepense.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Bénéficiaire / Fournisseur")}</Label>
              <Input
                value={form.fournisseur}
                maxLength={200}
                onChange={(e) => setForm({ ...form, fournisseur: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("Moyen de paiement")}</Label>
                <Select
                  value={form.moyen_paiement}
                  onValueChange={(v) => setForm({ ...form, moyen_paiement: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOYENS_PAIEMENT.map((m) => (
                      <SelectItem key={m} value={m}>
                        {t(MOYENS_LABELS[m]!)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("Activité liée")}</Label>
                <Select
                  value={form.activite_id}
                  onValueChange={(v) => setForm({ ...form, activite_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("Aucune")}</SelectItem>
                    {activites.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("N° chèque")}</Label>
              <Input
                value={form.numero_cheque}
                maxLength={60}
                onChange={(e) => setForm({ ...form, numero_cheque: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("Caisse quotidienne")}</Label>
              <Select
                value={form.caisse_id}
                onValueChange={(v) => setForm({ ...form, caisse_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("Hors caisse")}</SelectItem>
                  {caisses
                    .filter((c) => c.statut === "ouverte")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {t("Caisse du")} {formatDate(c.date)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Description")}</Label>
              <Textarea
                value={form.description}
                maxLength={1000}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <AttachmentsField
              label="Justificatifs (factures, photos)"
              paths={form.pieces_jointes}
              onRemovePath={(p) => {
                setForm({
                  ...form,
                  pieces_jointes: form.pieces_jointes.filter((x) => x !== p),
                });
                deleteDocument(p).catch(() => undefined);
                toast.success(t("Pièce retirée — enregistrez pour valider"));
              }}
              files={files}
              setFiles={setFiles}
            />


            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Annuler")}
              </Button>
              <Button type="submit" disabled={save.isPending || uploading}>
                {t("Enregistrer")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Supprimer cette dépense ?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Cette action est définitive.")}
            </AlertDialogDescription>
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
