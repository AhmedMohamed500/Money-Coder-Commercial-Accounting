export function SectionHeading({
  eyebrow,
  title,
  description,
  inverted = false,
  align = "start",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  inverted?: boolean;
  align?: "start" | "center";
}) {
  return (
    <div className={`editorial-heading ${align === "center" ? "editorial-heading--center" : ""} ${inverted ? "editorial-heading--inverse" : ""}`}>
      <p className="editorial-eyebrow"><span aria-hidden="true" />{eyebrow}</p>
      <h2>{title}</h2>
      {description ? <p className="editorial-description">{description}</p> : null}
    </div>
  );
}
