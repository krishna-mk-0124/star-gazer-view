import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Camera, Database, Radio, Satellite } from "lucide-react";
import { formatRA, formatDec, radToDeg } from "@/lib/astro";
import {
  buildSIMBAD,
  buildSpaceTrack,
  fetchNASA,
  type NASAResult,
  type SourceBlock,
} from "@/lib/infoSources";

export type SatelliteMeta = {
  catnr?: string;
  intlDesignator?: string;
  epoch?: string;
  inclinationDeg?: number;
  meanMotion?: number;
  eccentricity?: number;
  periodMinutes?: number;
  velocityKms?: number;
  altitudeKm?: number;
};

export type CelestialSelection = {
  kind: "star" | "planet" | "satellite";
  name: string;
  ra?: number; // hours — FROZEN snapshot
  dec?: number; // degrees — FROZEN
  mag?: number; // FROZEN
  az?: number; // radians — FROZEN at click
  alt?: number; // radians — FROZEN at click
  distanceKm?: number; // FROZEN
  velocityKms?: number; // FROZEN
  capturedAt?: string; // ISO timestamp of click
  nasaQuery?: string;
  satMeta?: SatelliteMeta;
};

export function CelestialInfoPanel({
  selection,
  onClose,
}: {
  selection: CelestialSelection | null;
  onClose: () => void;
}) {
  const [nasa, setNasa] = useState<NASAResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Derived sync blocks — recomputed only when the (immutable) selection changes
  const simbad: SourceBlock | null = useMemo(
    () => (selection ? buildSIMBAD(selection) : null),
    [selection]
  );
  const spaceTrack: SourceBlock | null = useMemo(
    () => (selection ? buildSpaceTrack(selection) : null),
    [selection]
  );

  useEffect(() => {
    if (!selection) return;
    let cancelled = false;
    setLoading(true);
    setNasa(null);
    fetchNASA(selection)
      .then((res) => {
        if (!cancelled) setNasa(res);
      })
      .finally(() => {
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
                {kindLabel} · Snapshot Frozen
              </div>
              <SheetTitle className="text-2xl text-white">
                {selection.name}
              </SheetTitle>
              <SheetDescription className="text-white/60">
                Immutable coordinate snapshot captured{" "}
                {selection.capturedAt
                  ? new Date(selection.capturedAt).toLocaleTimeString()
                  : "at click"}
                .
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
                value={selection.mag !== undefined ? selection.mag.toFixed(2) : "—"}
              />
              <Stat
                label="Velocity"
                value={
                  selection.velocityKms !== undefined
                    ? `${selection.velocityKms.toFixed(2)} km/s`
                    : "—"
                }
              />
              <Stat
                label="Distance"
                value={
                  selection.distanceKm !== undefined
                    ? `${formatDistance(selection.distanceKm)}`
                    : "—"
                }
              />
              <Stat label="Type" value={kindLabel} />
            </div>

            <div className="mt-6">
              <Tabs defaultValue="nasa">
                <TabsList className="grid w-full grid-cols-3 bg-white/5">
                  <TabsTrigger value="nasa" className="data-[state=active]:bg-sky-500/30">
                    <Radio className="mr-1 h-3.5 w-3.5" />
                    NASA
                  </TabsTrigger>
                  <TabsTrigger value="simbad" className="data-[state=active]:bg-sky-500/30">
                    <Database className="mr-1 h-3.5 w-3.5" />
                    SIMBAD
                  </TabsTrigger>
                  <TabsTrigger value="track" className="data-[state=active]:bg-sky-500/30">
                    <Satellite className="mr-1 h-3.5 w-3.5" />
                    Space-Track
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="nasa" className="mt-4 space-y-3">
                  <SectionHeader icon={<Radio className="h-3.5 w-3.5" />} title="NASA Science Insights" />
                  {nasa ? (
                    <DataList rows={nasa.rows} />
                  ) : (
                    <Skeleton className="h-16 w-full bg-white/5" />
                  )}
                  <SectionHeader icon={<Camera className="h-3.5 w-3.5" />} title="Mission imagery" />
                  {loading && !nasa ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="aspect-square w-full bg-white/5" />
                      <Skeleton className="aspect-square w-full bg-white/5" />
                    </div>
                  ) : nasa && nasa.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {nasa.images.map((img, i) => (
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
                    <p className="text-sm text-white/40">No NASA imagery available.</p>
                  )}
                </TabsContent>

                <TabsContent value="simbad" className="mt-4 space-y-3">
                  <SectionHeader
                    icon={<Database className="h-3.5 w-3.5" />}
                    title="SIMBAD Astronomy Network"
                  />
                  {simbad && <DataList rows={simbad.rows} />}
                  {simbad?.notes && (
                    <p className="text-[11px] italic text-white/40">{simbad.notes}</p>
                  )}
                </TabsContent>

                <TabsContent value="track" className="mt-4 space-y-3">
                  <SectionHeader
                    icon={<Satellite className="h-3.5 w-3.5" />}
                    title="Space-Track Registry"
                  />
                  {spaceTrack && <DataList rows={spaceTrack.rows} />}
                </TabsContent>
              </Tabs>
            </div>

            {loading && (
              <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                <Loader2 className="h-3 w-3 animate-spin" />
                Aggregating multi-source telemetry…
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/60">
      {icon}
      {title}
    </div>
  );
}

function DataList({ rows }: { rows: { label: string; value: string }[] }) {
  if (!rows.length) {
    return <p className="text-sm text-white/40">No data returned for this object.</p>;
  }
  return (
    <div className="divide-y divide-white/5 rounded-lg border border-white/10 bg-white/5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start justify-between gap-3 px-3 py-2">
          <span className="text-[11px] uppercase tracking-wide text-white/45">
            {r.label}
          </span>
          <span className="text-right font-mono text-[12px] text-white">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-white/45">{label}</div>
      <div className="mt-0.5 font-mono text-[13px] text-white">{value}</div>
    </div>
  );
}

function formatDistance(km: number): string {
  if (km > 1e8) return `${(km / 1.496e8).toFixed(3)} AU`;
  if (km > 1000) return `${(km / 1000).toFixed(0).toLocaleString()} × 10³ km`;
  return `${km.toFixed(1)} km`;
}
