export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activites: {
        Row: {
          budget_depense: number
          budget_prevu: number
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          documents: Json
          heure: string | null
          id: string
          lieu: string | null
          numero: number
          participants: number
          photos: Json
          responsable_id: string | null
          responsable_nom: string | null
          statut: Database["public"]["Enums"]["activite_statut"]
          titre: string
          type_activite: string
          updated_at: string
        }
        Insert: {
          budget_depense?: number
          budget_prevu?: number
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          documents?: Json
          heure?: string | null
          id?: string
          lieu?: string | null
          numero?: never
          participants?: number
          photos?: Json
          responsable_id?: string | null
          responsable_nom?: string | null
          statut?: Database["public"]["Enums"]["activite_statut"]
          titre: string
          type_activite?: string
          updated_at?: string
        }
        Update: {
          budget_depense?: number
          budget_prevu?: number
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          documents?: Json
          heure?: string | null
          id?: string
          lieu?: string | null
          numero?: never
          participants?: number
          photos?: Json
          responsable_id?: string | null
          responsable_nom?: string | null
          statut?: Database["public"]["Enums"]["activite_statut"]
          titre?: string
          type_activite?: string
          updated_at?: string
        }
        Relationships: []
      }
      caisses: {
        Row: {
          created_at: string
          date: string
          heure_fermeture: string | null
          heure_ouverture: string
          id: string
          montant_initial: number
          numero: number
          observation: string | null
          responsable_id: string | null
          statut: Database["public"]["Enums"]["caisse_statut"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          heure_fermeture?: string | null
          heure_ouverture?: string
          id?: string
          montant_initial?: number
          numero?: never
          observation?: string | null
          responsable_id?: string | null
          statut?: Database["public"]["Enums"]["caisse_statut"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          heure_fermeture?: string | null
          heure_ouverture?: string
          id?: string
          montant_initial?: number
          numero?: never
          observation?: string | null
          responsable_id?: string | null
          statut?: Database["public"]["Enums"]["caisse_statut"]
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          couleur: string
          created_at: string
          description: string | null
          id: string
          nom: string
          type: Database["public"]["Enums"]["categorie_type"]
          updated_at: string
        }
        Insert: {
          couleur?: string
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          type: Database["public"]["Enums"]["categorie_type"]
          updated_at?: string
        }
        Update: {
          couleur?: string
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          type?: Database["public"]["Enums"]["categorie_type"]
          updated_at?: string
        }
        Relationships: []
      }
      depenses: {
        Row: {
          activite_id: string | null
          caisse_id: string | null
          categorie_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          fournisseur: string
          id: string
          justificatif: string | null
          montant: number
          moyen_paiement: string
          numero: number
          pieces_jointes: Json
          updated_at: string
        }
        Insert: {
          activite_id?: string | null
          caisse_id?: string | null
          categorie_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          fournisseur?: string
          id?: string
          justificatif?: string | null
          montant: number
          moyen_paiement?: string
          numero?: never
          pieces_jointes?: Json
          updated_at?: string
        }
        Update: {
          activite_id?: string | null
          caisse_id?: string | null
          categorie_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          fournisseur?: string
          id?: string
          justificatif?: string | null
          montant?: number
          moyen_paiement?: string
          numero?: never
          pieces_jointes?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_activite_id_fkey"
            columns: ["activite_id"]
            isOneToOne: false
            referencedRelation: "activites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_caisse_id_fkey"
            columns: ["caisse_id"]
            isOneToOne: false
            referencedRelation: "caisses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "depenses_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      parametres: {
        Row: {
          adresse: string | null
          devise: string
          email: string | null
          format_date: string
          id: string
          logo_url: string | null
          nom_association: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          devise?: string
          email?: string | null
          format_date?: string
          id?: string
          logo_url?: string | null
          nom_association?: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          devise?: string
          email?: string | null
          format_date?: string
          id?: string
          logo_url?: string | null
          nom_association?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rapports_documents: {
        Row: {
          chemin: string
          created_at: string
          created_by: string | null
          id: string
          nom_fichier: string
          periode: string
          titre: string
        }
        Insert: {
          chemin: string
          created_at?: string
          created_by?: string | null
          id?: string
          nom_fichier: string
          periode: string
          titre?: string
        }
        Update: {
          chemin?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nom_fichier?: string
          periode?: string
          titre?: string
        }
        Relationships: []
      }
      recettes: {
        Row: {
          categorie_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          montant: number
          moyen_paiement: string
          numero: number
          piece_jointe: string | null
          pieces_jointes: Json
          source: string
          updated_at: string
        }
        Insert: {
          categorie_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          montant: number
          moyen_paiement?: string
          numero?: never
          piece_jointe?: string | null
          pieces_jointes?: Json
          source?: string
          updated_at?: string
        }
        Update: {
          categorie_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          montant?: number
          moyen_paiement?: string
          numero?: never
          piece_jointe?: string | null
          pieces_jointes?: Json
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recettes_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      salaires: {
        Row: {
          created_at: string
          date_paiement: string
          depense_id: string | null
          id: string
          mode: string
          montant: number
          periode: string
          travailleur_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string
          depense_id?: string | null
          id?: string
          mode?: string
          montant?: number
          periode: string
          travailleur_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string
          depense_id?: string | null
          id?: string
          mode?: string
          montant?: number
          periode?: string
          travailleur_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salaires_depense_id_fkey"
            columns: ["depense_id"]
            isOneToOne: false
            referencedRelation: "depenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salaires_travailleur_id_fkey"
            columns: ["travailleur_id"]
            isOneToOne: false
            referencedRelation: "travailleurs"
            referencedColumns: ["id"]
          },
        ]
      }
      travailleurs: {
        Row: {
          adresse: string | null
          banque: string | null
          cin: string
          created_at: string
          created_by: string | null
          date_embauche: string
          fonction: string
          id: string
          nom_complet: string
          observations: string | null
          rib: string | null
          salaire: number
          statut: string
          telephone: string | null
          type_contrat: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          banque?: string | null
          cin?: string
          created_at?: string
          created_by?: string | null
          date_embauche?: string
          fonction?: string
          id?: string
          nom_complet: string
          observations?: string | null
          rib?: string | null
          salaire?: number
          statut?: string
          telephone?: string | null
          type_contrat?: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          banque?: string | null
          cin?: string
          created_at?: string
          created_by?: string | null
          date_embauche?: string
          fonction?: string
          id?: string
          nom_complet?: string
          observations?: string | null
          rib?: string | null
          salaire?: number
          statut?: string
          telephone?: string | null
          type_contrat?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generer_salaires_permanents: { Args: never; Returns: number }
      generer_salaires_permanents_auto: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_activity_manager: { Args: { _user_id: string }; Returns: boolean }
      is_finance_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      activite_statut: "prevue" | "en_cours" | "terminee" | "annulee"
      app_role:
        | "admin"
        | "president"
        | "tresorier"
        | "secretaire"
        | "comptable"
        | "lecteur"
        | "membre"
      caisse_statut: "ouverte" | "cloturee"
      categorie_type: "recette" | "depense"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activite_statut: ["prevue", "en_cours", "terminee", "annulee"],
      app_role: [
        "admin",
        "president",
        "tresorier",
        "secretaire",
        "comptable",
        "lecteur",
        "membre",
      ],
      caisse_statut: ["ouverte", "cloturee"],
      categorie_type: ["recette", "depense"],
    },
  },
} as const
