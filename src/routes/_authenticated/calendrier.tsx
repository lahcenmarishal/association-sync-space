import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useActivites } from "@/lib/data";
import { formatDate, formatHeure } from "@/lib/format";
import { STATUT_ACTIVITE_LABELS, TYPE_ACTIVITE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/calendrier")({
  head: () => ({
    meta: [
      { title: "Calendrier des activités — Gestion d'association" },
      {
        name: "description",
        content:
          "Visualisez le calendrier mensuel des activités de l'association et les événements à venir.",
      },
      { property: "og:title", content: "Calendrier — Gestion d'association" },
      { property: "og:description", content: "Vue mensuelle des activités de l'association." },
    ],
  }),
  component: CalendrierPage,
});

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS_NOMS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function CalendrierPage() {
  const { data: activites = [] } = useActivites();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const iso = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const forDay = (d: number) => activites.filter((a) => a.date === iso(d));

  const shift = (delta: number) => {
    const m = month + delta;
    if (m < 0) {
      setMonth(11);
      setYear(year - 1);
    } else if (m > 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(m);
  };

  const upcoming = activites
    .filter((a) => a.date >= new Date().toISOString().slice(0, 10) && a.statut !== "annulee")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <AppShell title="Calendrier" description="Vue mensuelle des activités">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="surface p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Mois précédent">
              <ChevronLeft className="size-4" />
            </Button>
            <p className="font-display text-lg font-semibold">
              {MOIS_NOMS[month]} {year}
            </p>
            <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Mois suivant">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {JOURS.map((j) => (
              <div key={j} className="py-1 font-medium">
                {j}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => (
              <div
                key={i}
                className={`min-h-20 rounded-lg border p-1 text-xs ${
                  d === null ? "border-transparent" : "bg-card"
                }`}
              >
                {d !== null && (
                  <>
                    <span className="text-muted-foreground">{d}</span>
                    <div className="mt-1 space-y-1">
                      {forDay(d).map((a) => (
                        <div
                          key={a.id}
                          className="truncate rounded bg-primary/10 px-1 py-0.5 text-primary"
                          title={a.titre}
                        >
                          {a.titre}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-4">
          <p className="mb-3 font-display font-semibold">Prochaines activités</p>
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune activité à venir.</p>
            )}
            {upcoming.map((a) => (
              <div key={a.id} className="rounded-lg border p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{a.titre}</p>
                  <Badge variant="secondary">{STATUT_ACTIVITE_LABELS[a.statut]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(a.date)}
                  {a.heure ? ` · ${formatHeure(a.heure)}` : ""} ·{" "}
                  {TYPE_ACTIVITE_LABELS[a.type_activite]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
