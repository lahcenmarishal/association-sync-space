import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Lock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { FilterBar } from "@/components/FilterBar";
import { useFilters, matchFilters } from "@/hooks/useFilters";
import {
  useCaisses,
  useDepenses,
  useSaveRow,
  useParametres,
  useProfiles,
  type Caisse,
} from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatHeure, formatMontant, todayISO } from "@/lib/format";
import { ouvrirRapportWeb } from "@/lib/report-web";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/caisse")({
  head: () => ({
    meta: [
      { title: "Caisse quotidienne — Gestion d'association" },
      {
        name: "description",
        content:
          "Ouvrez, suivez et clôturez la caisse quotidienne avec le montant initial, les dépenses du jour et le solde restant.",
      },
      { property: "og:title", content: "Caisse quotidienne — Gestion d'association" },
      { property: "og:description", content: "Gestion quotidienne des espèces de l'association." },
    ],
  }),
  component: CaissePage,
});

function CaissePage() {
  const { canManageFinance, user } = useAuth();
  const { t } = useI18n();
  const { data: caisses = [], isLoading } = useCaisses();
  const { data: depenses = [] } = useDepenses();
  const { data: profiles = [] } = useProfiles();
  const { data: params } = useParametres();
  const devise = params?.devise ?? "DH";
  const save = useSaveRow("caisses", ["depenses"]);
  const { filters, set, reset } = useFilters();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Caisse | null>(null);
  const [form, setForm] = useState({
    date: todayISO(),
    montant_initial: "",
    observation: "",
  });
  const [closing, setClosing] = useState<Caisse | null>(null);
  const [closeObs, setCloseObs] = useState("");

  const depensesDe = (id: string) => depenses.filter((d) => d.caisse_id === id);
  const totalDe = (id: string) => depensesDe(id).reduce((t, d) => t + Number(d.montant), 0);

  const responsable = (id: string | null) =>
    profiles.find((p) => p.id === id)?.full_name ?? "—";

  const ouverte = caisses.find((c) => c.statut === "ouverte") ?? null;

  // Solde de clôture de la dernière caisse clôturée = solde antérieur reporté
  const derniereCloturee = useMemo(() => {
    return (
      [...caisses]
        .filter((c) => c.statut === "cloturee")
        .sort((a, b) =>
          (b.heure_fermeture ?? b.date).localeCompare(a.heure_fermeture ?? a.date),
        )[0] ?? null
    );
  }, [caisses]);

  const soldeAnterieur = useMemo(
    () =>
      derniereCloturee
        ? Number(derniereCloturee.montant_initial) - totalDe(derniereCloturee.id)
        : 0,
    [derniereCloturee, depenses],
  );

  const filtered = useMemo(
    () =>
      caisses.filter((c) =>
        matchFilters(
          {
            date: c.date,
            montant: Number(c.montant_initial),
            texte: `${c.numero} ${c.observation ?? ""} ${responsable(c.responsable_id)}`,
            extra: c.statut,
          },
          filters,
        ),
      ),
    [caisses, filters, profiles],
  );

  const openNew = () => {
    if (ouverte) {
      toast.error(t("Une caisse est déjà ouverte, clôturez-la avant d'en ouvrir une nouvelle"));
      return;
    }
    setEditing(null);
    setForm({ date: todayISO(), montant_initial: String(soldeAnterieur), observation: "" });
    setOpen(true);
  };


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montant = Number(form.montant_initial);
    if (!Number.isFinite(montant) || montant < 0) {
      toast.error(t("Montant initial invalide"));
      return;
    }
    await save.mutateAsync({
      id: editing?.id,
      values: {
        date: form.date,
        montant_initial: montant,
        observation: form.observation.trim().slice(0, 1000) || null,
        ...(editing ? {} : { responsable_id: user?.id ?? null, statut: "ouverte" }),
      },
    });
    setOpen(false);
  };

  const cloturer = async () => {
    if (!closing) return;
    await save.mutateAsync({
      id: closing.id,
      values: {
        statut: "cloturee",
        heure_fermeture: new Date().toISOString(),
        observation: closeObs.trim().slice(0, 1000) || closing.observation,
      },
    });
    setClosing(null);
    setCloseObs("");
  };

      const onExport = async () => {
      ouvrirRapportWeb({
        titre: "تقرير الصندوق اليومي",
        sousTitre: `${filtered.length} صندوق`,
        association: params?.nom_association ?? "جمعية الذهاب للماء الصالح للشرب والتنمية والتعاون",
        resume: [
          ["عدد الصناديق", String(filtered.length)],
          ["الرصيد السابق", formatMontant(soldeAnterieur, devise)],
          [
            "مجموع المصاريف",
            formatMontant(
              filtered.reduce((sum, c) => sum + totalDe(c.id), 0),
              devise,
            ),
          ],
        ],
        entetes: ["التاريخ", "المبلغ الأولي", "المصاريف", "الرصيد", "المسؤول", "الحالة"],
        lignes: filtered.map((c) => ({
          cellules: [
            formatDate(c.date),
            formatMontant(c.montant_initial, devise),
            formatMontant(totalDe(c.id), devise),
            formatMontant(Number(c.montant_initial) - totalDe(c.id), devise),
            responsable(c.responsable_id),
            c.statut === "ouverte" ? "مفتوح" : "مغلق",
          ],
          documents: [],
        })),
      });
  };

  return (
    <AppShell
      title="Caisse quotidienne"
      description="Ouverture, suivi des dépenses du jour et clôture"
      actions={
        canManageFinance ? (
          <Button onClick={openNew}>
            <Plus className="size-4" /> {t("Ouvrir une caisse")}
          </Button>
        ) : null
      }
    >
      {ouverte && (
        <div className="surface mb-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">{t("Caisse ouverte")}</p>
              <p className="font-display text-lg font-semibold">
                {formatDate(ouverte.date)} · {t("ouverte à")} {formatHeure(ouverte.heure_ouverture)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("Responsable :")} {responsable(ouverte.responsable_id)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("Solde antérieur")}</p>
                <p className="font-semibold">{formatMontant(soldeAnterieur, devise)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("Montant initial")}</p>
                <p className="font-semibold">{formatMontant(ouverte.montant_initial, devise)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("Dépenses du jour")}</p>
                <p className="font-semibold text-destructive">
                  {formatMontant(totalDe(ouverte.id), devise)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("Solde restant")}</p>
                <p className="font-semibold text-primary">
                  {formatMontant(Number(ouverte.montant_initial) - totalDe(ouverte.id), devise)}
                </p>
              </div>
            </div>
            {canManageFinance && (
              <Button
                variant="outline"
                onClick={() => {
                  setClosing(ouverte);
                  setCloseObs(ouverte.observation ?? "");
                }}
              >
                <Lock className="size-4" /> {t("Clôturer la caisse")}
              </Button>
            )}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">{t("Dépenses rattachées")}</p>
            {depensesDe(ouverte.id).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Aucune dépense enregistrée sur cette caisse.")}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {depensesDe(ouverte.id).map((d) => (
                  <li key={d.id} className="flex justify-between gap-3">
                    <span className="truncate">
                      #{d.numero} · {d.fournisseur}
                    </span>
                    <span className="text-destructive">{formatMontant(d.montant, devise)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <FilterBar
        filters={filters}
        set={set}
        reset={reset}
        searchPlaceholder="Numéro, responsable, observation…"
        extra={{
          label: "Statut",
          options: [
            { value: "ouverte", label: t("Ouverte") },
            { value: "cloturee", label: t("Clôturée") },
          ],
        }}
        onExport={onExport}
      />

      <div className="surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("N°")}</TableHead>
              <TableHead>{t("Date")}</TableHead>
              <TableHead className="text-right">{t("Montant initial")}</TableHead>
              <TableHead className="text-right">{t("Dépenses")}</TableHead>
              <TableHead className="text-right">{t("Solde")}</TableHead>
              <TableHead>{t("Responsable")}</TableHead>
              <TableHead>{t("Statut")}</TableHead>
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
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t("Aucune caisse enregistrée.")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.numero}</TableCell>
                <TableCell>{formatDate(c.date)}</TableCell>
                <TableCell className="text-right">
                  {formatMontant(c.montant_initial, devise)}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  {formatMontant(totalDe(c.id), devise)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatMontant(Number(c.montant_initial) - totalDe(c.id), devise)}
                </TableCell>
                <TableCell>{responsable(c.responsable_id)}</TableCell>
                <TableCell>
                  <Badge variant={c.statut === "ouverte" ? "default" : "secondary"}>
                    {c.statut === "ouverte" ? t("Ouverte") : t("Clôturée")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canManageFinance && c.statut === "ouverte" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(c);
                        setForm({
                          date: c.date,
                          montant_initial: String(c.montant_initial),
                          observation: c.observation ?? "",
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("Modifier la caisse") : t("Ouvrir une caisse")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>{t("Date")}</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="rounded-lg bg-secondary p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {t("Solde antérieur (dernière clôture)")} :{" "}
                  <strong>{formatMontant(soldeAnterieur, devise)}</strong>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ ...form, montant_initial: String(soldeAnterieur) })}
                >
                  {t("Reporter")}
                </Button>
              </div>
            </div>
            <div>
              <Label>{t("Montant initial")} ({devise})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.montant_initial}
                onChange={(e) => setForm({ ...form, montant_initial: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>{t("Observation")}</Label>
              <Textarea
                value={form.observation}
                maxLength={1000}
                onChange={(e) => setForm({ ...form, observation: e.target.value })}
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

      <Dialog open={!!closing} onOpenChange={(o) => !o && setClosing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Clôturer la caisse")}</DialogTitle>
          </DialogHeader>
          {closing && (
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary p-3 text-sm">
                <p>{t("Montant initial :")} {formatMontant(closing.montant_initial, devise)}</p>
                <p>{t("Total dépenses :")} {formatMontant(totalDe(closing.id), devise)}</p>
                <p className="font-semibold">
                  {t("Solde de clôture :")}{" "}
                  {formatMontant(Number(closing.montant_initial) - totalDe(closing.id), devise)}
                </p>
              </div>
              <div>
                <Label>{t("Observation de clôture")}</Label>
                <Textarea
                  value={closeObs}
                  maxLength={1000}
                  onChange={(e) => setCloseObs(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setClosing(null)}>
                  {t("Annuler")}
                </Button>
                <Button onClick={cloturer} disabled={save.isPending}>
                  {t("Confirmer la clôture")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
