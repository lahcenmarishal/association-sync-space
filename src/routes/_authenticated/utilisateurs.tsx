import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfiles } from "@/lib/data";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { createStaffAccount, deleteStaffAccount } from "@/lib/staff";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type AppRole } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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


export const Route = createFileRoute("/_authenticated/utilisateurs")({
  head: () => ({
    meta: [
      { title: "Utilisateurs et rôles — Gestion d'association" },
      {
        name: "description",
        content:
          "Gérez les membres de l'association et attribuez les rôles : administrateur, trésorier, secrétaire.",
      },
      { property: "og:title", content: "Utilisateurs — Gestion d'association" },
      { property: "og:description", content: "Gestion des accès et des rôles." },
    ],
  }),
  component: UtilisateursPage,
});

function UtilisateursPage() {
  const { isAdmin, user } = useAuth();
  const { t: tr } = useI18n();
  const { data: profiles = [], isLoading } = useProfiles();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ id: string; nom: string } | null>(null);
  const [selected, setSelected] = useState<AppRole[]>([]);

  const { data: allRoles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data ?? []) as { user_id: string; role: AppRole }[];
    },
  });

  const rolesOf = (id: string) => {
    const list = allRoles.filter((r) => r.user_id === id).map((r) => r.role);
    // la secrétaire reste le rôle principal même si l'accès finances est activé
    return list.includes("secretaire")
      ? (["secretaire", ...list.filter((r) => r !== "secretaire")] as AppRole[])
      : list;
  };

  const saveRoles = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      if (roles.length) {
        const { error } = await supabase
          .from("user_roles")
          .insert(roles.map((role) => ({ user_id: userId, role })) as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-roles"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
      toast.success(tr("Rôles mis à jour"));
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || tr("Modification impossible")),
  });

  const emptyForm = {
    email: "",
    password: "",
    fullName: "",
    telephone: "",
    role: "secretaire" as "secretaire" | "tresorier" | "membre",
  };
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const createAccount = useMutation({
    mutationFn: async () =>
      createStaffAccount({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        telephone: form.telephone.trim() || undefined,
        role: form.role,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["all-roles"] });
      toast.success(tr("Compte créé"));
      setCreating(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message || tr("Création impossible")),
  });

  const removeAccount = useMutation({
    mutationFn: async (userId: string) => deleteStaffAccount(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["all-roles"] });
      toast.success(tr("Compte supprimé"));
    },
    onError: (e: Error) => toast.error(e.message || tr("Suppression impossible")),
  });

  if (!isAdmin) {
    return (
      <AppShell title="Utilisateurs" description="Accès réservé">
        <div className="surface p-8 text-center text-sm text-muted-foreground">
          {tr("Seul un administrateur peut gérer les utilisateurs et les rôles.")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Utilisateurs" description={`${profiles.length} ${tr("membre(s) enregistré(s)")}`}>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>{tr("Nouveau compte")}</Button>
      </div>
      <div className="surface mb-4 grid gap-2 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r}>
            <p className="font-medium">{tr(ROLE_LABELS[r])}</p>
            <p className="text-xs text-muted-foreground">{tr(ROLE_DESCRIPTIONS[r])}</p>
          </div>
        ))}
      </div>


      <div className="surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tr("Nom")}</TableHead>
              <TableHead>{tr("E-mail")}</TableHead>
              <TableHead>{tr("Téléphone")}</TableHead>
              <TableHead>{tr("Rôles")}</TableHead>
              <TableHead>{tr("Inscription")}</TableHead>
              <TableHead className="text-right">{tr("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {tr("Chargement…")}
                </TableCell>
              </TableRow>
            )}
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.full_name}
                  {p.id === user?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">{tr("(vous)")}</span>
                  )}
                </TableCell>
                <TableCell>{p.email ?? "—"}</TableCell>
                <TableCell>{p.telephone ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {rolesOf(p.id).length === 0 && (
                      <span className="text-xs text-muted-foreground">{tr("Aucun rôle")}</span>
                    )}
                    {rolesOf(p.id).map((r) => (
                      <Badge key={r} variant="secondary">
                        {tr(ROLE_LABELS[r])}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatDate(p.created_at)}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing({ id: p.id, nom: p.full_name });
                      setSelected(rolesOf(p.id));
                    }}
                  >
                    {tr("Modifier les rôles")}
                  </Button>
                  {p.id !== user?.id && !rolesOf(p.id).includes("admin") && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={removeAccount.isPending}
                      onClick={() => {
                        if (confirm(`${tr("Supprimer définitivement le compte de")} ${p.full_name} ?`))
                          removeAccount.mutate(p.id);
                      }}
                    >
                      {tr("Supprimer")}
                    </Button>
                  )}
                </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tr("Profil de")} {editing?.nom}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {tr("Un seul profil par membre. Décochez pour retirer tout accès.")}
            </p>
            {ROLES.map((r) => (
              <label key={r} className="flex items-start gap-3">
                <Checkbox
                  checked={selected[0] === r}
                  onCheckedChange={(v) => setSelected(v ? [r] : [])}
                />
                <span>
                  <span className="block text-sm font-medium">{tr(ROLE_LABELS[r])}</span>
                  <span className="block text-xs text-muted-foreground">
                    {tr(ROLE_DESCRIPTIONS[r])}
                  </span>
                </span>
              </label>
            ))}
            {selected[0] === "secretaire" && (
              <label className="flex items-start gap-3 rounded-lg border border-dashed p-3">
                <Checkbox
                  checked={selected.includes("tresorier")}
                  onCheckedChange={(v) =>
                    setSelected(v ? ["secretaire", "tresorier"] : ["secretaire"])
                  }
                />
                <span>
                  <span className="block text-sm font-medium">
                    {tr("Autoriser la gestion des finances")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {tr("Permet à cette secrétaire de gérer les recettes, dépenses, la caisse et les catégories.")}
                  </span>
                </span>
              </label>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {tr("Annuler")}
            </Button>
            <Button
              disabled={saveRoles.isPending}
              onClick={() => editing && saveRoles.mutate({ userId: editing.id, roles: selected })}
            >
              {tr("Enregistrer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={(o) => !o && setCreating(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("Nouveau compte")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {tr("L'administrateur crée les comptes secrétaire et trésorier. Le membre se connecte ensuite avec l'e-mail et le mot de passe définis ici.")}
            </p>
            <div>
              <Label htmlFor="nom">{tr("Nom complet")}</Label>
              <Input
                id="nom"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="mail">{tr("E-mail")}</Label>
              <Input
                id="mail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="tel">{tr("Téléphone")}</Label>
              <Input
                id="tel"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="mdp">{tr("Mot de passe (8 caractères min.)")}</Label>
              <Input
                id="mdp"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <Label>{tr("Rôle")}</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm({ ...form, role: v as "secretaire" | "tresorier" | "membre" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="secretaire">{tr(ROLE_LABELS.secretaire)}</SelectItem>
                  <SelectItem value="tresorier">{tr(ROLE_LABELS.tresorier)}</SelectItem>
                  <SelectItem value="membre">{tr(ROLE_LABELS.membre)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              {tr("Annuler")}
            </Button>
            <Button
              disabled={createAccount.isPending}
              onClick={() => createAccount.mutate()}
            >
              {tr("Créer le compte")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>

  );
}
