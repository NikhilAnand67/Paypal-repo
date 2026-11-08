import { Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/ui/brand-icons";
import { siteProfile, type ProfileLink } from "@/lib/site/profile";
import { cn } from "@/lib/utils/cn";

const icons = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  email: Mail,
} as const;

const order: (keyof typeof siteProfile.links)[] = ["github", "linkedin", "email"];

export function ProfileLinks({
  variant = "icons",
  className,
}: {
  variant?: "icons" | "inline";
  className?: string;
}) {
  const inline = variant === "inline";

  return (
    <ul className={cn("flex items-center gap-2", inline && "flex-wrap gap-x-4 gap-y-3", className)}>
      {order.map((key) => {
        const link: ProfileLink = siteProfile.links[key];
        const Icon = icons[key];
        const configured = Boolean(link.href);

        return (
          <li key={key} className="min-w-0">
            {configured ? (
              <a
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noreferrer noopener" : undefined}
                className={cn(
                  "focus-ring group inline-flex items-center gap-2 rounded-lg text-slate-400 transition-colors hover:text-white",
                  inline && "text-sm"
                )}
                aria-label={`${siteProfile.name}: ${link.label}`}
              >
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] transition-all duration-300 group-hover:border-white/25 group-hover:bg-white/[0.07]",
                    inline ? "h-7 w-7" : "h-9 w-9"
                  )}
                >
                  <Icon className={inline ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
                </span>
                {inline ? <span>{link.label}</span> : null}
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-2 text-slate-400"
                title={`${link.placeholder} — contact link not supplied`}
              >
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.02]",
                    inline ? "h-7 w-7" : "h-9 w-9"
                  )}
                >
                  <Icon className={inline ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden="true" />
                </span>
                <span className={inline ? "flex min-w-0 flex-col gap-0.5" : "sr-only"}>
                  <span className="text-xs font-medium">{link.label}</span>
                  <span className="break-words text-[10px] tracking-wide text-slate-400">
                    {link.placeholder}
                  </span>
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
