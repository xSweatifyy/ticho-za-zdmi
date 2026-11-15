import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { User } from 'firebase/auth';
import { Building2, ExternalLink, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { StarRating } from '@/src/components/StarRating';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { createFacilityReport, deleteFacilityReport } from '@/src/lib/repository';
import { formatCzechDate } from '@/src/lib/utils';
import {
  DEFICIENCY_LABELS,
  FACILITY_TYPE_LABELS,
  type CountryCode,
  type DeficiencyCategory,
  type FacilityReport,
  type FacilityType,
  type MapPlaceResult,
  type Story,
} from '@/src/types/domain';

interface OpenStreetMapSectionProps {
  user: User | null;
  isAdmin: boolean;
  reports: FacilityReport[];
  stories: Story[];
  onRequireAuth: () => void;
  onSelectStory: (story: Story) => void;
  onWriteStoryForFacility: (place: MapPlaceResult) => void;
}

interface OsmQuerySpec {
  query: string;
  lat: number;
  lon: number;
  countryFilter?: 'CZ' | 'SK';
}

interface OsmPreset {
  id: string;
  label: string;
  queries: OsmQuerySpec[];
  center: [number, number];
  zoom: number;
}

const OSM_PRESETS: OsmPreset[] = [
  {
    id: 'cz_hospitals',
    label: 'Psychiatrické nemocnice (ČR)',
    queries: [
      { query: 'psychiatrická nemocnice', lat: 49.8, lon: 15.47, countryFilter: 'CZ' },
      { query: 'psychiatrická léčebna', lat: 49.8, lon: 15.47, countryFilter: 'CZ' },
    ],
    center: [49.8, 15.47],
    zoom: 7,
  },
  {
    id: 'sk_hospitals',
    label: 'Psychiatrické nemocnice (SR)',
    queries: [
      { query: 'psychiatrická nemocnica', lat: 48.68, lon: 19.65, countryFilter: 'SK' },
      { query: 'psychiatrická liečebňa', lat: 48.68, lon: 19.65, countryFilter: 'SK' },
    ],
    center: [48.68, 19.65],
    zoom: 7,
  },
  {
    id: 'child_hospitals',
    label: 'Dětské psychiatrické nemocnice a léčebny',
    queries: [
      { query: 'Psychiatrická nemocnice Dobřany', lat: 49.65, lon: 13.29, countryFilter: 'CZ' },
      { query: 'dětská psychiatrická nemocnice Opařany', lat: 49.4, lon: 14.48, countryFilter: 'CZ' },
      { query: 'dětská psychiatrická léčebna', lat: 49.8, lon: 15.47, countryFilter: 'CZ' },
      { query: 'detská psychiatrická liečebňa', lat: 48.68, lon: 19.65, countryFilter: 'SK' },
    ],
    center: [49.45, 16.5],
    zoom: 7,
  },
  {
    id: 'crisis_cdz',
    label: 'Krizová centra a CDZ',
    queries: [
      { query: 'centrum duševního zdraví', lat: 49.8, lon: 15.47 },
      { query: 'krízové centrum psychiatria', lat: 48.68, lon: 19.65 },
    ],
    center: [49.45, 16.85],
    zoom: 7,
  },
  {
    id: 'child_psych',
    label: 'Dětská psychiatrie (ambulance)',
    queries: [
      { query: 'dětská psychiatrie', lat: 49.8, lon: 15.47 },
      { query: 'detská psychiatria', lat: 48.68, lon: 19.65 },
    ],
    center: [49.45, 16.85],
    zoom: 7,
  },
];

interface PhotonFeature {
  properties?: {
    osm_type?: string;
    osm_id?: number | string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
}

interface NominatimItem {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: {
    country_code?: string;
  };
  extratags?: {
    website?: string;
    phone?: string;
  };
}

function createPinIcon(fill: string, stroke: string, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 34 : 28;
  const height = isSelected ? 44 : 36;
  return L.divIcon({
    className: 'bg-transparent border-0',
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height + 4],
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 28 36" fill="none">
      <path d="M14 1C6.82 1 1 6.82 1 14c0 9.75 13 21 13 21s13-11.25 13-21C27 6.82 21.18 1 14 1Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <circle cx="14" cy="14" r="4.5" fill="#FFFFFF"/>
    </svg>`,
  });
}

function formatPhotonAddress(props: NonNullable<PhotonFeature['properties']>): string {
  const streetPart = [props.street, props.housenumber].filter(Boolean).join(' ');
  const cityPart = [props.postcode, props.city || props.town || props.village]
    .filter(Boolean)
    .join(' ');
  const countryPart = props.country || (props.countrycode === 'SK' ? 'Slovensko' : 'Česko');
  return [streetPart, cityPart, props.state, countryPart].filter(Boolean).join(', ');
}

function sanitizeHttpUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
  } catch {
    return undefined;
  }
  return undefined;
}

export function OpenStreetMapSection({
  user,
  isAdmin,
  reports,
  stories,
  onRequireAuth,
  onSelectStory,
  onWriteStoryForFacility,
}: OpenStreetMapSectionProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activePreset, setActivePreset] = useState<string>('cz_hospitals');
  const [searchInput, setSearchInput] = useState('');
  const [places, setPlaces] = useState<MapPlaceResult[]>([]);
  const [presetCache, setPresetCache] = useState<Record<string, MapPlaceResult[]>>({});
  const [selectedPlace, setSelectedPlace] = useState<MapPlaceResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportFacilityType, setReportFacilityType] = useState<FacilityType>(
    'psychiatricka_nemocnice'
  );
  const [careRating, setCareRating] = useState(3);
  const [staffRating, setStaffRating] = useState(3);
  const [buildingRating, setBuildingRating] = useState(2);
  const [accessibilityRating, setAccessibilityRating] = useState(3);
  const [selectedDeficiencies, setSelectedDeficiencies] = useState<DeficiencyCategory[]>([
    'staff_shortage',
  ]);
  const [reportNote, setReportNote] = useState('');
  const [reportNickname, setReportNickname] = useState('');
  const [reportAge, setReportAge] = useState('');
  const [reportAnonymous, setReportAnonymous] = useState(true);
  const [submittingReport, setSubmittingReport] = useState(false);

  const reportsByPlaceId = useMemo(() => {
    const grouped: Record<string, FacilityReport[]> = {};
    for (const r of reports) {
      if (!grouped[r.placeId]) grouped[r.placeId] = [];
      grouped[r.placeId].push(r);
    }
    return grouped;
  }, [reports]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [49.45, 16.85],
      zoom: 7,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  const runOsmSearch = useCallback(
    async (
      queries: OsmQuerySpec[],
      targetCenter?: [number, number],
      targetZoom?: number,
      cacheKey?: string
    ) => {
      if (cacheKey && presetCache[cacheKey]) {
        const cached = presetCache[cacheKey];
        setPlaces(cached);
        setSelectedPlace(cached[0] ?? null);
        if (mapInstanceRef.current && targetCenter) {
          mapInstanceRef.current.setView(targetCenter, targetZoom ?? 7, { animate: true });
        }
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const seenIds: Record<string, boolean> = {};
        const collected: MapPlaceResult[] = [];

        const photonResponses = await Promise.allSettled(
          queries.map(async (q) => {
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q.query)}&limit=15&lat=${q.lat}&lon=${q.lon}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { features?: PhotonFeature[] };
            return { spec: q, features: data.features || [] };
          })
        );

        for (const item of photonResponses) {
          if (item.status !== 'fulfilled') continue;
          const { spec, features } = item.value;
          for (const feat of features) {
            const props = feat.properties;
            const coords = feat.geometry?.coordinates;
            if (!props || !coords || coords.length < 2) continue;
            const cc = (props.countrycode || '').toUpperCase();
            if (cc !== 'CZ' && cc !== 'SK') continue;
            if (spec.countryFilter && cc !== spec.countryFilter) continue;

            const osmKey = `osm_${props.osm_type || 'N'}_${props.osm_id || `${coords[1]}_${coords[0]}`}`
              .replace(/[^a-zA-Z0-9_-]/g, '_')
              .slice(0, 120);
            if (seenIds[osmKey]) continue;

            const name = props.name || formatPhotonAddress(props);
            if (!name) continue;
            seenIds[osmKey] = true;

            collected.push({
              placeId: osmKey,
              name,
              address: formatPhotonAddress(props),
              lat: Number(coords[1]),
              lng: Number(coords[0]),
              country: (cc === 'SK' ? 'SK' : 'CZ') as CountryCode,
            });
          }
        }

        // Fallback to Nominatim if Photon returned no results for a custom query
        if (collected.length === 0 && queries.length > 0) {
          const primary = queries[0];
          const countryCodes = primary.countryFilter
            ? primary.countryFilter.toLowerCase()
            : 'cz,sk';
          const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(primary.query)}&countrycodes=${countryCodes}&limit=12&addressdetails=1&extratags=1`;
          const nomRes = await fetch(nomUrl);
          if (nomRes.ok) {
            const items = (await nomRes.json()) as NominatimItem[];
            for (const n of items) {
              if (!n.lat || !n.lon) continue;
              const osmKey = `osm_${n.osm_type || 'N'}_${n.osm_id || n.place_id || Math.random()}`
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .slice(0, 120);
              if (seenIds[osmKey]) continue;
              seenIds[osmKey] = true;
              const cc = (n.address?.country_code || 'cz').toUpperCase();
              collected.push({
                placeId: osmKey,
                name: n.name || n.display_name?.split(',')[0] || 'Psychiatrické zařízení',
                address: n.display_name || '',
                lat: Number(n.lat),
                lng: Number(n.lon),
                phone: n.extratags?.phone,
                website: n.extratags?.website ? sanitizeHttpUrl(n.extratags.website) : undefined,
                country: (cc === 'SK' ? 'SK' : 'CZ') as CountryCode,
              });
            }
          }
        }

        if (cacheKey && collected.length > 0) {
          setPresetCache((prev) => ({ ...prev, [cacheKey]: collected }));
        }

        setPlaces(collected);
        if (collected.length > 0) {
          setSelectedPlace(collected[0]);
          if (mapInstanceRef.current) {
            if (targetCenter) {
              mapInstanceRef.current.setView(targetCenter, targetZoom ?? 7, { animate: true });
            } else {
              const zoomLevel = collected.length <= 5 ? 12 : 8;
              mapInstanceRef.current.setView([collected[0].lat, collected[0].lng], zoomLevel, {
                animate: true,
              });
            }
          }
        } else {
          setSelectedPlace(null);
        }
      } catch {
        setSearchError(
          'Nepodařilo se načíst zařízení z OpenStreetMap. Zkontrolujte prosím připojení k internetu.'
        );
      } finally {
        setIsSearching(false);
      }
    },
    [presetCache]
  );

  // Initial preset load
  useEffect(() => {
    const initial = OSM_PRESETS[0];
    void runOsmSearch(initial.queries, initial.center, initial.zoom, initial.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render Leaflet markers whenever places, selection, or reports change
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const place of places) {
      const placeReps = reportsByPlaceId[place.placeId] || [];
      const avg =
        placeReps.length > 0
          ? placeReps.reduce((acc, r) => acc + r.careRating, 0) / placeReps.length
          : 0;
      const isSelected = selectedPlace?.placeId === place.placeId;

      let fill = '#52525B';
      let stroke = '#27272A';
      if (isSelected) {
        fill = '#9A3412';
        stroke = '#7C2D12';
      } else if (placeReps.length > 0) {
        if (avg > 0 && avg < 3) {
          fill = '#B45309';
          stroke = '#78350F';
        } else {
          fill = '#1E3A5F';
          stroke = '#0F2540';
        }
      }

      const marker = L.marker([place.lat, place.lng], {
        icon: createPinIcon(fill, stroke, isSelected),
        title: place.name,
        zIndexOffset: isSelected ? 1000 : 0,
      });

      marker.on('click', () => {
        setSelectedPlace(place);
        mapInstanceRef.current?.panTo([place.lat, place.lng], { animate: true });
      });

      marker.addTo(layer);
    }
  }, [places, selectedPlace, reportsByPlaceId]);

  const handlePresetClick = (preset: OsmPreset) => {
    setActivePreset(preset.id);
    setSearchInput('');
    void runOsmSearch(preset.queries, preset.center, preset.zoom, preset.id);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setActivePreset('');
    const lower = trimmed.toLowerCase();
    const isSk =
      lower.includes('bratislav') ||
      lower.includes('košic') ||
      lower.includes('kosic') ||
      lower.includes('pezinok') ||
      lower.includes('slovens') ||
      lower.includes('žilina') ||
      lower.includes('trnava') ||
      lower.includes('nitra');
    const centerLat = isSk ? 48.68 : 49.8;
    const centerLon = isSk ? 19.65 : 15.47;
    const hasPsychKeyword =
      lower.includes('psychiatr') ||
      lower.includes('léčebn') ||
      lower.includes('liečebn') ||
      lower.includes('nemocnic');

    const queries: OsmQuerySpec[] = hasPsychKeyword
      ? [{ query: trimmed, lat: centerLat, lon: centerLon }]
      : [
          { query: `dětská psychiatrická ${trimmed}`, lat: centerLat, lon: centerLon },
          { query: `psychiatrická nemocnice ${trimmed}`, lat: centerLat, lon: centerLon },
        ];
    void runOsmSearch(queries);
  };

  const handleSelectPlaceFromList = (place: MapPlaceResult) => {
    setSelectedPlace(place);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([place.lat, place.lng], 13, { animate: true });
    }
  };

  const toggleDeficiency = (cat: DeficiencyCategory) => {
    setSelectedDeficiencies((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  };

  const handleOpenReportModal = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    if (selectedPlace) {
      const lowerName = selectedPlace.name.toLowerCase();
      if (lowerName.includes('dětsk') || lowerName.includes('detsk')) {
        if (lowerName.includes('léčebn') || lowerName.includes('liečebn')) {
          setReportFacilityType('detska_psychiatricka_lecebna');
        } else if (lowerName.includes('nemocnic')) {
          setReportFacilityType('detska_psychiatricka_nemocnice');
        } else {
          setReportFacilityType('detska_psychiatrie');
        }
      } else if (lowerName.includes('léčebn') || lowerName.includes('liečebn')) {
        setReportFacilityType('psychiatricka_lecebna');
      } else if (lowerName.includes('krizov') || lowerName.includes('duševního zdraví')) {
        setReportFacilityType('krizove_centrum');
      } else {
        setReportFacilityType('psychiatricka_nemocnice');
      }
    }
    setReportModalOpen(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlace || !reportNote.trim()) {
      toast.error('Popište prosím svou zkušenost nebo zjištěné nedostatky.');
      return;
    }

    setSubmittingReport(true);
    try {
      await createFacilityReport({
        placeId: selectedPlace.placeId,
        facilityName: selectedPlace.name,
        facilityAddress: selectedPlace.address,
        facilityType: reportFacilityType,
        country: selectedPlace.country,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        careRating,
        staffRating,
        buildingRating,
        accessibilityRating,
        deficiencies: selectedDeficiencies,
        note: reportNote,
        authorNickname: reportAnonymous ? '' : reportNickname,
        authorAge: reportAge,
        isAnonymous: reportAnonymous,
      });
      toast.success('Vaše hodnocení zařízení bylo uloženo.');
      setReportNote('');
      setReportNickname('');
      setReportAge('');
      setReportModalOpen(false);
    } catch {
      toast.error('Nepodařilo se uložit hodnocení zařízení.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const selectedPlaceReports = selectedPlace
    ? reportsByPlaceId[selectedPlace.placeId] || []
    : [];

  const relatedStories = useMemo(() => {
    if (!selectedPlace) return [];
    const nameToken = selectedPlace.name.toLowerCase().split(' ')[0];
    return stories.filter(
      (s) =>
        s.placeId === selectedPlace.placeId ||
        (nameToken.length > 3 && s.facilityName.toLowerCase().includes(nameToken))
    );
  }, [selectedPlace, stories]);

  const placeAverage = useMemo(() => {
    if (selectedPlaceReports.length === 0) return null;
    const sumCare = selectedPlaceReports.reduce((acc, r) => acc + r.careRating, 0);
    const sumStaff = selectedPlaceReports.reduce((acc, r) => acc + r.staffRating, 0);
    const sumBuilding = selectedPlaceReports.reduce((acc, r) => acc + r.buildingRating, 0);
    const sumAccess = selectedPlaceReports.reduce((acc, r) => acc + r.accessibilityRating, 0);
    const n = selectedPlaceReports.length;
    return {
      care: sumCare / n,
      staff: sumStaff / n,
      building: sumBuilding / n,
      accessibility: sumAccess / n,
      count: n,
    };
  }, [selectedPlaceReports]);

  return (
    <section id="mapa-zarizeni" className="py-16 border-t border-border bg-card/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
              Interaktivní mapa dostupnosti · Česká republika & Slovensko
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Mapa psychiatrických i dětských nemocnic, léčeben a center
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Vyhledejte reálná zařízení v ČR a SR, zkontrolujte zkušenosti ostatních pacientů a
              přidejte anonymní hodnocení kvality péče, personálu i stavu budov.
            </p>
          </div>

          <form onSubmit={handleCustomSearch} className="flex w-full lg:w-96 gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Město nebo název (např. Dobřany, Bohnice, Pezinok)..."
                className="pl-9"
                aria-label="Vyhledat zařízení na mapě"
              />
            </div>
            <Button type="submit" disabled={isSearching}>
              {isSearching ? 'Hledám…' : 'Hledat'}
            </Button>
          </form>
        </div>

        {/* Category search presets */}
        <div className="flex flex-wrap items-center gap-2">
          {OSM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                activePreset === preset.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:bg-muted'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Main Map + Results Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* OpenStreetMap / Leaflet Container */}
          <div className="lg:col-span-7 rounded-xl overflow-hidden border border-border bg-muted relative isolate z-0 min-h-[420px] h-[460px] lg:h-[580px]">
            <div
              ref={mapContainerRef}
              className="w-full h-full dark:[&_.leaflet-tile-pane]:brightness-[0.86] dark:[&_.leaflet-tile-pane]:contrast-[1.04]"
            />
          </div>

          {/* Right Panel: Selected Facility Detail & List */}
          <div className="lg:col-span-5 flex flex-col gap-4 h-full">
            {selectedPlace ? (
              <Card className="flex-1 flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {selectedPlace.country === 'SK' ? 'Slovenská republika' : 'Česká republika'}
                      {' · '}
                      OpenStreetMap
                    </p>
                    <CardTitle className="text-xl leading-snug">{selectedPlace.name}</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">{selectedPlace.address}</p>
                  {selectedPlace.website && (
                    <div className="pt-2 text-xs">
                      <a
                        href={selectedPlace.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Web zařízení
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-4 space-y-4 flex-1 overflow-y-auto max-h-[360px]">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">
                        Komunitní hodnocení kvality péče
                      </h4>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground">
                        {selectedPlaceReports.length} hlášení
                      </span>
                    </div>

                    {placeAverage ? (
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/60 text-xs">
                        <div>
                          <span className="text-muted-foreground block mb-1">Celková péče</span>
                          <StarRating value={placeAverage.care} size="sm" readOnly showValue />
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Personál</span>
                          <StarRating value={placeAverage.staff} size="sm" readOnly showValue />
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Stav budov</span>
                          <StarRating value={placeAverage.building} size="sm" readOnly showValue />
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Dostupnost</span>
                          <StarRating
                            value={placeAverage.accessibility}
                            size="sm"
                            readOnly
                            showValue
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">
                        Pro toto zařízení zatím nikdo nepřidal anonymní hodnocení kvality péče.
                        Můžete být první.
                      </p>
                    )}
                  </div>

                  {selectedPlaceReports.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Anonymní zkušenosti pacientů a rodin
                      </h4>
                      {selectedPlaceReports.slice(0, 4).map((rep) => (
                        <div
                          key={rep.id}
                          className="p-3 rounded-lg border border-border bg-background space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>
                              {rep.isAnonymous || !rep.authorNickname
                                ? 'Anonymní pacient / rodina'
                                : rep.authorNickname}
                              {rep.authorAge ? ` · ${rep.authorAge}` : ''}
                              {' · '}
                              {formatCzechDate(rep.createdAt)}
                            </span>
                            <div className="flex items-center gap-2">
                              <StarRating value={rep.careRating} size="sm" readOnly />
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => void deleteFacilityReport(rep.id)}
                                  className="text-destructive hover:opacity-80 p-1 cursor-pointer"
                                  aria-label="Smazat hlášení"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {rep.deficiencies.length > 0 && (
                            <p className="text-xs text-destructive font-medium">
                              Nedostatky:{' '}
                              {rep.deficiencies.map((d) => DEFICIENCY_LABELS[d]).join(', ')}
                            </p>
                          )}
                          <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                            {rep.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {relatedStories.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Související příběhy na blogu
                      </h4>
                      {relatedStories.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => onSelectStory(st)}
                          className="w-full text-left p-2.5 rounded-md border border-border hover:bg-muted/70 transition-colors cursor-pointer"
                        >
                          <p className="text-xs font-medium text-foreground line-clamp-1">
                            {st.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {FACILITY_TYPE_LABELS[st.facilityType]} · {st.city}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>

                <div className="p-4 border-t border-border bg-muted/30 flex flex-wrap gap-2">
                  <Button onClick={handleOpenReportModal} className="flex-1" size="sm">
                    Ohodnotit péči a budovu
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onWriteStoryForFacility(selectedPlace)}
                  >
                    Napsat příběh
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 flex flex-col justify-center items-center text-center space-y-2 min-h-[220px]">
                <Building2 className="h-7 w-7 text-muted-foreground" />
                <p className="font-medium text-sm">
                  {isSearching ? 'Načítám zařízení z mapy…' : 'Vyberte zařízení na mapě'}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Kliknutím na libovolný špendlík zobrazíte podrobnosti a anonymní hodnocení
                  kvality péče.
                </p>
              </Card>
            )}

            {searchError && (
              <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-md">
                {searchError}
              </p>
            )}

            <div className="rounded-xl border border-border bg-card divide-y divide-border max-h-[190px] overflow-y-auto">
              {places.map((p) => {
                const count = (reportsByPlaceId[p.placeId] || []).length;
                const active = selectedPlace?.placeId === p.placeId;
                return (
                  <button
                    key={p.placeId}
                    type="button"
                    onClick={() => handleSelectPlaceFromList(p)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      active ? 'bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.address}</p>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0">
                      {count > 0 ? `${count} hodn.` : p.country}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Facility Evaluation Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anonymní hodnocení zařízení</DialogTitle>
            <DialogDescription>
              {selectedPlace?.name} · {selectedPlace?.address}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Typ zařízení</label>
              <Select
                value={reportFacilityType}
                onValueChange={(v) => setReportFacilityType(v as FacilityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FACILITY_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="space-y-1">
                <span className="text-xs font-medium block">Celková kvalita péče</span>
                <StarRating value={careRating} onChange={setCareRating} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium block">Personál a přístup</span>
                <StarRating value={staffRating} onChange={setStaffRating} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium block">Stav budov a pokojů</span>
                <StarRating value={buildingRating} onChange={setBuildingRating} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium block">Dostupnost a čekací doby</span>
                <StarRating value={accessibilityRating} onChange={setAccessibilityRating} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">
                Zaznamenané nedostatky (vyberte všechny relevantní)
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(DEFICIENCY_LABELS) as [DeficiencyCategory, string][]).map(
                  ([key, label]) => {
                    const checked = selectedDeficiencies.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDeficiency(key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          checked
                            ? 'bg-destructive text-destructive-foreground border-destructive'
                            : 'bg-card text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Vaše zkušenost (prostředí, personál, dostupnost)
              </label>
              <Textarea
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="Popište prosím stav oddělení, přístup personálu, soukromí nebo čekací lhůty…"
                required
              />
            </div>

            <div className="space-y-3 p-3.5 rounded-lg border border-border bg-muted/30">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportAnonymous}
                  onChange={(e) => setReportAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="font-medium">Publikovat zcela anonymně (skryje jméno)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {!reportAnonymous && (
                  <Input
                    value={reportNickname}
                    onChange={(e) => setReportNickname(e.target.value)}
                    placeholder="Křestní jméno nebo přezdívka (nepovinné)"
                  />
                )}
                <Input
                  value={reportAge}
                  onChange={(e) => setReportAge(e.target.value)}
                  placeholder="Věk (nepovinné, např. 26 let)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportModalOpen(false)}>
                Zrušit
              </Button>
              <Button type="submit" disabled={submittingReport}>
                {submittingReport ? 'Ukládám…' : 'Uložit hodnocení'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
