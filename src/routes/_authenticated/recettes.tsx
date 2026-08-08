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
  useRecettes,
  useSaveRow,
  useDeleteRow,
  uploadDocuments,
  toPiecesJointes,
  getDocumentUrl,
  resoudreDocuments,
  deleteDocument,
  useParametres,
  type Recette,
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

export const Route = createFileRoute("/_authenticated/recettes")({
  head: () => ({
    meta: [
      { title: "Recettes — Gestion d'association" },
      {
        name: "description",
        content:
          "Enregistrez et suivez toutes les recettes de l'association : cotisations, dons, subventions et ventes.",
      },
      { property: "og:title", content: "Recettes — Gestion d'association" },
      { property: "og:description", content: "Suivi complet des entrées d'argent." },
    ],
  }),
  component: RecettesPage,
});

const empty = {
  date: todayISO(),
  categorie_id: "",
  source: "",
  montant: "",
  moyen_paiement: "especes",
  description: "",
  piece_jointe: "" as string | null,
  pieces_jointes: [] as string[],
};

function RecettesPage() {
  const { t } = useI18n();
  const { canManageFinance } = useAuth();
  const { data: recettes = [], isLoading } = useRecettes();
  const { data: categories = [] } = useCategories();
  const { data: params } = useParametres();
  const devise = params?.devise ?? "DH";
  const save = useSaveRow("recettes");
  const remove = useDeleteRow("recettes");
  const { filters, set, reset } = useFilters();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recette | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [files, setFiles] = useState<File[]>([]);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const catsRecette = categories.filter((c) => c.type === "recette");
  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.nom ?? t("Sans catégorie");

  const filtered = useMemo(
    () =>
      recettes.filter((r) =>
        matchFilters(
          {
            date: r.date,
            montant: Number(r.montant),
            categorie_id: r.categorie_id,
            texte: `${r.numero} ${r.source} ${r.description ?? ""} ${catName(r.categorie_id)}`,
            extra: r.moyen_paiement,
          },
          filters,
        ),
      ),
    [recettes, filters, categories],
  );

  const total = filtered.reduce((t, r) => t + Number(r.montant), 0);
  const { slice, page, totalPages, setPage } = usePagination(filtered, 10);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setFiles([]);
    setOpen(true);
  };

  const openEdit = (r: Recette) => {
    setEditing(r);
    setForm({
      date: r.date,
      categorie_id: r.categorie_id ?? "",
      source: r.source,
      montant: String(r.montant),
      moyen_paiement: r.moyen_paiement,
      description: r.description ?? "",
      piece_jointe: r.piece_jointe,
      pieces_jointes: toPiecesJointes(r.pieces_jointes ?? r.piece_jointe),
    });
    setFiles([]);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = Number(form.montant);
    if (!form.source.trim()) {
      toast.error(t("La source est obligatoire"));
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
        pieces = [...pieces, ...(await uploadDocuments(files, "recettes"))];
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
        source: form.source.trim().slice(0, 200),
        montant,
        moyen_paiement: form.moyen_paiement,
        description: form.description.trim().slice(0, 1000) || null,
        piece_jointe: pieces[0] ?? null,
        pieces_jointes: pieces,
      },
    });
    setOpen(false);
  };

      const onExport = async () => {
      const toastId = toast.loading(t("Génération du rapport…"));
      const lignes = [];
      for (const r of filtered) {
        const documents = await resoudreDocuments(
          toPiecesJointes(r.pieces_jointes ?? r.piece_jointe),
        );
        lignes.push({
          cellules: [
            String(r.numero),
            formatDate(r.date),
            catName(r.categorie_id),
            r.source,
            formatMontant(r.montant, devise),
            t(MOYENS_LABELS[r.moyen_paiement] ?? r.moyen_paiement),
            r.description ?? "—",
          ],
          documents,
        });
      }
      ouvrirRapportWeb({
        titre: "تقرير المداخيل",
        sousTitre: `${filtered.length} عملية — المجموع ${formatMontant(total, devise)}`,
        association: params?.nom_association ?? "جمعية الذهاب للماء الصالح للشرب والتنمية والتعاون",
        resume: [
          ["عدد العمليات", String(filtered.length)],
          ["مجموع المداخيل", formatMontant(total, devise)],
          ["عدد الوثائق المرفقة", String(lignes.reduce((s, l) => s + l.documents.length, 0))],
        ],
        entetes: ["الرقم", "التاريخ", "الصنف", "المصدر", "المبلغ", "طريقة الأداء", "البيان"],
        lignes,
      });
      toast.success(t("Rapport généré"), { id: toastId });
  };

  return (
    <AppShell
      title={t("Recettes")}
      description={`${filtered.length} ${t("opération(s)")} · ${t("Total")} ${formatMontant(total, devise)}`}
      actions={
        canManageFinance ? (
          <Button onClick={openNew}>
            <Plus className="size-4" /> {t("Nouvelle recette")}
          </Button>
        ) : null
      }
    >
      <FilterBar
        filters={filters}
        set={set}
        reset={reset}
        searchPlaceholder="Source, description, numéro…"
        categories={catsRecette}
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
              <TableHead>N°</TableHead>
              <TableHead>{t("Date")}</TableHead>
              <TableHead>{t("Catégorie")}</TableHead>
              <TableHead>{t("Source")}</TableHead>
              <TableHead className="text-right">{t("Montant")}</TableHead>
              <TableHead>{t("Paiement")}</TableHead>
              <TableHead>{t("Pièce")}</TableHead>
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
                  {t("Aucune recette trouvée.")}
                </TableCell>
              </TableRow>
            )}
            {slice.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.numero}</TableCell>
                <TableCell>{formatDate(r.date)}</TableCell>
                <TableCell>{catName(r.categorie_id)}</TableCell>
                <TableCell className="max-w-[220px] truncate">{r.source}</TableCell>
                <TableCell className="text-right font-medium text-success">
                  {formatMontant(r.montant, devise)}
                </TableCell>
                <TableCell>{t(MOYENS_LABELS[r.moyen_paiement] ?? r.moyen_paiement)}</TableCell>
                <TableCell>
                  {toPiecesJointes(r.pieces_jointes ?? r.piece_jointe).length ? (
                    <button
                      className="text-primary hover:underline"
                      onClick={async () => {
                        try {
                          for (const p of toPiecesJointes(r.pieces_jointes ?? r.piece_jointe))
                            window.open(await getDocumentUrl(p), "_blank");
                        } catch {
                          toast.error(t("Fichier introuvable"));
                        }
                      }}
                    >
                      <Paperclip className="size-4" />
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canManageFinance && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(r.id)}>
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
            <DialogTitle>{editing ? t("Modifier la recette") : t("Nouvelle recette")}</DialogTitle>
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
                  {catsRecette.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Source / Donateur")}</Label>
              <Input
                value={form.source}
                maxLength={200}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                required
              />
            </div>
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
              <Label>{t("Description")}</Label>
              <Textarea
                value={form.description}
                maxLength={1000}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <AttachmentsField
              label="Pièces jointes (reçus)"
              paths={form.pieces_jointes}
              onRemovePath={(p) => {
                setForm({ ...form, pieces_jointes: form.pieces_jointes.filter((x) => x !== p) });
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
            <AlertDialogTitle>{t("Supprimer cette recette ?")}</AlertDialogTitle>
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
