import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDocumentUrl } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

type Props = {
  label: string;
  paths: string[];
  onRemovePath: (path: string) => void;
  files: File[];
  setFiles: (files: File[]) => void;
};

export function AttachmentsField({ label, paths, onRemovePath, files, setFiles }: Props) {
  const { t } = useI18n();

  return (
    <div>
      <Label>{t(label)}</Label>
      <div className="mb-2 space-y-2">
        {paths.map((p) => (
          <div key={p} className="flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm">
            <Paperclip className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{p.split("/").pop()}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  window.open(await getDocumentUrl(p), "_blank");
                } catch {
                  toast.error(t("Fichier introuvable"));
                }
              }}
            >
              {t("Voir")}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => onRemovePath(p)}>
              <X className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
        {files.map((f, i) => (
          <div
            key={`${f.name}-${i}`}
            className="flex items-center gap-2 rounded-lg border border-dashed p-2 text-sm"
          >
            <Paperclip className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFiles(files.filter((_, j) => j !== i))}
            >
              <X className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Input
        type="file"
        multiple
        onChange={(e) => {
          setFiles([...files, ...Array.from(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {t("Vous pouvez ajouter plusieurs fichiers (PDF, images).")}
      </p>
    </div>
  );
}
