import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    // Client agissant comme l'appelant : vérifie l'identité et le rôle
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Non authentifié" }, 401);
    const callerId = userData.user.id;

    const { data: isAdmin, error: roleErr } = await caller.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Action réservée à l'administrateur" }, 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Requête invalide" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const action = (body as { action?: string }).action;

    if (action === "create") {
      const { email, password, fullName, telephone, role } = body as Record<string, string>;
      const mail = (email ?? "").trim().toLowerCase();
      const name = (fullName ?? "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return json({ error: "E-mail invalide" }, 400);
      if (!password || password.length < 8 || password.length > 72)
        return json({ error: "Mot de passe : 8 caractères minimum" }, 400);
      if (!name || name.length > 120) return json({ error: "Nom complet requis" }, 400);
      if (!["secretaire", "tresorier", "membre"].includes(role)) return json({ error: "Rôle invalide" }, 400);

      const { data: created, error } = await admin.auth.admin.createUser({
        email: mail,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
      if (error || !created.user) return json({ error: error?.message ?? "Création impossible" }, 400);

      const newId = created.user.id;
      await admin.from("profiles").upsert({
        id: newId,
        full_name: name,
        email: mail,
        telephone: telephone?.trim() || null,
      });
      await admin.from("user_roles").delete().eq("user_id", newId);
      const { error: insErr } = await admin.from("user_roles").insert({ user_id: newId, role });
      if (insErr) return json({ error: insErr.message }, 400);

      return json({ id: newId });
    }

    if (action === "delete") {
      const userId = (body as { userId?: string }).userId ?? "";
      if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "Identifiant invalide" }, 400);
      if (userId === callerId)
        return json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, 400);

      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
      if ((roles ?? []).some((r: { role: string }) => r.role === "admin"))
        return json({ error: "Un compte administrateur ne peut pas être supprimé ici" }, 400);

      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur inattendue" }, 500);
  }
});
