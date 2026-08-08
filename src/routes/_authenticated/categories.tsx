import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import {
  useCategories,
  useRecettes,
  useDepenses,
  useSaveRow,
  useDeleteRow,
  useParametres,
  type Categorie,
} from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { formatMontant } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "Catégories — Gestion d'association" },
      {
        name: "description",
        content:
          "Créez et organisez les catégories de recettes et de dépenses de votre association avec un code couleur.",
      },
      { property: "og:title", content: "Catégories — Gestion d'association" },
      { property: "og:description", content: "Organisation des recettes et dépenses par catégorie." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { canManageFinance } = useAuth();
  const { t: tr } = useI18n();
  const { data: categories = [] } = useCategories();
  const { data: recettes = [] } = useRecettes();
  const { data: depenses = [] } = useDepenses();
  const { data: params } = useParametres();
  const devise = params?.devise ?? "DH";
  const save = useSaveRow("categories");
  const remove = useDeleteRow("categories");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categorie | null>(null);
  const [type, setType] = useState<"recette" | "depense">("recette");
  const [form, setForm] = useState({ nom: "", couleur: "#0E7C7B", description: "" });
  const [toDelete, setToDelete] = useState<Categorie | null>(null);

  const totalFor = (c: Categorie) => {
    const rows = c.type === "recette" ? recettes : depenses;
    return rows
      .filter((r) => r.categorie_id === c.id)
      .reduce((t, r) => t + Number(r.montant), 0);
  };
  const countFor = (c: Categorie) =>
    (c.type === "recette" ? recettes : depenses).filter((r) => r.categorie_id === c.id).length;

  const openNew = (t: "recette" | "depense") => {
    setEditing(null);
    setType(t);
    setForm({ nom: "", couleur: "#0E7C7B", description: "" });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nom.trim().length < 2) {
      toast.error(tr("Le nom est trop court"));
      return;
    }
    await save.mutateAsync({
      id: editing?.id,
      values: {
        nom: form.nom.trim().slice(0, 100),
        couleur: form.couleur,
        description: form.description.trim().slice(0, 500) || null,
        type: editing?.type ?? type,
      },
    });
    setOpen(false);
  };

  const list = (t: "recette" | "depense") => {
    const items = categories.filter((c) => c.type === t);
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">{tr("Aucune catégorie pour le moment.")}</p>
        )}
        {items.map((c) => (
          <div key={c.id} className="surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-4 shrink-0 rounded-full"
                  style={{ backgroundColor: c.couleur }}
                />
                <p className="font-medium">{c.nom}</p>
              </div>
              {canManageFinance && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(c);
                      setForm({
                        nom: c.nom,
                        couleur: c.couleur,
                        description: c.description ?? "",
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setToDelete(c)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
            {c.description && (
              <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
            )}
            <p className="mt-3 text-sm">
              <span className="font-semibold">{formatMontant(totalFor(c), devise)}</span>{" "}
              <span className="text-muted-foreground">· {countFor(c)} {tr("opération(s)")}</span>
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppShell title="Catégories" description="Organisation des recettes et des dépenses">
      <Tabs defaultValue="recette">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="recette">{tr("Recettes")}</TabsTrigger>
            <TabsTrigger value="depense">{tr("Dépenses")}</TabsTrigger>
          </TabsList>
          {canManageFinance && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => openNew("recette")}>
                <Plus className="size-4" /> {tr("Catégorie de recette")}
              </Button>
              <Button variant="outline" onClick={() => openNew("depense")}>
                <Plus className="size-4" /> {tr("Catégorie de dépense")}
              </Button>
            </div>
          )}
        </div>
        <TabsContent value="recette">{list("recette")}</TabsContent>
        <TabsContent value="depense">{list("depense")}</TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? tr("Modifier la catégorie") : tr("Nouvelle catégorie")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>{tr("Nom")}</Label>
              <Input
                value={form.nom}
                maxLength={100}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>{tr("Couleur")}</Label>
              <Input
                type="color"
                className="h-10 w-24 p-1"
                value={form.couleur}
                onChange={(e) => setForm({ ...form, couleur: e.target.value })}
              />
            </div>
            <div>
              <Label>{tr("Description")}</Label>
              <Textarea
                value={form.description}
                maxLength={500}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tr("Annuler")}
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {tr("Enregistrer")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tr("Supprimer")} « {toDelete?.nom} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tr("Les opérations liées ne seront pas supprimées mais perdront leur catégorie.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Annuler")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) remove.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              {tr("Supprimer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
