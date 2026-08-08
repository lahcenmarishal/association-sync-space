import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Tags,
  CalendarDays,
  CalendarRange,
  FileBarChart,
  FolderOpen,
  Users,
  HardHat,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParametres } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ROLE_LABELS, type AppRole } from "@/lib/constants";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NAV = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/recettes", label: "Recettes", icon: TrendingUp },
  { to: "/depenses", label: "Dépenses", icon: TrendingDown },
  { to: "/caisse", label: "Caisse quotidienne", icon: Wallet },
  { to: "/categories", label: "Catégories", icon: Tags },
  { to: "/activites", label: "Activités", icon: CalendarDays },
  { to: "/calendrier", label: "Calendrier", icon: CalendarRange },
  { to: "/rapports", label: "Rapports", icon: FileBarChart },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/travailleurs", label: "Travailleurs", icon: HardHat, adminOnly: true },
  { to: "/utilisateurs", label: "Utilisateurs", icon: Users, adminOnly: true },
  { to: "/parametres", label: "Paramètres", icon: Settings, adminOnly: true },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { displayName, roles, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const { data: params } = useParametres();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const items = NAV.filter((n) => !("adminOnly" in n && n.adminOnly) || isAdmin);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {items.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(item.label)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-display text-sm font-bold">
            {(params?.nom_association ?? "A").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-sidebar-foreground">
              {params?.nom_association ?? t("Association")}
            </p>
            <p className="text-xs text-sidebar-foreground/60">{t("Gestion & finances")}</p>
          </div>
        </div>
        {nav}
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {roles.map((r) => t(ROLE_LABELS[r as AppRole] ?? r)).join("، ") || "—"}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" /> {t("Déconnexion")}
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="relative flex w-64 flex-col bg-sidebar">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
              <p className="font-display font-semibold text-sidebar-foreground">
                {params?.nom_association ?? t("Association")}
              </p>
              <button onClick={() => setOpen(false)} aria-label={t("Fermer le menu")}>
                <X className="size-5 text-sidebar-foreground" />
              </button>
            </div>
            {nav}
            <div className="border-t border-sidebar-border p-3">
              <button
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth", replace: true });
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75"
              >
                <LogOut className="size-4" /> {t("Déconnexion")}
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label={t("Ouvrir le menu")}
          >
            <Menu className="size-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold md:text-xl">{t(title)}</h1>
            {description && (
              <p className="truncate text-xs text-muted-foreground md:text-sm">{t(description)}</p>
            )}
          </div>
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {actions}
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
