import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import {
  useCategories,
  useDepenses,
  useRecettes,
  useActivites,
  useParametres,
  useRapportsDocuments,
  useSaveRow,
  useDeleteRow,
  uploadDocuments,
  deleteDocument,
  getDocumentUrl,
  LIEN_LONGUE_DUREE,
  resoudreDocuments,
  toPiecesJointes,
} from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatMontant, monthLabel } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ouvrirRapportWeb } from "@/lib/report-web";
import { TYPE_ACTIVITE_LABELS, STATUT_ACTIVITE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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


export const Route = createFileRoute("/_authenticated/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports financiers — Gestion d'association" },
      {
        name: "description",
        content:
          "Générez les bilans mensuels et annuels, les rapports par catégorie et par activité, exportables en PDF, Excel et CSV.",
      },
      { property: "og:title", content: "Rapports — Gestion d'association" },
      { property: "og:description", content: "Bilans financiers et rapports d'activités exportables." },
    ],
  }),
  component: RapportsPage,
});

function RapportsPage() {
  const { t: tr } = useI18n();
  const { data: recettes = [] } = useRecettes();
  const { data: depenses = [] } = useDepenses();
  const { data: categories = [] } = useCategories();
  const { data: activites = [] } = useActivites();
  const { data: params } = useParametres();
  const { data: rapportsDocs = [] } = useRapportsDocuments();
  const { canManageFinance } = useAuth();
  const saveDoc = useSaveRow("rapports_documents");
  const removeDoc = useDeleteRow("rapports_documents");
  const [uploading, setUploading] = useState(false);
  const devise = params?.devise ?? "DH";


  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));
  const [annee, setAnnee] = useState(years[0]!);
  const [mois, setMois] = useState("all");

  const inPeriod = (date: string) =>
    date.startsWith(annee) && (mois === "all" || date.slice(5, 7) === mois);

  const r = recettes.filter((x) => inPeriod(x.date));
  const d = depenses.filter((x) => inPeriod(x.date));
  const totalR = r.reduce((t, x) => t + Number(x.montant), 0);
  const totalD = d.reduce((t, x) => t + Number(x.montant), 0);

  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.nom ?? tr("Sans catégorie");

  // Chemins de stockage des justificatifs attachés à une liste d'opérations.
  const docsDesOperations = (ops: { pieces_jointes?: unknown; piece_jointe?: unknown; justificatif?: unknown }[]) =>
    ops.flatMap((o) => [
      ...toPiecesJointes(o.pieces_jointes),
      ...toPiecesJointes(o.piece_jointe),
      ...toPiecesJointes(o.justificatif),
    ]);

  const parMois = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => i)
        .filter((i) => mois === "all" || String(i + 1).padStart(2, "0") === mois)
        .map((i) => {
        const prefix = `${annee}-${String(i + 1).padStart(2, "0")}`;
        const recOps = recettes.filter((x) => x.date.startsWith(prefix));
        const depOps = depenses.filter((x) => x.date.startsWith(prefix));
        const rec = recOps.reduce((t, x) => t + Number(x.montant), 0);
        const dep = depOps.reduce((t, x) => t + Number(x.montant), 0);
        const docs = [
          ...docsDesOperations([...recOps, ...depOps]),
          ...rapportsDocs.filter((doc) => doc.periode === prefix).map((doc) => doc.chemin),
        ];
        return { mois: tr(monthLabel(i) ?? ""), Recettes: rec, Dépenses: dep, Solde: rec - dep, docs };
      }),
    [recettes, depenses, rapportsDocs, annee, mois],
  );

  const parCategorie = useMemo(() => {
    const map = new Map<string, { nom: string; type: string; total: number; nb: number; docs: string[] }>();
    [...r.map((x) => ({ ...x, type: tr("Recette") })), ...d.map((x) => ({ ...x, type: tr("Dépense") }))].forEach(
      (x) => {
        const key = `${x.type}-${x.categorie_id}`;
        const prev = map.get(key) ?? { nom: catName(x.categorie_id), type: x.type, total: 0, nb: 0, docs: [] };
        map.set(key, {
          ...prev,
          total: prev.total + Number(x.montant),
          nb: prev.nb + 1,
          docs: [...prev.docs, ...docsDesOperations([x])],
        });
      },
    );
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [r, d, categories]);



  const bilanColumns = [
    { header: tr("Mois"), key: "mois" },
    { header: tr("Recettes"), key: "recettes" },
    { header: tr("Dépenses"), key: "depenses" },
    { header: tr("Solde"), key: "solde" },
  ];
  const bilanRows = [
    ...parMois.map((m) => ({
      mois: m.mois,
      recettes: formatMontant(m.Recettes, devise),
      depenses: formatMontant(m["Dépenses"], devise),
      solde: formatMontant(m.Solde, devise),
      __docs: m.docs,
    })),
    {
      mois: tr("Total"),
      recettes: formatMontant(
        parMois.reduce((t, m) => t + m.Recettes, 0),
        devise,
      ),
      depenses: formatMontant(
        parMois.reduce((t, m) => t + m["Dépenses"], 0),
        devise,
      ),
      solde: formatMontant(
        parMois.reduce((t, m) => t + m.Solde, 0),
        devise,
      ),
      __docs: [] as string[],
    },
  ];

  const catColumns = [
    { header: tr("Type"), key: "type" },
    { header: tr("Catégorie"), key: "nom" },
    { header: tr("Opérations"), key: "nb" },
    { header: tr("Total"), key: "total" },
  ];
  const catRows = [
    ...parCategorie.map((c) => ({
      type: c.type,
      nom: c.nom,
      nb: c.nb,
      total: formatMontant(c.total, devise),
      __docs: c.docs,
    })),
    {
      type: tr("Total"),
      nom: "—",
      nb: parCategorie.reduce((t, c) => t + c.nb, 0),
      total: formatMontant(
        parCategorie.reduce((t, c) => t + c.total, 0),
        devise,
      ),
      __docs: [] as string[],
    },
  ];

  const activitesPeriode = activites.filter((a) => inPeriod(a.date));

  // Rapport complet : recettes en haut, dépenses en bas, tiret dans la colonne inverse
  const completLignes = useMemo(() => {
    const map = new Map<
      string,
      { ordre: number; type: string; nom: string; nb: number; rec: number; dep: number; docs: string[] }
    >();
    const add = (
      x: { categorie_id: string | null; montant: number },
      type: "recette" | "depense",
      docs: string[],
    ) => {
      const key = `${type}-${x.categorie_id}`;
      const prev =
        map.get(key) ??
        {
          ordre: type === "recette" ? 0 : 1,
          type: type === "recette" ? tr("Recette") : tr("Dépense"),
          nom: catName(x.categorie_id),
          nb: 0,
          rec: 0,
          dep: 0,
          docs: [] as string[],
        };
      map.set(key, {
        ...prev,
        nb: prev.nb + 1,
        rec: prev.rec + (type === "recette" ? Number(x.montant) : 0),
        dep: prev.dep + (type === "depense" ? Number(x.montant) : 0),
        docs: [...prev.docs, ...docs],
      });
    };
    r.forEach((x) => add(x, "recette", docsDesOperations([x])));
    d.forEach((x) => add(x, "depense", docsDesOperations([x])));
    return Array.from(map.values()).sort(
      (a, b) => a.ordre - b.ordre || b.rec + b.dep - (a.rec + a.dep),
    );
  }, [r, d, categories]);

  const completColumns = [
    { header: tr("Type"), key: "type" },
    { header: tr("Catégorie"), key: "nom" },
    { header: tr("Opérations"), key: "nb" },
    { header: tr("Recettes"), key: "rec" },
    { header: tr("Dépenses"), key: "dep" },
    { header: tr("Solde"), key: "solde" },
  ];

  const actColumns = [
    { header: tr("Activité"), key: "titre" },
    { header: tr("Type"), key: "type" },
    { header: tr("Date"), key: "date" },
    { header: tr("Budget prévu"), key: "prevu" },
    { header: tr("Dépensé"), key: "depense" },
    { header: tr("Participants"), key: "participants" },
    { header: tr("Statut"), key: "statut" },
  ];
  const actDepense = (id: string) =>
    depenses.filter((x) => x.activite_id === id).reduce((t, x) => t + Number(x.montant), 0);
  const actRows = [
    ...activitesPeriode.map((a) => ({
      titre: a.titre,
      type: tr(TYPE_ACTIVITE_LABELS[a.type_activite] ?? a.type_activite),
      date: formatDate(a.date),
      prevu: formatMontant(a.budget_prevu, devise),
      depense: formatMontant(actDepense(a.id), devise),
      participants: a.participants,
      statut: tr(STATUT_ACTIVITE_LABELS[a.statut] ?? a.statut),
      __docs: [
        ...toPiecesJointes(a.photos),
        ...toPiecesJointes(a.documents),
        ...docsDesOperations(depenses.filter((x) => x.activite_id === a.id)),
      ],
    })),
    {
      titre: tr("Total"),
      type: "—",
      date: "—",
      prevu: formatMontant(
        activitesPeriode.reduce((t, a) => t + Number(a.budget_prevu), 0),
        devise,
      ),
      depense: formatMontant(
        activitesPeriode.reduce((t, a) => t + actDepense(a.id), 0),
        devise,
      ),
      participants: activitesPeriode.reduce((t, a) => t + Number(a.participants), 0),
      statut: "—",
      __docs: [] as string[],
    },
  ];

  // Tous les documents des opérations et activités de la période (annexés au rapport complet).
  const tousDocsPeriode = [
    ...docsDesOperations([...r, ...d]),
    ...activitesPeriode.flatMap((a) => [
      ...toPiecesJointes(a.photos),
      ...toPiecesJointes(a.documents),
    ]),
  ];

  const completRows = [
    ...completLignes.map((c) => ({
      type: c.type,
      nom: c.nom,
      nb: c.nb,
      rec: c.ordre === 0 ? formatMontant(c.rec, devise) : "—",
      dep: c.ordre === 1 ? formatMontant(c.dep, devise) : "—",
      solde: formatMontant(c.rec - c.dep, devise),
      __docs: c.docs,
    })),
    {
      type: tr("Total"),
      nom: "—",
      nb: r.length + d.length,
      rec: formatMontant(totalR, devise),
      dep: formatMontant(totalD, devise),
      solde: formatMontant(totalR - totalD, devise),
      // Les justificatifs restent attachés aux lignes d'opérations, jamais au total.
      __docs: [] as string[],
    },
  ];

  const completExportColumns = completColumns.filter((column) => column.key !== "solde");

  const periodeLabel = `${annee}${mois === "all" ? "" : ` — ${tr("mois")} ${mois}`}`;
  const periodeKey = mois === "all" ? annee : `${annee}-${mois}`;
  // Vue annuelle : on regroupe les documents de tous les mois de l'année.
  const docsPeriode = rapportsDocs.filter((doc) =>
    mois === "all" ? doc.periode === annee || doc.periode.startsWith(`${annee}-`) : doc.periode === periodeKey,
  );

  const ExportButtons = ({
    name,
    titre,
    titreAr,
    columns,
    rows,
  }: {
    name: string;
    titre: string;
    titreAr: string;
    columns: { header: string; key: string }[];
    rows: Record<string, unknown>[];
  }) => (
    <div className="mb-3 flex flex-wrap gap-2">
      <Button
        onClick={async () => {
          const toastId = toast.loading(tr("Génération du rapport…"));
          const resoudre = (chemins: string[]) => resoudreDocuments(chemins, LIEN_LONGUE_DUREE);

          const cheminsRapport = await resoudre(docsPeriode.map((doc) => doc.chemin));
          const documentsRapport = cheminsRapport.map((d) => {
            const meta = docsPeriode.find((doc) => d.url.includes(encodeURI(doc.chemin)));
            return { url: d.url, nom: meta?.titre || meta?.nom_fichier || d.nom };
          });

          const lignes = [];
          for (const row of rows) {
            lignes.push({
              cellules: columns.map((c) => String(row[c.key] ?? "—")),
              documents: await resoudre((row["__docs"] as string[] | undefined) ?? []),
            });
          }
          const nbDocs =
            lignes.reduce((s, l) => s + l.documents.length, 0) + documentsRapport.length;

          ouvrirRapportWeb({
            titre: titreAr,
            sousTitre: periodeLabel,
            association:
              params?.nom_association ?? "جمعية الذهاب للماء الصالح للشرب والتنمية والتعاون",
            resume: [
              ["مجموع المداخيل", formatMontant(totalR, devise)],
              ["مجموع المصاريف", formatMontant(totalD, devise)],
              ["الرصيد", formatMontant(totalR - totalD, devise)],
              ["عدد الوثائق المرفقة", String(nbDocs)],
            ],
            entetes: columns.map((c) => c.header),
            lignes,
            documentsRapport,
          });
          toast.success(tr("Rapport généré"), { id: toastId });
        }}
      >
        <FileText className="size-4" /> {tr("Rapport arabe (web)")}
      </Button>
    </div>
  );


  const SimpleTable = ({
    columns,
    rows,
  }: {
    columns: { header: string; key: string }[];
    rows: Record<string, unknown>[];
  }) => (
    <div className="surface overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                {tr("Aucune donnée sur la période.")}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell key={c.key}>{String(row[c.key] ?? "")}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AppShell title="Rapports" description="Bilans financiers et rapports d'activités">
      <div className="surface mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="w-32">
          <Label className="mb-1 text-xs">{tr("Année")}</Label>
          <Select value={annee} onValueChange={setAnnee}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label className="mb-1 text-xs">{tr("Mois")}</Label>
          <Select value={mois} onValueChange={setMois}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tr("Toute l'année")}</SelectItem>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m, i) => (
                <SelectItem key={m} value={m}>
                  {tr(monthLabel(i) ?? "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto grid grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{tr("Recettes")}</p>
            <p className="font-semibold text-success">{formatMontant(totalR, devise)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{tr("Dépenses")}</p>
            <p className="font-semibold text-destructive">{formatMontant(totalD, devise)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{tr("Solde")}</p>
            <p className="font-semibold text-primary">{formatMontant(totalR - totalD, devise)}</p>
          </div>
        </div>
      </div>

      <div className="surface mb-4 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Paperclip className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">
            {tr("Documents du rapport")} — {periodeLabel}
          </h2>
          {canManageFinance && (
            <div className="ms-auto flex items-center gap-2">
              <Input
                type="file"
                multiple
                className="w-auto"
                disabled={uploading}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (!files.length) return;
                  setUploading(true);
                  try {
                    const paths = await uploadDocuments(files, `rapports/${periodeKey}`);
                    await Promise.all(
                      paths.map((chemin, i) =>
                        saveDoc.mutateAsync({
                          values: {
                            periode: periodeKey,
                            titre: files[i]!.name,
                            chemin,
                            nom_fichier: files[i]!.name,
                          },
                        }),
                      ),
                    );
                  } catch (err) {
                    toast.error((err as Error).message || tr("Une erreur est survenue"));
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <Upload className="size-4 text-muted-foreground" />
            </div>
          )}
        </div>
        {docsPeriode.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tr("Aucun document pour cette période.")}
          </p>
        ) : (
          <ul className="space-y-2">
            {docsPeriode.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                <Paperclip className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{doc.titre || doc.nom_fichier}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      window.open(await getDocumentUrl(doc.chemin), "_blank");
                    } catch {
                      toast.error(tr("Fichier introuvable"));
                    }
                  }}
                >
                  {tr("Voir")}
                </Button>
                {canManageFinance && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await removeDoc.mutateAsync(doc.id);
                      try {
                        await deleteDocument(doc.chemin);
                      } catch {
                        /* fichier déjà supprimé */
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>



      <Tabs defaultValue="complet">
        <TabsList className="mb-4">
          <TabsTrigger value="complet">{tr("Rapport complet")}</TabsTrigger>
          <TabsTrigger value="bilan">{tr("Bilan mensuel")}</TabsTrigger>
          <TabsTrigger value="categories">{tr("Par catégorie")}</TabsTrigger>
          <TabsTrigger value="activites">{tr("Activités")}</TabsTrigger>
        </TabsList>

        <TabsContent value="complet">
          <ExportButtons
            name={`rapport-complet-${periodeKey}`}
            titre={tr("Rapport complet")}
            titreAr="التقرير الشامل"
            columns={completColumns}
            rows={completRows}
          />
          <SimpleTable columns={completColumns} rows={completRows} />
        </TabsContent>


        <TabsContent value="bilan">
          <ExportButtons
            name={`bilan-${annee}`}
            titre={`${tr("Bilan financier")} ${annee}`}
            titreAr="الحصيلة المالية"
            columns={bilanColumns}
            rows={bilanRows}
          />
          <div className="surface mb-4 h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parMois}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mois" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatMontant(v, devise)} />
                <Legend />
                <Bar dataKey="Recettes" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Dépenses" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <SimpleTable columns={bilanColumns} rows={bilanRows} />
        </TabsContent>

        <TabsContent value="categories">
          <ExportButtons
            name={`categories-${annee}`}
            titre={tr("Rapport par catégorie")}
            titreAr="التقرير حسب الأصناف"
            columns={catColumns}
            rows={catRows}
          />
          <SimpleTable columns={catColumns} rows={catRows} />
        </TabsContent>

        <TabsContent value="activites">
          <ExportButtons
            name={`activites-${annee}`}
            titre={tr("Rapport des activités")}
            titreAr="تقرير الأنشطة"
            columns={actColumns}
            rows={actRows}
          />
          <SimpleTable columns={actColumns} rows={actRows} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
