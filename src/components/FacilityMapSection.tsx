import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  APILoadingStatus,
  InfoWindow,
  Map,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  MapPin,
  Phone,
  Search,
  Trash2,
} from 'lucide-react';
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

interface FacilityMapSectionProps {
  user: User | null;
  isAdmin: boolean;
  reports: FacilityReport[];
  stories: Story[];
  onRequireAuth: () => void;
  onSelectStory: (story: Story) => void;
  onWriteStoryForFacility: (place: MapPlaceResult) => void;
}

interface SearchQuerySpec {
  query: string;
  region: 'cz' | 'sk';
}

interface PresetQuery {
  id: string;
  label: string;
  queries: SearchQuerySpec[];
  center: { lat: number; lng: number };
  zoom: number;
}

const PRESET_QUERIES: PresetQuery[] = [
  {
    id: 'cz_hospitals',
    label: 'Psychiatrické nemocnice (ČR)',
    queries: [
      { query: 'psychiatrická nemocnice léčebna Česká republika', region: 'cz' },
    ],
    center: { lat: 49.8, lng: 15.47 },
    zoom: 7,
  },
  {
    id: 'sk_hospitals',
    label: 'Psychiatrické nemocnice (SR)',
    queries: [
      { query: 'psychiatrická nemocnica liečebňa Slovensko', region: 'sk' },
    ],
    center: { lat: 48.68, lng: 19.65 },
    zoom: 7,
  },
  {
    id: 'child_hospitals',
    label: 'Dětské psychiatrické nemocnice a léčebny',
    queries: [
      { query: 'dětská psychiatrická nemocnice Dobřany', region: 'cz' },
      { query: 'dětská psychiatrická nemocnice léčebna Česká republika', region: 'cz' },
      { query: 'detská psychiatrická nemocnica liečebňa Slovensko', region: 'sk' },
    ],
    center: { lat: 49.45, lng: 16.85 },
    zoom: 7,
  },
  {
    id: 'crisis_cdz',
    label: 'Krizová centra a CDZ',
    queries: [
      { query: 'centrum duševního zdraví krizové centrum psychiatrie', region: 'cz' },
    ],
    center: { lat: 49.45, lng: 16.85 },
    zoom: 7,
  },
  {
    id: 'child_psych',
    label: 'Dětská psychiatrie (ambulance)',
    queries: [
      { query: 'dětská psychiatrie ambulance oddělení', region: 'cz' },
    ],
    center: { lat: 49.45, lng: 16.85 },
    zoom: 7,
  },
];

function getMapsApiKey(): string {
  const fromVite = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (fromVite && typeof fromVite === 'string' && fromVite.trim()) return fromVite.trim();
  if (typeof __GMP_API_KEY__ !== 'undefined' && __GMP_API_KEY__) return __GMP_API_KEY__;
  return '';
}

function checkQuotaError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('429') ||
    msg.includes('QuotaExceededError')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

