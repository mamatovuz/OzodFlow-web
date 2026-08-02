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
  const duration = Math.max(18, partners.length * 4);

  return (
    <div className="marquee-mask overflow-hidden">
      <div
        className="marquee-track flex w-max animate-marquee items-center gap-4"
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        {loop.map((p, i) => {
          const inner = (
            <div className="flex h-20 w-40 items-center justify-center rounded-2xl border border-border bg-card px-6 shadow-soft transition-all hover:border-accent/40 hover:shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.name}
                loading="lazy"
                decoding="async"
                className="max-h-12 max-w-full object-contain opacity-80 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
              />
            </div>
          );
          return (
            <div key={`${p.id}-${i}`} className="shrink-0" aria-hidden={i >= partners.length}>
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
