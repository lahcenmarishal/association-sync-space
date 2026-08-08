import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Association EDDAHAB" },
      {
        name: "description",
        content:
          "Connectez-vous à l'espace de gestion de l'association EDDAHAB de distribution d'eau potable.",
      },
      { property: "og:title", content: "Connexion — Association EDDAHAB" },
      { property: "og:description", content: "Accès sécurisé à l'espace de gestion EDDAHAB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Adresse e-mail invalide").max(255);

function AuthPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(t("Adresse e-mail invalide"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(t("Identifiants incorrects"));
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-center">
          <LanguageSwitcher />
        </div>
        <Link to="/" className="mb-6 block text-center font-display text-xl font-semibold">
          {t("Gestion d'association")}
        </Link>
        <div className="surface p-6">
          <h1 className="mb-4 font-display text-lg font-semibold">{t("Connexion")}</h1>

          <form onSubmit={signIn} className="space-y-3">
            <div>
              <Label htmlFor="email">{t("E-mail")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t("Mot de passe")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {t("Se connecter")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
