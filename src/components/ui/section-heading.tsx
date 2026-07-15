import { cn } from "@/lib/utils/cn";

interface SectionHeadingProps {
  align?: "left" | "center";
  eyebrow?: string;
  title: string;
}

/** Consistent editorial heading used across branded surfaces. */
export function SectionHeading({ align = "left", eyebrow, title }: SectionHeadingProps) {
  return (
    <div className={cn("space-y-3", align === "center" && "text-center")}>
      {eyebrow ? <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-gold uppercase">{eyebrow}</p> : null}
      <h1 className="font-display text-4xl leading-[0.98] sm:text-5xl lg:text-6xl">{title}</h1>
    </div>
  );
}
