import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Paperclip, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { useActivites, useDepenses, useRecettes, getDocumentUrl } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Gestion d'association" },
      {
        name: "description",
        content:
          "Retrouvez tous les reçus, factures, justificatifs et photos d'activités archivés par l'association.",
      },
      { property: "og:title", content: "Documents — Gestion d'association" },
      { property: "og:description", content: "Archive centralisée des pièces justificatives." },
    ],
  }),
  component: DocumentsPage,
});

type Doc = { path: string; type: string; libelle: string; date: string };

function DocumentsPage() {
  const { t: tr } = useI18n();
  const { data: recettes = [] } = useRecettes();
  const { data: depenses = [] } = useDepenses();
  const { data: activites = [] } = useActivites();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const docs = useMemo<Doc[]>(() => {
    const list: Doc[] = [];
    recettes.forEach((r) => {
      if (r.piece_jointe)
        list.push({
          path: r.piece_jointe,
          type: "Reçu de recette",
          libelle: `#${r.numero} · ${r.source}`,
          date: r.date,
        });
    });
    depenses.forEach((d) => {
      if (d.justificatif)
        list.push({
          path: d.justificatif,
          type: "Justificatif de dépense",
          libelle: `#${d.numero} · ${d.fournisseur}`,
          date: d.date,
        });
    });
    activites.forEach((a) => {
      (a.photos ?? []).forEach((p) =>
        list.push({ path: p, type: "Photo d'activité", libelle: a.titre, date: a.date }),
      );
      (a.documents ?? []).forEach((p) =>
        list.push({ path: p, type: "Document d'activité", libelle: a.titre, date: a.date }),
      );
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [recettes, depenses, activites]);

  const filtered = docs.filter(
    (d) =>
      (type === "all" || d.type === type) &&
      (!q || d.libelle.toLowerCase().includes(q.toLowerCase())),
  );

  const openDoc = async (path: string) => {
    try {
      window.open(await getDocumentUrl(path), "_blank");
    } catch {
      toast.error(tr("Fichier introuvable"));
    }
  };

  const types = Array.from(new Set(docs.map((d) => d.type)));

  return (
    <AppShell title="Documents" description={`${filtered.length} ${tr("fichier(s) archivé(s)")}`}>
      <div className="surface mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[220px] flex-1">
          <Label className="mb-1 text-xs">{tr("Recherche")}</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={tr("Nom de l'opération ou de l'activité…")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="w-56">
          <Label className="mb-1 text-xs">{tr("Type de document")}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tr("Tous")}</SelectItem>
              {types.map((ty) => (
                <SelectItem key={ty} value={ty}>
                  {tr(ty)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr("Type")}</TableHead>
              <TableHead>{tr("Référence")}</TableHead>
              <TableHead>{tr("Date")}</TableHead>
              <TableHead className="text-right">{tr("Ouvrir")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {tr("Aucun document archivé.")}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((d) => (
              <TableRow key={d.path}>
                <TableCell className="flex items-center gap-2">
                  <Paperclip className="size-4 text-muted-foreground" />
                  {tr(d.type)}
                </TableCell>
                <TableCell className="max-w-[260px] truncate">{d.libelle}</TableCell>
                <TableCell>{formatDate(d.date)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openDoc(d.path)}>
                    <Download className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
