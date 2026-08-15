import { Search, RotateCcw, Presentation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FiltersState } from "@/hooks/useFilters";
import { useI18n } from "@/lib/i18n";

const MOIS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];
const MOIS_LABELS = [
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

export function FilterBar({
  filters,
  set,
  reset,
  searchPlaceholder = "Rechercher…",
  categories,
  extra,
  showMontant = true,
  onExport,
  onExportCaisse,
}: {
  filters: FiltersState;
  set: (p: Partial<FiltersState>) => void;
  reset: () => void;
  searchPlaceholder?: string;
  categories?: { id: string; nom: string }[];
  extra?: { label: string; options: { value: string; label: string }[] };
  showMontant?: boolean;
  onExport?: (kind: "web") => void;
  onExportCaisse?: () => void;
}) {
  const { t } = useI18n();
  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="surface mb-4 space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label className="mb-1 text-xs">{t("Recherche")}</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t(searchPlaceholder)}
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
            />
          </div>
        </div>

        <div className="w-32">
          <Label className="mb-1 text-xs">{t("Année")}</Label>
          <Select value={filters.annee} onValueChange={(v) => set({ annee: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Toutes")}</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-36">
          <Label className="mb-1 text-xs">{t("Mois")}</Label>
          <Select value={filters.mois} onValueChange={(v) => set({ mois: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Tous")}</SelectItem>
              {MOIS.map((m, i) => (
                <SelectItem key={m} value={m}>
                  {t(MOIS_LABELS[i]!)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {categories && (
          <div className="w-44">
            <Label className="mb-1 text-xs">{t("Catégorie")}</Label>
            <Select value={filters.categorie} onValueChange={(v) => set({ categorie: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Toutes")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {extra && (
          <div className="w-44">
            <Label className="mb-1 text-xs">{t(extra.label)}</Label>
            <Select value={filters.extra} onValueChange={(v) => set({ extra: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Tous")}</SelectItem>
                {extra.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {t(o.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="mb-1 text-xs">{t("Du")}</Label>
          <Input type="date" value={filters.du} onChange={(e) => set({ du: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1 text-xs">{t("Au")}</Label>
          <Input type="date" value={filters.au} onChange={(e) => set({ au: e.target.value })} />
        </div>
        {showMontant && (
          <>
            <div className="w-28">
              <Label className="mb-1 text-xs">{t("Montant min")}</Label>
              <Input
                type="number"
                value={filters.min}
                onChange={(e) => set({ min: e.target.value })}
              />
            </div>
            <div className="w-28">
              <Label className="mb-1 text-xs">{t("Montant max")}</Label>
              <Input
                type="number"
                value={filters.max}
                onChange={(e) => set({ max: e.target.value })}
              />
            </div>
          </>
        )}
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="size-4" /> {t("Réinitialiser")}
        </Button>
        {onExport && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button onClick={() => onExport("web")}>
              <Presentation className="size-4" /> {t("Rapport arabe (web)")}
            </Button>
            {onExportCaisse && (
              <Button variant="outline" onClick={onExportCaisse}>
                <Presentation className="size-4" /> {t("Rapport caisse quotidien")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
