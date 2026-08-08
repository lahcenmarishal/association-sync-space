import { Languages } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const options: { value: Lang; label: string }[] = [
    { value: "ar", label: "العربية" },
    { value: "fr", label: "Français" },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-background p-0.5",
        className,
      )}
    >
      <Languages className="mx-1 size-4 text-muted-foreground" aria-hidden />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setLang(o.value)}
          aria-pressed={lang === o.value}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            lang === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
