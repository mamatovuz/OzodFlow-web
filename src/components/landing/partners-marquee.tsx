type Partner = {
  id: string;
  name: string;
  image: string;
  url: string | null;
};

export function PartnersMarquee({ partners }: { partners: Partner[] }) {
  if (!partners.length) return null;

  // Uzluksiz aylanish uchun ro'yxatni ikki marta takrorlaymiz (-50% siljish)
  const loop = [...partners, ...partners];
  // Hamkorlar soniga qarab tezlikni moslaymiz (ko'proq bo'lsa sekinroq)
  const duration = Math.max(22, partners.length * 6);

  return (
    <div className="marquee-mask overflow-hidden py-2">
      <div
        className="marquee-track flex w-max animate-marquee items-stretch gap-6"
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        {loop.map((p, i) => {
          const inner = (
            <div className="group relative h-56 w-80 overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/50">
              {/* Rasm butun kartani to'liq qoplaydi */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Nom uchun pastki qoraytirish */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4">
                <p className="truncate text-base font-semibold text-white drop-shadow">
                  {p.name}
                </p>
              </div>
            </div>
          );
          return (
            <div
              key={`${p.id}-${i}`}
              className="shrink-0"
              aria-hidden={i >= partners.length}
            >
              {p.url ? (
                <a href={p.url} target="_blank" rel="noreferrer" title={p.name}>
                  {inner}
                </a>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