export function FacilityMapSection(props: FacilityMapSectionProps) {
  const apiKey = useMemo(() => getMapsApiKey(), []);

  if (!apiKey) {
    return (
      <section id="mapa-zarizeni" className="py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
            <h2 className="font-serif text-2xl font-semibold">
              Mapa psychiatrických zařízení v ČR a SR
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Klíč pro Google Maps Platform není v aktuálním běhovém prostředí načten. Po restartu
              serveru s nastaveným klíčem se zde zobrazí živá interaktivní mapa zařízení.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      language="cs"
      region="CZ"
      libraries={['places', 'marker']}
    >
      <FacilityMapWorkspace {...props} />
    </APIProvider>
  );
}

interface FacilityMarkerProps {
  place: MapPlaceResult;
  isSelected: boolean;
  hasReports: boolean;
  avgRating: number;
  onSelect: (place: MapPlaceResult) => void;
  onCloseInfo: () => void;
}

function FacilityMarker({
  place,
  isSelected,
  hasReports,
  avgRating,
  onSelect,
  onCloseInfo,
}: FacilityMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const pinColors = useMemo(() => {
    if (isSelected) {
      return { background: '#9A3412', borderColor: '#7C2D12', glyphColor: '#FFFFFF' };
    }
    if (hasReports) {
      return avgRating > 0 && avgRating < 3
        ? { background: '#B45309', borderColor: '#78350F', glyphColor: '#FFFFFF' }
        : { background: '#1E3A5F', borderColor: '#0F2540', glyphColor: '#FFFFFF' };
    }
    return { background: '#52525B', borderColor: '#27272A', glyphColor: '#FFFFFF' };
  }, [isSelected, hasReports, avgRating]);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: place.lat, lng: place.lng }}
        title={place.name}
        onClick={() => onSelect(place)}
      >
        <Pin
          background={pinColors.background}
          borderColor={pinColors.borderColor}
          glyphColor={pinColors.glyphColor}
          scale={isSelected ? 1.25 : 1}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={280}>
          <div className="p-1 text-zinc-900 font-sans space-y-1.5">
            <p className="font-serif font-semibold text-sm leading-snug text-zinc-900">
              {place.name}
            </p>
            <p className="text-xs text-zinc-600 leading-snug">{place.address}</p>
            {place.phone && (
              <p className="text-xs font-mono tabular-nums text-zinc-800">{place.phone}</p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function FacilityMapWorkspace({
  user,
  isAdmin,
  reports,
  stories,
  onRequireAuth,
  onSelectStory,
  onWriteStoryForFacility,
}: FacilityMapSectionProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const loadingStatus = useApiLoadingStatus();

  const [activePreset, setActivePreset] = useState<string>('cz_hospitals');
  const [searchInput, setSearchInput] = useState('');
  const [places, setPlaces] = useState<MapPlaceResult[]>([]);
  const [presetCache, setPresetCache] = useState<Record<string, MapPlaceResult[]>>({});
  const [selectedPlace, setSelectedPlace] = useState<MapPlaceResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasRunInitialSearch, setHasRunInitialSearch] = useState(false);

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

  // Group reports by placeId using plain Record (avoiding Map constructor shadowing)
  const reportsByPlaceId = useMemo(() => {
    const grouped: Record<string, FacilityReport[]> = {};
    for (const r of reports) {
      if (!grouped[r.placeId]) grouped[r.placeId] = [];
      grouped[r.placeId].push(r);
    }
    return grouped;
  }, [reports]);

  const runPlaceSearch = useCallback(
    async (
      queries: SearchQuerySpec[],
      targetCenter?: { lat: number; lng: number },
      targetZoom?: number,
      cacheKey?: string
    ) => {
      if (!placesLib) return;
      if (cacheKey && presetCache[cacheKey]) {
        const cached = presetCache[cacheKey];
        setPlaces(cached);
        setSelectedPlace(cached[0] ?? null);
        if (map && targetCenter) {
          map.panTo(targetCenter);
          if (targetZoom) map.setZoom(targetZoom);
        }
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const settled = await Promise.allSettled(
          queries.map((q) => {
            const request: google.maps.places.SearchByTextRequest = {
              textQuery: q.query,
              fields: [
                'id',
                'displayName',
                'formattedAddress',
                'location',
                'rating',
                'userRatingCount',
                'nationalPhoneNumber',
                'websiteURI',
                'regularOpeningHours',
              ],
              language: q.region === 'sk' ? 'sk' : 'cs',
              region: q.region,
              maxResultCount: 15,
            };
            return placesLib.Place.searchByText(request).then((res) => ({
              region: q.region,
              places: res?.places || [],
            }));
          })
        );

        const seenIds: Record<string, boolean> = {};
        const mapped: MapPlaceResult[] = [];
        let firstError: unknown = null;

        for (const result of settled) {
          if (result.status === 'rejected') {
            if (!firstError) firstError = result.reason;
            checkQuotaError(result.reason);
            continue;
          }
          const { region: regionCode, places: rawPlaces } = result.value;
          for (const p of rawPlaces) {
            if (p.location == null || !p.id || seenIds[p.id]) continue;
            seenIds[p.id] = true;
            const addr = p.formattedAddress || '';
            const isSk =
              regionCode === 'sk' ||
              addr.toLowerCase().includes('slovensko') ||
              addr.toLowerCase().includes('slovakia');
            mapped.push({
              placeId: p.id,
              name: p.displayName || 'Psychiatrické zařízení',
              address: addr,
              lat: p.location.lat(),
              lng: p.location.lng(),
              googleRating: typeof p.rating === 'number' ? p.rating : undefined,
              userRatingCount:
                typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
              phone: p.nationalPhoneNumber || undefined,
              website: p.websiteURI || undefined,
              country: (isSk ? 'SK' : 'CZ') as CountryCode,
            });
          }
        }

        if (mapped.length === 0 && firstError) {
          throw firstError;
        }

        if (cacheKey && mapped.length > 0) {
          setPresetCache((prev) => ({ ...prev, [cacheKey]: mapped }));
        }

        setPlaces(mapped);
        if (mapped.length > 0) {
          setSelectedPlace(mapped[0]);
          if (map && targetCenter) {
            map.panTo(targetCenter);
            if (targetZoom) map.setZoom(targetZoom);
          } else if (map && mapped[0]) {
            map.panTo({ lat: mapped[0].lat, lng: mapped[0].lng });
            if (mapped.length <= 5) {
              map.setZoom(12);
            }
          }
        } else {
          setSelectedPlace(null);
        }
      } catch (err) {
        checkQuotaError(err);
        setSearchError(
          'Nepodařilo se načíst zařízení z Google Maps. Zkontrolujte prosím připojení nebo zkuste jiný dotaz.'
        );
      } finally {
        setIsSearching(false);
      }
    },
    [placesLib, map, presetCache]
  );

  // Automatic initial load once Places library is ready
  useEffect(() => {
    if (placesLib && !hasRunInitialSearch) {
      setHasRunInitialSearch(true);
      const initial = PRESET_QUERIES[0];
      void runPlaceSearch(initial.queries, initial.center, initial.zoom, initial.id);
    }
  }, [placesLib, hasRunInitialSearch, runPlaceSearch]);

  const handlePresetClick = (preset: PresetQuery) => {
    setActivePreset(preset.id);
    setSearchInput('');
    void runPlaceSearch(preset.queries, preset.center, preset.zoom, preset.id);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setActivePreset('');
    const lower = trimmed.toLowerCase();
    const region: 'cz' | 'sk' =
      lower.includes('bratislav') ||
      lower.includes('košic') ||
      lower.includes('kosic') ||
      lower.includes('pezinok') ||
      lower.includes('slovens') ||
      lower.includes('žilina') ||
      lower.includes('trnava') ||
      lower.includes('nitra')
        ? 'sk'
        : 'cz';
    const hasPsychKeyword =
      lower.includes('psychiatr') ||
      lower.includes('léčebn') ||
      lower.includes('liečebn') ||
      lower.includes('nemocnic');
    const customQueries: SearchQuerySpec[] = hasPsychKeyword
      ? [{ query: trimmed, region }]
      : [
          { query: `dětská psychiatrická nemocnice ${trimmed}`, region },
          { query: `psychiatrická nemocnice léčebna ${trimmed}`, region },
        ];
    void runPlaceSearch(customQueries);
  };

  const handleSelectPlaceFromList = (place: MapPlaceResult) => {
    setSelectedPlace(place);
    if (map) {
      map.panTo({ lat: place.lat, lng: place.lng });
      map.setZoom(12);
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
          {PRESET_QUERIES.map((preset) => (
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
          {/* Map Container */}
          <div className="lg:col-span-7 rounded-xl overflow-hidden border border-border bg-muted relative min-h-[420px] h-[460px] lg:h-[580px]">
            {loadingStatus === APILoadingStatus.FAILED ||
            loadingStatus === APILoadingStatus.AUTH_FAILURE ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                <AlertTriangle className="h-7 w-7 text-destructive" />
                <p className="font-medium text-sm">Nepodařilo se načíst mapový podklad.</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Zkontrolujte prosím připojení k internetu nebo kvótu Google Maps Platform.
                </p>
              </div>
            ) : (
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={{ lat: 49.45, lng: 16.85 }}
                defaultZoom={7}
                gestureHandling="greedy"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                onClick={() => setSelectedPlace(null)}
                style={{ width: '100%', height: '100%' }}
              >
                {places.map((place) => {
                  const placeReps = reportsByPlaceId[place.placeId] || [];
                  const avg =
                    placeReps.length > 0
                      ? placeReps.reduce((acc, r) => acc + r.careRating, 0) / placeReps.length
                      : 0;
                  return (
                    <FacilityMarker
                      key={place.placeId}
                      place={place}
                      isSelected={selectedPlace?.placeId === place.placeId}
                      hasReports={placeReps.length > 0}
                      avgRating={avg}
                      onSelect={handleSelectPlaceFromList}
                      onCloseInfo={() => setSelectedPlace(null)}
                    />
                  );
                })}
              </Map>
            )}
          </div>

          {/* Right Panel: Selected Facility Detail & List */}
          <div className="lg:col-span-5 flex flex-col gap-4 h-full">
            {selectedPlace ? (
              <Card className="flex-1 flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {selectedPlace.country === 'SK' ? 'Slovenská republika' : 'Česká republika'}
                        {' · '}
                        Google Maps ověřené místo
                      </p>
                      <CardTitle className="text-xl leading-snug">{selectedPlace.name}</CardTitle>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">{selectedPlace.address}</p>
                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
                    {selectedPlace.phone && (
                      <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedPlace.phone}
                      </span>
                    )}
                    {selectedPlace.website && (
                      <a
                        href={selectedPlace.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Web zařízení
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {typeof selectedPlace.googleRating === 'number' && (
                      <span className="font-mono tabular-nums">
                        Google hodnocení: {selectedPlace.googleRating.toFixed(1)}/5 (
                        {selectedPlace.userRatingCount ?? 0})
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4 flex-1 overflow-y-auto max-h-[360px]">
                  {/* Community evaluation summary */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">
                        Komunitní hodnocení kvality péče
                      </h4>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground">
                        {selectedPlaceReports.length}{' '}
                        {selectedPlaceReports.length === 1
                          ? 'hlášení'
                          : selectedPlaceReports.length >= 2 && selectedPlaceReports.length <= 4
                            ? 'hlášení'
                            : 'hlášení'}
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

                  {/* Individual community reports */}
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

                  {/* Related stories */}
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
                  Kliknutím na libovolný špendlík zobrazíte podrobnosti, kontakt a anonymní
                  hodnocení kvality péče.
                </p>
              </Card>
            )}

            {/* Compact facility selector list */}
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
