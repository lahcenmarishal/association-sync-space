import { supabase } from "@/integrations/supabase/client";

type CreateStaffInput = {
  email: string;
  password: string;
  fullName: string;
  telephone?: string | undefined;
  role: "secretaire" | "tresorier" | "membre";
};

async function callManageStaff<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-staff", { body });
  if (error) {
    const ctxMessage = await (async () => {
      try {
        const res = (error as unknown as { context?: Response }).context;
        if (res) return ((await res.clone().json()) as { error?: string }).error;
      } catch {
        /* ignore */
      }
      return undefined;
    })();
    throw new Error(ctxMessage || error.message);
  }
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as T;
}

export const createStaffAccount = (input: CreateStaffInput) =>
  callManageStaff<{ id: string }>({ action: "create", ...input });

export const deleteStaffAccount = (userId: string) =>
  callManageStaff<{ ok: true }>({ action: "delete", userId });
