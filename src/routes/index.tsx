import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Wallet,
  CalendarDays,
  Droplets,
  HandHeart,
  Users,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";

const logoEddahab = "/logo-eddahab.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Association Eddahab — Eau potable, développement et coopération" },
      {
        name: "description",
        content:
          "Association Eddahab pour l'eau potable, le développement et la coopération : gestion des abonnés, du réseau de distribution, de la caisse quotidienne, des travailleurs et des activités.",
      },
      {
        property: "og:title",
        content: "Association Eddahab — Eau potable, développement et coopération",
      },
      {
        property: "og:description",
        content:
          "Cotisations des abonnés, entretien du réseau, caisse quotidienne, salaires et rapports détaillés en arabe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const MISSIONS = [
  {
    icon: Droplets,
    titre: "Eau potable pour tous",
    texte: "Distribution de l'eau potable à travers les réseaux et suivi des abonnés.",
  },
  {
    icon: Wrench,
    titre: "Entretien du réseau",
    texte: "Pompage, conduites, compteurs et analyses de qualité de l'eau.",
  },
  {
    icon: HandHeart,
    titre: "Développement local",
    texte: "Projets solidaires, sensibilisation et amélioration des services de la commune.",
  },
  {
    icon: Users,
    titre: "Coopération",
    texte: "Partenariats avec les communes, les associations et les bailleurs de fonds.",
  },
];

const FEATURES = [
  {
    icon: Wallet,
    titre: "Finances complètes",
    texte: "Recettes, dépenses et solde calculé automatiquement.",
  },
  {
    icon: BarChart3,
    titre: "Rapports en arabe",
    texte: "Exposés PPTX détaillés, PDF et Excel avec le logo de l'association.",
  },
  {
    icon: CalendarDays,
    titre: "Activités & travailleurs",
    texte: "Planning des activités et gestion des salaires des employés.",
  },
  {
    icon: ShieldCheck,
    titre: "Sécurité par rôles",
    texte: "Administrateur, trésorier, secrétaire et membre en lecture seule.",
  },
];

function Landing() {
  const { session } = useAuth();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5">
        <div className="flex items-center gap-3">
          <img
            src={logoEddahab}
            alt={t("Logo de l'Association Eddahab pour l'eau potable")}
            className="size-12 shrink-0 object-contain"
            width={48}
            height={48}
          />
          <span className="font-display text-sm font-semibold leading-tight sm:text-base">
            {t("Association Eddahab")}
            <span className="block text-xs font-normal text-muted-foreground">
              {t("Eau potable · Développement · Coopération")}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button asChild>
            <Link to={session ? "/dashboard" : "/auth"}>
              {session ? t("Tableau de bord") : t("Se connecter")}
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1.4fr_1fr] md:py-20">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              {t("جمعية الذهب للماء الصالح للشرب والتنمية والتعاون")}
            </p>
            <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight md:text-5xl">
              {t("L'eau potable, le développement et la coopération au service des habitants.")}
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              {t(
                "L'Association Eddahab gère la distribution de l'eau potable à travers les réseaux, l'entretien des installations, les cotisations des abonnés, la caisse quotidienne, les travailleurs et les activités de développement.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to={session ? "/dashboard" : "/auth"}>
                  {t("Accéder à l'application")} <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <img
            src={logoEddahab}
            alt={t("Sceau officiel de l'Association Eddahab")}
            className="mx-auto w-56 max-w-full object-contain md:w-full"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MISSIONS.map((m) => (
            <div key={m.titre} className="surface p-5">
              <m.icon className="size-6 text-primary" />
              <h2 className="mt-3 font-display text-base font-semibold">{t(m.titre)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t(m.texte)}</p>
            </div>
          ))}
        </section>

        <section className="mt-12">
          <h2 className="mb-4 font-display text-2xl font-semibold">
            {t("Un outil de gestion complet")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.titre} className="surface p-5">
                <f.icon className="size-6 text-primary" />
                <h3 className="mt-3 font-display text-base font-semibold">{t(f.titre)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(f.texte)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
