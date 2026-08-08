import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Users, MapPin, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { AttachmentsField } from "@/components/AttachmentsField";
import { useFilters, matchFilters } from "@/hooks/useFilters";
import {
  useActivites,
  useDepenses,
  useSaveRow,
  useDeleteRow,
  useParametres,
  resoudreDocuments,
  uploadDocuments,
  deleteDocument,
  toPiecesJointes,
  type Activite,
} from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatHeure, formatMontant, todayISO } from "@/lib/format";
import { TYPES_ACTIVITE, TYPE_ACTIVITE_LABELS, STATUT_ACTIVITE_LABELS } from "@/lib/constants";
import { ouvrirRapportWeb } from "@/lib/report-web";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

export const Route = createFileRoute("/_authenticated/activites")({
  head: () => ({
    meta: [
      { title: "Activités — Gestion d'association" },
      {
        name: "description",
        content:
          "Planifiez les activités annuelles de l'association, suivez les budgets prévus et dépensés, les participants et les archives.",
      },
      { property: "og:title", content: "Activités — Gestion d'association" },
      { property: "og:description", content: "Planification et suivi des activités annuelles." },
    ],
  }),
  component: ActivitesPage,
});

const empty = {
  titre: "",
  type_activite: "evenement",
  date: todayISO(),
  heure: "",
  lieu: "",
  responsable_nom: "",
  budget_prevu: "",
  participants: "",
  description: "",
  statut: "prevue",
  photos: [] as string[],
  documents: [] as string[],
};

