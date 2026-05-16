import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, BookOpen, Camera } from "lucide-react";
import { formatRA, formatDec, radToDeg } from "@/lib/astro";

export type CelestialSelection = {
  kind: "star" | "planet" | "satellite";
  name: string;
  ra?: number; // hours
  dec?: number; // degrees
  mag?: number;
  az?: number; // radians
  alt?: number; // radians
  /** Wikipedia search title override */
  wikiTitle?: string;
  /** NASA Image search query override */
  nasaQuery?: string;
};

type WikiData = { extract: string; thumbnail?: string; url: string } | null;

export function CelestialInfoPanel({
  selection,
  onClose,
}: {
  selection: CelestialSelection | null;
  onClose: () => void;
}) {
  const [wiki, setWiki] = useState<WikiData>(null);
  const [images, setImages] = useState<{ href: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selection) return;
    let cancelled = false;
    setLoading(true);
    setWiki(null);
    setImages([]);

    const wikiTitle = selection.wikiTitle || selection.name;
    const nasaQuery = selection.nasaQuery || selection.name;

    const wikiP = fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        wikiTitle
      )}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setWiki({
          extract: j.extract || "",
          thumbnail: j.thumbnail?.source,
          url: j.content_urls?.desktop?.page || "",
        });
      })
      .catch(() => {});

    const nasaP = fetch(
      `https://images-api.nasa.gov/search?q=${encodeURIComponent(
        nasaQuery
      )}&media_type=image`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        const items: { href: string; title: string }[] = [];
        for (const item of j.collection?.items?.slice(0, 6) ?? []) {
          const link = item.links?.[0]?.href;
          const title = item.data?.[0]?.title ?? "";
          if (link) items.push({ href: link, title });
        }
        setImages(items);
      })
      .catch(() => {});

    Promise.all([wikiP, nasaP]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selection]);

  const open = selection !== null;

  const kindLabel =
    selection?.kind === "star"
      ? "Star"
      : selection?.kind === "planet"
      ? "Planet / Moon"
      : selection?.kind === "satellite"
      ? "Satellite"
      : "";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-white/10 bg-black/90 text-white backdrop-blur-xl sm:max-w-md"
      >
        {selection && (
          <>
            <SheetHeader>
              <div className="text-[10px] uppercase tracking-[0.2em] text-sky-300/70">
                {kindLabel}
              </div>
              <SheetTitle className="text-2xl text-white">
                {selection.name}
              </SheetTitle>
              <SheetDescription className="text-white/60">
                Live celestial coordinates and reference data.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <Stat
                label="Right Ascension"
                value={selection.ra !== undefined ? formatRA(selection.ra) : "—"}
              />
              <Stat
                label="Declination"
                value={selection.dec !== undefined ? formatDec(selection.dec) : "—"}
              />
              <Stat
                label="Azimuth"
                value={
                  selection.az !== undefined
                    ? `${radToDeg(selection.az).toFixed(2)}°`
                    : "—"
                }
              />
              <Stat
                label="Altitude"
                value={
                  selection.alt !== undefined
                    ? `${radToDeg(selection.alt).toFixed(2)}°`
                    : "—"
                }
              />
              <Stat
                label="Magnitude"
                value={
                  selection.mag !== undefined ? selection.mag.toFixed(2) : "—"
                }
              />
              <Stat label="Type" value={kindLabel} />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
                <BookOpen className="h-3.5 w-3.5" />
                About
              </div>
              {loading && !wiki ? (
                <Skeleton className="h-24 w-full bg-white/5" />
              ) : wiki ? (
                <div className="space-y-2">
                  <p className="text-sm leading-relaxed text-white/85">
                    {wiki.extract}
                  </p>
                  {wiki.url && (
                    <a
                      href={wiki.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline"
                    >
                      Read on Wikipedia →
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/40">
                  No Wikipedia entry found.
                </p>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-white/60">
                <Camera className="h-3.5 w-3.5" />
                NASA imagery
              </div>
              {loading && images.length === 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="aspect-square w-full bg-white/5" />
                  <Skeleton className="aspect-square w-full bg-white/5" />
                </div>
              ) : images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, i) => (
                    <a
                      key={i}
                      href={img.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-lg border border-white/10"
                    >
                      <img
                        src={img.href}
                        alt={img.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/40">
                  No NASA images found for this object.
                </p>
              )}
            </div>

            {loading && (
              <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                <Loader2 className="h-3 w-3 animate-spin" />
                Fetching latest data…
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[13px] text-white">{value}</div>
    </div>
  );
}
