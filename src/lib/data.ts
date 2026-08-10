import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Categorie = {
  id: string;
  nom: string;
  type: "recette" | "depense";
  couleur: string;
  description: string | null;
};

export type Recette = {
  id: string;
  numero: number;
  date: string;
  categorie_id: string | null;
  source: string;
  montant: number;
  moyen_paiement: string;
  numero_facture: string;
  description: string | null;
  piece_jointe: string | null;
  pieces_jointes: string[];
  created_by: string | null;
  created_at: string;
};

export type Depense = {
  id: string;
  numero: number;
  date: string;
  categorie_id: string | null;
  fournisseur: string;
  montant: number;
  moyen_paiement: string;
  numero_cheque: string;
  description: string | null;
  justificatif: string | null;
  pieces_jointes: string[];
  caisse_id: string | null;
  activite_id: string | null;
  created_by: string | null;
  created_at: string;
};


export type Travailleur = {
  id: string;
  nom_complet: string;
  cin: string;
  telephone: string | null;
  adresse: string | null;
  fonction: string;
  banque: string | null;
  rib: string | null;
  salaire: number;
  type_contrat: string;
  date_embauche: string;
  statut: string;
  observations: string | null;
  created_at: string;
};

export type Salaire = {
  id: string;
  travailleur_id: string;
  periode: string;
  montant: number;
  date_paiement: string;
  mode: string;
  depense_id: string | null;
};


export type Caisse = {
  id: string;
  numero: number;
  date: string;
  montant_initial: number;
  heure_ouverture: string;
  heure_fermeture: string | null;
  responsable_id: string | null;
  observation: string | null;
  statut: "ouverte" | "cloturee";
};

export type Activite = {
  id: string;
  numero: number;
  titre: string;
  type_activite: string;
  date: string;
  heure: string | null;
  lieu: string | null;
  responsable_nom: string | null;
  budget_prevu: number;
  budget_depense: number;
  participants: number;
  description: string | null;
  photos: string[];
  documents: string[];
  statut: "prevue" | "en_cours" | "terminee" | "annulee";
};

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("nom");
      if (error) throw error;
      return (data ?? []) as unknown as Categorie[];
    },
  });
}

export function useRecettes() {
  return useQuery({
    queryKey: ["recettes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recettes")
        .select("*")
        .order("date", { ascending: false })
        .order("numero", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Recette[];
    },
  });
}

export function useDepenses() {
  return useQuery({
    queryKey: ["depenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("depenses")
        .select("*")
        .order("date", { ascending: false })
        .order("numero", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Depense[];
    },
  });
}

export function useCaisses() {
  return useQuery({
    queryKey: ["caisses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caisses")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Caisse[];
    },
  });
}

export function useActivites() {
  return useQuery({
    queryKey: ["activites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activites")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Activite[];
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, telephone, avatar_url, created_at")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useParametres() {
  return useQuery({
    queryKey: ["parametres"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parametres").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTravailleurs() {
  return useQuery({
    queryKey: ["travailleurs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travailleurs")
        .select("*")
        .order("nom_complet");
      if (error) throw error;
      return (data ?? []) as unknown as Travailleur[];
    },
  });
}

export function useSalaires() {
  return useQuery({
    queryKey: ["salaires"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salaires")
        .select("*")
        .order("date_paiement", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Salaire[];
    },
  });
}

export type RapportDocument = {
  id: string;
  periode: string;
  titre: string;
  chemin: string;
  nom_fichier: string;
  created_at: string;
};

export function useRapportsDocuments() {
  return useQuery({
    queryKey: ["rapports_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rapports_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RapportDocument[];
    },
  });
}

type TableName =
  | "recettes"
  | "depenses"
  | "categories"
  | "caisses"
  | "activites"
  | "travailleurs"
  | "salaires"
  | "rapports_documents";



export function useSaveRow(table: TableName, invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: Record<string, unknown> }) => {
      if (id) {
        const { error } = await supabase
          .from(table)
          .update(values as never)
          .eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from(table)
        .insert(values as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      [table, ...invalidate, "stats"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Enregistré avec succès");
    },
    onError: (e: Error) => toast.error(e.message || "Une erreur est survenue"),
  });
}

export function useDeleteRow(table: TableName, invalidate: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      [table, ...invalidate, "stats"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success("Supprimé");
    },
    onError: (e: Error) => toast.error(e.message || "Suppression impossible"),
  });
}

export async function uploadDocument(file: File, dossier: string) {
  const ext = file.name.split(".").pop();
  const path = `${dossier}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, file);
  if (error) throw error;
  return path;
}

export async function deleteDocument(path: string) {
  const { error } = await supabase.storage.from("documents").remove([path]);
  if (error) throw error;
}

/** Durée longue par défaut pour les liens inclus dans les PDF téléchargés. */
export const LIEN_LONGUE_DUREE = 60 * 60 * 24 * 365;

export async function getDocumentUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}


export async function uploadDocuments(files: File[], dossier: string) {
  return Promise.all(files.map((f) => uploadDocument(f, dossier)));
}

export function toPiecesJointes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value) return [value];
  return [];
}

/**
 * Vérifie réellement l'existence d'un fichier : une URL signée est créée même
 * pour un chemin inexistant, on teste donc la ressource elle-même.
 * (Des opérations importées peuvent référencer un justificatif jamais téléversé.)
 */
const cacheFichiers = new Map<string, Promise<string | null>>();

function resoudreChemin(chemin: string, expiresIn?: number) {
  const cle = `${chemin}|${expiresIn ?? ""}`;
  if (!cacheFichiers.has(cle)) {
    cacheFichiers.set(
      cle,
      (async () => {
        // Un chemin valide ressemble toujours à "dossier/fichier.ext".
        if (!/^[^/]+\/.+\.[A-Za-z0-9]{1,6}$/.test(chemin)) return null;
        try {
          const url = await getDocumentUrl(chemin, expiresIn);
          const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
          return res.ok || res.status === 206 ? url : null;
        } catch {
          return null;
        }
      })(),
    );
  }
  return cacheFichiers.get(cle)!;
}

export async function filtrerDocumentsExistants(chemins: string[]): Promise<string[]> {
  const uniques = Array.from(new Set(chemins.filter(Boolean)));
  const resultats = await Promise.all(
    uniques.map(async (chemin) => ((await resoudreChemin(chemin)) ? chemin : null)),
  );
  return resultats.filter((c): c is string => c !== null);
}

/** Résout une liste de chemins en documents (url signée + nom), en ignorant les fichiers absents. */
export async function resoudreDocuments(
  chemins: string[],
  expiresIn?: number,
): Promise<{ url: string; nom: string }[]> {
  const uniques = Array.from(new Set(chemins.filter(Boolean)));
  const resultats = await Promise.all(
    uniques.map(async (chemin) => {
      const url = await resoudreChemin(chemin, expiresIn);
      return url ? { url, nom: chemin.split("/").pop() ?? chemin } : null;
    }),
  );
  return resultats.filter((d): d is { url: string; nom: string } => d !== null);
}