function ActivitesPage() {
  const { t } = useI18n();
  const { canManageActivities } = useAuth();
  const { data: activites = [], isLoading } = useActivites();
  const { data: depenses = [] } = useDepenses();
  const { data: params } = useParametres();
  const devise = params?.devise ?? "DH";
  const save = useSaveRow("activites");
  const remove = useDeleteRow("activites");
  const { filters, set, reset } = useFilters();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activite | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [files, setFiles] = useState<File[]>([]);
  const [toDelete, setToDelete] = useState<Activite | null>(null);
  const [detail, setDetail] = useState<Activite | null>(null);
  const [saving, setSaving] = useState(false);

  const depenseReelle = (id: string) =>
    depenses.filter((d) => d.activite_id === id).reduce((t, d) => t + Number(d.montant), 0);

  const filtered = useMemo(
    () =>
      activites.filter((a) =>
        matchFilters(
          {
            date: a.date,
            montant: Number(a.budget_prevu),
            texte: `${a.titre} ${a.lieu ?? ""} ${a.responsable_nom ?? ""} ${a.description ?? ""}`,
            extra: a.statut,
          },
          filters,
        ),
      ),
    [activites, filters],
  );

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, photos: [], documents: [] });
    setFiles([]);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.titre.trim().length < 2) {
      toast.error(t("Le titre est obligatoire"));
      return;
    }
    setSaving(true);
    let photos: string[] = [...form.photos];
    if (files.length) {
      try {
        photos = [...photos, ...(await uploadDocuments(files, "activites"))];
      } catch {
        toast.error(t("Envoi des fichiers impossible"));
        setSaving(false);
        return;
      }
    }
    await save.mutateAsync({
      id: editing?.id,
      values: {
        titre: form.titre.trim().slice(0, 200),
        type_activite: form.type_activite,
        date: form.date,
        heure: form.heure || null,
        lieu: form.lieu.trim().slice(0, 200) || null,
        responsable_nom: form.responsable_nom.trim().slice(0, 150) || null,
        budget_prevu: Number(form.budget_prevu) || 0,
        participants: Number(form.participants) || 0,
        description: form.description.trim().slice(0, 2000) || null,
        statut: form.statut,
        photos,
        documents: form.documents,
      },
    });
    setSaving(false);
    setFiles([]);
    setOpen(false);
  };

      const onExport = async () => {
      const toastId = toast.loading(t("Génération du rapport…"));
      const lignes = [];
      for (const a of filtered) {
        const documents = await resoudreDocuments([
          ...(a.photos ?? []),
          ...(a.documents ?? []),
        ] as string[]);
        lignes.push({
          cellules: [
            a.titre,
            t(TYPE_ACTIVITE_LABELS[a.type_activite] ?? a.type_activite),
            formatDate(a.date),
            a.lieu ?? "—",
            formatMontant(a.budget_prevu, devise),
            formatMontant(depenseReelle(a.id), devise),
            String(a.participants),
            t(STATUT_ACTIVITE_LABELS[a.statut] ?? a.statut),
          ],
          documents,
        });
      }
      ouvrirRapportWeb({
        titre: "تقرير الأنشطة",
        sousTitre: `${filtered.length} نشاط`,
        association: params?.nom_association ?? "جمعية الذهاب للماء الصالح للشرب والتنمية والتعاون",
        resume: [
          ["عدد الأنشطة", String(filtered.length)],
          [
            "الميزانية المتوقعة",
            formatMontant(
              filtered.reduce((sum, a) => sum + Number(a.budget_prevu), 0),
              devise,
            ),
          ],
          [
            "المصاريف الفعلية",
            formatMontant(
              filtered.reduce((sum, a) => sum + depenseReelle(a.id), 0),
              devise,
            ),
          ],
        ],
        entetes: [
          "النشاط",
          "النوع",
          "التاريخ",
          "المكان",
          "الميزانية",
          "المصروف",
          "المشاركون",
          "الحالة",
        ],
        lignes,
      });
      toast.success(t("Rapport généré"), { id: toastId });
  };

  return (
    <AppShell
      title={t("Activités")}
      description={`${filtered.length} ${t("activité(s)")}`}
      actions={
        canManageActivities ? (
          <Button onClick={openNew}>
            <Plus className="size-4" /> {t("Nouvelle activité")}
          </Button>
        ) : null
      }
    >
      <FilterBar
        filters={filters}
        set={set}
        reset={reset}
        searchPlaceholder="Titre, lieu, responsable…"
        showMontant={false}
        extra={{
          label: "Statut",
          options: Object.entries(STATUT_ACTIVITE_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        }}
        onExport={onExport}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("Chargement…")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("Aucune activité trouvée.")}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const reel = depenseReelle(a.id);
            const prevu = Number(a.budget_prevu);
            const pct = prevu > 0 ? Math.min(100, (reel / prevu) * 100) : 0;
            return (
              <div key={a.id} className="surface flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="text-left font-display text-base font-semibold hover:underline"
                    onClick={() => setDetail(a)}
                  >
                    {a.titre}
                  </button>
                  <Badge variant={a.statut === "annulee" ? "destructive" : "secondary"}>
                    {t(STATUT_ACTIVITE_LABELS[a.statut] ?? a.statut)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(TYPE_ACTIVITE_LABELS[a.type_activite] ?? a.type_activite)} · {formatDate(a.date)}
                  {a.heure ? ` à ${formatHeure(a.heure)}` : ""}
                </p>
                {a.lieu && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" /> {a.lieu}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="size-3.5" /> {a.participants} {t("participant(s)")}
                </p>

                <div className="mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t("Budget")}</span>
                    <span className={reel > prevu && prevu > 0 ? "text-destructive" : ""}>
                      {formatMontant(reel, devise)} / {formatMontant(prevu, devise)}
                    </span>
                  </div>
                  <Progress value={pct} className="mt-1" />
                </div>

                {canManageActivities && (
                  <div className="mt-4 flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(a);
                        setForm({
                          titre: a.titre,
                          type_activite: a.type_activite,
                          date: a.date,
                          heure: a.heure ?? "",
                          lieu: a.lieu ?? "",
                          responsable_nom: a.responsable_nom ?? "",
                          budget_prevu: String(a.budget_prevu),
                          participants: String(a.participants),
                          description: a.description ?? "",
                          statut: a.statut,
                          photos: toPiecesJointes(a.photos),
                          documents: toPiecesJointes(a.documents),
                        });
                        setFiles([]);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setToDelete(a)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("Modifier l'activité") : t("Nouvelle activité")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>{t("Titre")}</Label>
              <Input
                value={form.titre}
                maxLength={200}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>{t("Type")}</Label>
                <Select
                  value={form.type_activite}
                  onValueChange={(v) => setForm({ ...form, type_activite: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_ACTIVITE.map((ty) => (
                      <SelectItem key={ty} value={ty}>
                        {t(TYPE_ACTIVITE_LABELS[ty] ?? ty)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("Statut")}</Label>
                <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUT_ACTIVITE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {t(l)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Label>{t("Heure")}</Label>
                <Input
                  type="time"
                  value={form.heure}
                  onChange={(e) => setForm({ ...form, heure: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("Lieu")}</Label>
                <Input
                  value={form.lieu}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("Responsable")}</Label>
                <Input
                  value={form.responsable_nom}
                  maxLength={150}
                  onChange={(e) => setForm({ ...form, responsable_nom: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("Budget prévu")} ({devise})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.budget_prevu}
                  onChange={(e) => setForm({ ...form, budget_prevu: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("Participants")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.participants}
                  onChange={(e) => setForm({ ...form, participants: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t("Description")}</Label>
              <Textarea
                value={form.description}
                maxLength={2000}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <AttachmentsField
              label="Photos / documents"
              paths={[...form.photos, ...form.documents]}
              onRemovePath={(p) => {
                setForm({
                  ...form,
                  photos: form.photos.filter((x) => x !== p),
                  documents: form.documents.filter((x) => x !== p),
                });
                deleteDocument(p).catch(() => undefined);
              }}
              files={files}
              setFiles={setFiles}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("Annuler")}
              </Button>
              <Button type="submit" disabled={saving || save.isPending}>
                {t("Enregistrer")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.titre}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">{t("Type")} :</span>{" "}
                {t(TYPE_ACTIVITE_LABELS[detail.type_activite] ?? detail.type_activite)}
              </p>
              <p>
                <span className="text-muted-foreground">{t("Date")} :</span> {formatDate(detail.date)}{" "}
                {detail.heure ? `à ${formatHeure(detail.heure)}` : ""}
              </p>
              <p>
                <span className="text-muted-foreground">{t("Lieu")} :</span> {detail.lieu ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">{t("Responsable")} :</span>{" "}
                {detail.responsable_nom ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">{t("Budget prévu")} :</span>{" "}
                {formatMontant(detail.budget_prevu, devise)}
              </p>
              <p>
                <span className="text-muted-foreground">{t("Dépenses réelles")} :</span>{" "}
                {formatMontant(depenseReelle(detail.id), devise)}
              </p>
              <p>
                <span className="text-muted-foreground">{t("Participants")} :</span> {detail.participants}
              </p>
              {detail.description && <p className="pt-2">{detail.description}</p>}
              <div className="pt-2">
                <p className="mb-1 font-medium">{t("Dépenses rattachées")}</p>
                {depenses.filter((d) => d.activite_id === detail.id).length === 0 ? (
                  <p className="text-muted-foreground">{t("Aucune")}</p>
                ) : (
                  depenses
                    .filter((d) => d.activite_id === detail.id)
                    .map((d) => (
                      <p key={d.id} className="flex justify-between">
                        <span>{d.fournisseur}</span>
                        <span>{formatMontant(d.montant, devise)}</span>
                      </p>
                    ))
                )}
              </div>
              <div className="pt-2">
                <p className="mb-1 font-medium">{t("Photos / documents")}</p>
                {piecesOf(detail).length === 0 ? (
                  <p className="text-muted-foreground">{t("Aucune")}</p>
                ) : (
                  <div className="space-y-2">
                    {piecesOf(detail).map((p) => (
                      <div
                        key={p}
                        className="flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm"
                      >
                        <Paperclip className="size-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{p.split("/").pop()}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              window.open(await getDocumentUrl(p), "_blank");
                            } catch {
                              toast.error(t("Fichier introuvable"));
                            }
                          }}
                        >
                          {t("Voir")}
                        </Button>
                        {canManageActivities && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAttachment(detail, p)}
                          >
                            <X className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Supprimer")} « {toDelete?.titre} » ?</AlertDialogTitle>
            <AlertDialogDescription>{t("Cette action est définitive.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Annuler")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) remove.mutate(toDelete.id);
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
