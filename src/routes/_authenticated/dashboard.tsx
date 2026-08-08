import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useCategories,
  useDepenses,
  useRecettes,
  useParametres,
  useActivites,
  useCaisses,
} from "@/lib/data";
import { formatDate, formatMontant, monthLabel } from "@/lib/format";
import { STATUT_ACTIVITE_LABELS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Association EDDAHAB" },
      {
        name: "description",
        content:
          "Solde, recettes, dépenses, caisse quotidienne et activités du réseau d'eau potable EDDAHAB en temps réel.",
      },
      { property: "og:title", content: "Tableau de bord — Association EDDAHAB" },
      {
        property: "og:description",
        content: "Suivi financier et activités de l'association en temps réel.",
      },
    ],
  }),
  component: DashboardPage,
});

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "primary";
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DashboardPage() {
  const { t } = useI18n();
  const { data: categories = [] } = useCategories();
  const { data: recettes = [], isLoading: loadingR } = useRecettes();
  const { data: depenses = [], isLoading: loadingD } = useDepenses();
  const { data: activites = [] } = useActivites();
  const { data: caisses = [] } = useCaisses();
  const { data: params } = useParametres();
  const devise = params?.devise ?? "DH";
  const isLoading = loadingR || loadingD;

  // Les totaux sont calculés directement à partir des données déjà chargées :
  // plus rapide et fiable en production (pas d'appel serveur supplémentaire).
  const stats = useMemo(() => {
    const now = new Date();
    const jour = now.toISOString().slice(0, 10);
    const year = now.getFullYear();
    const monthStart = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const yearStart = `${year}-01-01`;
    const sum = (rows: { montant: number | string }[]) =>
      rows.reduce((tot, x) => tot + Number(x.montant), 0);

    const totalRecettes = sum(recettes);
    const totalDepenses = sum(depenses);

    const parMois = Array.from({ length: 12 }, (_, i) => {
      const prefix = `${year}-${String(i + 1).padStart(2, "0")}`;
      const rec = sum(recettes.filter((x) => x.date.startsWith(prefix)));
      const dep = sum(depenses.filter((x) => x.date.startsWith(prefix)));
      return { mois: i, recettes: rec, depenses: dep, solde: rec - dep };
    });

    const groupBy = (rows: { categorie_id: string | null; montant: number | string }[]) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        const key = row.categorie_id ?? "sans";
        map.set(key, (map.get(key) ?? 0) + Number(row.montant));
      }
      return Array.from(map, ([categorie_id, total]) => ({ categorie_id, total }));
    };

    const caisse = caisses.find((c) => c.statut === "ouverte") ?? null;
    const depensesCaisse = caisse ? depenses.filter((d) => d.caisse_id === caisse.id) : [];

    return {
      totalRecettes,
      totalDepenses,
      solde: totalRecettes - totalDepenses,
      recettesJour: sum(recettes.filter((x) => x.date === jour)),
      depensesJour: sum(depenses.filter((x) => x.date === jour)),
      recettesMois: sum(recettes.filter((x) => x.date >= monthStart)),
      depensesMois: sum(depenses.filter((x) => x.date >= monthStart)),
      recettesAnnee: sum(recettes.filter((x) => x.date >= yearStart)),
      depensesAnnee: sum(depenses.filter((x) => x.date >= yearStart)),
      parMois,
      recettesParCategorie: groupBy(recettes),
      depensesParCategorie: groupBy(depenses),
      caisseOuverte: caisse
        ? {
            id: caisse.id,
            date: caisse.date,
            montantInitial: Number(caisse.montant_initial),
            totalDepenses: sum(depensesCaisse),
            solde: Number(caisse.montant_initial) - sum(depensesCaisse),
          }
        : null,
      activitesRealisees: activites.filter(
        (a) => a.statut === "terminee" && a.date.startsWith(String(year)),
      ).length,
      activitesAVenir: activites
        .filter((a) => a.date >= jour && a.statut !== "annulee")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5),
      budgetsDepasses: activites.filter(
        (a) => Number(a.budget_prevu) > 0 && Number(a.budget_depense) > Number(a.budget_prevu),
      ).length,
    };
  }, [recettes, depenses, activites, caisses]);

  const catName = (id: string) => categories.find((c) => c.id === id)?.nom ?? t("Sans catégorie");
  const catColor = (id: string) => categories.find((c) => c.id === id)?.couleur ?? "#94a3b8";

  const monthly =
    stats?.parMois.map((m) => ({
      mois: monthLabel(m.mois),
      [t("Recettes")]: m.recettes,
      [t("Dépenses")]: m.depenses,
      [t("Solde")]: m.solde,
    })) ?? [];

  const pieRecettes =
    stats?.recettesParCategorie.map((c) => ({
      name: catName(c.categorie_id),
      value: c.total,
      color: catColor(c.categorie_id),
    })) ?? [];
  const pieDepenses =
    stats?.depensesParCategorie.map((c) => ({
      name: catName(c.categorie_id),
      value: c.total,
      color: catColor(c.categorie_id),
    })) ?? [];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell
      title={t("Tableau de bord")}
      description={t("Situation financière et activités en temps réel")}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("Chargement des données…")}</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label={t("Solde actuel")}
              value={formatMontant(stats?.solde, devise)}
              tone={(stats?.solde ?? 0) >= 0 ? "primary" : "negative"}
              hint={t("Recettes − Dépenses (calcul automatique)")}
            />
            <Stat
              label={t("Total des recettes")}
              value={formatMontant(stats?.totalRecettes, devise)}
              tone="positive"
              hint={`${t("Ce mois")} : ${formatMontant(stats?.recettesMois, devise)}`}
            />
            <Stat
              label={t("Total des dépenses")}
              value={formatMontant(stats?.totalDepenses, devise)}
              tone="negative"
              hint={`${t("Ce mois")} : ${formatMontant(stats?.depensesMois, devise)}`}
            />
            <Stat
              label={t("Caisse quotidienne")}
              value={
                stats?.caisseOuverte
                  ? formatMontant(stats.caisseOuverte.solde, devise)
                  : t("Caisse fermée")
              }
              hint={
                stats?.caisseOuverte
                  ? `${t("Ouverte le")} ${formatDate(stats.caisseOuverte.date)} · ${t("initial")} ${formatMontant(stats.caisseOuverte.montantInitial, devise)}`
                  : t("Aucune caisse ouverte aujourd'hui")
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={t("Recettes du jour")} value={formatMontant(stats?.recettesJour, devise)} tone="positive" />
            <Stat label={t("Dépenses du jour")} value={formatMontant(stats?.depensesJour, devise)} tone="negative" />
            <Stat
              label={t("Activités réalisées")}
              value={String(stats?.activitesRealisees ?? 0)}
              hint={`${t("Année")} ${new Date().getFullYear()}`}
            />
            <Stat
              label={t("Solde de l'année")}
              value={formatMontant((stats?.recettesAnnee ?? 0) - (stats?.depensesAnnee ?? 0), devise)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Évolution des recettes par mois")}</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mois" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => formatMontant(v, devise)} />
                    <Area
                      type="monotone"
                      dataKey={t("Recettes")}
                      stroke="var(--color-chart-2)"
                      fill="var(--color-chart-2)"
                      fillOpacity={0.18}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Évolution des dépenses par mois")}</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mois" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => formatMontant(v, devise)} />
                    <Area
                      type="monotone"
                      dataKey={t("Dépenses")}
                      stroke="var(--color-chart-3)"
                      fill="var(--color-chart-3)"
                      fillOpacity={0.18}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Solde mensuel")}</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mois" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => formatMontant(v, devise)} />
                    <Line type="monotone" dataKey={t("Solde")} stroke="var(--color-chart-1)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Recettes vs dépenses")}</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="mois" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v: number) => formatMontant(v, devise)} />
                    <Legend />
                    <Bar dataKey={t("Recettes")} fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={t("Dépenses")} fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Répartition des recettes par catégorie")}</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieRecettes} dataKey="value" nameKey="name" outerRadius={80} label>
                      {pieRecettes.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMontant(v, devise)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Répartition des dépenses par catégorie")}</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieDepenses} dataKey="value" nameKey="name" outerRadius={80} label>
                      {pieDepenses.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMontant(v, devise)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Dernières recettes")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recettes.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      #{r.numero} · {r.source || catName(r.categorie_id ?? "")}
                    </span>
                    <span className="shrink-0 font-medium text-success">
                      +{formatMontant(r.montant, devise)}
                    </span>
                  </div>
                ))}
                {recettes.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("Aucune recette enregistrée.")}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Dernières dépenses")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {depenses.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      #{d.numero} · {d.fournisseur || catName(d.categorie_id ?? "")}
                    </span>
                    <span className="shrink-0 font-medium text-destructive">
                      −{formatMontant(d.montant, devise)}
                    </span>
                  </div>
                ))}
                {depenses.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("Aucune dépense enregistrée.")}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Activités à venir")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(stats?.activitesAVenir ?? []).map((a) => (
                  <Link
                    key={a.id}
                    to="/activites"
                    className="block rounded-lg border p-2 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{a.titre}</span>
                      <Badge variant="secondary">{t(STATUT_ACTIVITE_LABELS[a.statut] ?? a.statut)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.date)} {a.lieu ? `· ${a.lieu}` : ""}
                    </p>
                  </Link>
                ))}
                {(stats?.activitesAVenir ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("Aucune activité programmée.")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Opérations du jour")} ({formatDate(today)})</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    {t("Recettes du jour")}
                  </p>
                  {recettes.filter((r) => r.date === today).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("Aucune")}</p>
                  ) : (
                    recettes
                      .filter((r) => r.date === today)
                      .map((r) => (
                        <p key={r.id} className="text-sm">
                          {r.source || "—"} · {formatMontant(r.montant, devise)}
                        </p>
                      ))
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    {t("Dépenses du jour")}
                  </p>
                  {depenses.filter((d) => d.date === today).length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("Aucune")}</p>
                  ) : (
                    depenses
                      .filter((d) => d.date === today)
                      .map((d) => (
                        <p key={d.id} className="text-sm">
                          {d.fournisseur || "—"} · {formatMontant(d.montant, devise)}
                        </p>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Alertes")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {!stats?.caisseOuverte && (
                  <p className="rounded-md bg-warning/15 px-3 py-2 text-warning-foreground">
                    {t("Aucune caisse ouverte aujourd'hui.")}
                  </p>
                )}
                {stats?.caisseOuverte && stats.caisseOuverte.date < today && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">
                    {t("La caisse du")} {formatDate(stats.caisseOuverte.date)} {t("n'a pas été clôturée.")}
                  </p>
                )}
                {(stats?.budgetsDepasses ?? 0) > 0 && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">
                    {stats?.budgetsDepasses} {t("activité(s) dépassent leur budget prévu.")}
                  </p>
                )}
                {(stats?.solde ?? 0) < 0 && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">
                    {t("Le solde de l'association est négatif.")}
                  </p>
                )}
                {stats?.caisseOuverte &&
                  stats.caisseOuverte.date === today &&
                  (stats?.budgetsDepasses ?? 0) === 0 &&
                  (stats?.solde ?? 0) >= 0 && (
                    <p className="text-muted-foreground">{t("Aucune alerte. Tout est à jour.")}</p>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
