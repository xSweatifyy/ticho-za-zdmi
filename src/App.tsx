import { useEffect, useMemo, useState } from 'react';
import { getRedirectResult, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  LogOut,
  MapPin,
  Moon,
  PenSquare,
  Search,
  Shield,
  Sparkles,
  Sun,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { AdminDashboardModal } from '@/src/components/AdminDashboardModal';
import { AuthModal } from '@/src/components/AuthModal';
import { CrisisBanner } from '@/src/components/CrisisBanner';
import { DeficienciesOverview } from '@/src/components/DeficienciesOverview';
import { FacilityMapSection } from '@/src/components/FacilityMapSection';
import { StarRating } from '@/src/components/StarRating';
import { StoryDetailModal } from '@/src/components/StoryDetailModal';
import { StoryEditorModal } from '@/src/components/StoryEditorModal';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { ADMIN_EDITORIAL_SEEDS } from '@/src/data/editorialSeeds';
import { ADMIN_EMAIL, auth } from '@/src/lib/firebase';
import { EDITORIAL_MEDIA, resolveStoryImage } from '@/src/lib/media';
import {
  createStory,
  subscribeAllStorySubmissions,
  subscribeFacilityReports,
  subscribeStories,
  subscribeStoryRatings,
  subscribeUserStorySubmissions,
} from '@/src/lib/repository';
import { formatCzechDate, normalizeForSearch } from '@/src/lib/utils';
import {
  DEFICIENCY_LABELS,
  FACILITY_TYPE_LABELS,
  type CountryCode,
  type FacilityReport,
  type FacilityType,
  type MapPlaceResult,
  type Story,
  type StoryRating,
  type StorySubmission,
} from '@/src/types/domain';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [submissions, setSubmissions] = useState<StorySubmission[]>([]);
  const [mySubmissions, setMySubmissions] = useState<StorySubmission[]>([]);
  const [ratings, setRatings] = useState<StoryRating[]>([]);
  const [facilityReports, setFacilityReports] = useState<FacilityReport[]>([]);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState<'all' | FacilityType>('all');
  const [countryFilter, setCountryFilter] = useState<'all' | CountryCode>('all');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('pribeh');
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<StorySubmission | null>(null);
  const [prefilledPlace, setPrefilledPlace] = useState<MapPlaceResult | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [mySubmissionsOpen, setMySubmissionsOpen] = useState(false);
  const [seedingInitial, setSeedingInitial] = useState(false);

  // Maps Demo Quota banner state
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  // Dark Mode state synced with <html> class and localStorage
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('ticho-theme', darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }, [darkMode]);

  const isAdmin = Boolean(
    user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  useEffect(() => {
    const handleQuotaEvent = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaEvent);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaEvent);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (selectedStoryId) {
      url.searchParams.set('pribeh', selectedStoryId);
    } else {
      url.searchParams.delete('pribeh');
    }
    window.history.replaceState({}, '', url.toString());
  }, [selectedStoryId]);

  useEffect(() => {
    void getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          toast.success('Úspěšně přihlášeno přes Google účet.');
        }
      })
      .catch(() => {
        // Redirect result handled cleanly when absent
      });

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const unsubStories = subscribeStories(
      (data) => {
        setStories(data);
        setStoriesLoading(false);
      },
      () => {
        setStoriesLoading(false);
      }
    );
    const unsubRatings = subscribeStoryRatings((data) => setRatings(data));
    const unsubReports = subscribeFacilityReports((data) => setFacilityReports(data));

    return () => {
      unsubStories();
      unsubRatings();
      unsubReports();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user) {
      setSubmissions([]);
      setMySubmissions([]);
      return;
    }

    if (isAdmin) {
      setMySubmissions([]);
      const unsubAll = subscribeAllStorySubmissions((data) => {
        setSubmissions(data);
      });
      return () => unsubAll();
    }

    setSubmissions([]);
    const unsubMine = subscribeUserStorySubmissions(user.uid, (data) => {
      setMySubmissions(data);
    });
    return () => unsubMine();
  }, [authReady, user, isAdmin]);

  const pendingSubmissionsCount = useMemo(
    () => submissions.filter((s) => s.status === 'pending').length,
    [submissions]
  );

  // Rating averages per story
  const ratingsByStoryId = useMemo(() => {
    const map: Record<string, { sumCare: number; count: number }> = {};
    for (const r of ratings) {
      if (!map[r.storyId]) map[r.storyId] = { sumCare: 0, count: 0 };
      map[r.storyId].sumCare += r.careRating;
      map[r.storyId].count += 1;
    }
    return map;
  }, [ratings]);

  const getStoryCareRating = (story: Story): { avg: number; count: number } => {
    const comm = ratingsByStoryId[story.id];
    const hasInitial = story.initialCareRating > 0;
    const totalCount = (comm?.count || 0) + (hasInitial ? 1 : 0);
    if (totalCount === 0) return { avg: 0, count: 0 };
    const totalSum = (comm?.sumCare || 0) + (hasInitial ? story.initialCareRating : 0);
    return { avg: totalSum / totalCount, count: totalCount };
  };

  // Keyword + facilityType + country filter
  const filteredStories = useMemo(() => {
    const qNorm = normalizeForSearch(searchQuery.trim());
    return stories.filter((story) => {
      if (facilityFilter !== 'all' && story.facilityType !== facilityFilter) return false;
      if (countryFilter !== 'all' && story.country !== countryFilter) return false;

      if (!qNorm) return true;
      const haystack = normalizeForSearch(
        [
          story.title,
          story.excerpt,
          story.content,
          story.facilityName,
          story.city,
          story.deficienciesSummary,
          ...story.deficiencyCategories.map((c) => DEFICIENCY_LABELS[c]),
        ].join(' ')
      );
      return haystack.includes(qNorm);
    });
  }, [stories, searchQuery, facilityFilter, countryFilter]);

  const selectedStory = useMemo(
    () => stories.find((s) => s.id === selectedStoryId) || null,
    [stories, selectedStoryId]
  );

  const handleOpenShareStory = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setEditingStory(null);
    setEditingSubmission(null);
    setPrefilledPlace(null);
    setEditorOpen(true);
  };

  const handleWriteStoryForFacility = (place: MapPlaceResult) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setEditingStory(null);
    setEditingSubmission(null);
    setPrefilledPlace(place);
    setEditorOpen(true);
  };

  const handleEditStory = (story: Story) => {
    setEditingStory(story);
    setEditingSubmission(null);
    setPrefilledPlace(null);
    setEditorOpen(true);
  };

  const handleEditSubmission = (submission: StorySubmission) => {
    setEditingStory(null);
    setEditingSubmission(submission);
    setPrefilledPlace(null);
    setEditorOpen(true);
  };

  const handleSeedFromEmptyState = async () => {
    if (!isAdmin) return;
    setSeedingInitial(true);
    try {
      for (const seed of ADMIN_EDITORIAL_SEEDS) {
        await createStory(seed);
      }
      toast.success('Úvodní příběhy byly uloženy do databáze.');
    } catch {
      toast.error('Nepodařilo se nahrát úvodní příběhy.');
    } finally {
      setSeedingInitial(false);
    }
  };

  const handleFilterDeficiency = (keyword: string) => {
    setSearchQuery(keyword);
    const el = document.getElementById('pribehy');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const leadStory = filteredStories[0] || null;
  const secondaryStories = filteredStories.slice(1);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Toaster position="top-center" richColors theme={darkMode ? 'dark' : 'light'} />

      {/* Google Maps Demo Key Quota Warning Banner */}
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 dark:bg-amber-950/90 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 dark:text-amber-200 hover:text-amber-800 dark:hover:text-white"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#"
            className="font-serif text-xl font-semibold tracking-tight text-foreground whitespace-nowrap shrink-0"
          >
            Ticho za zdmi
          </a>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a
              href="#pribehy"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Příběhy
            </a>
            <a
              href="#nedostatky"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Nedostatky
            </a>
            <a
              href="#mapa-zarizeni"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Mapa zařízení
            </a>
            <a
              href="#krizova-pomoc"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              Krizová pomoc
            </a>
          </nav>

          {/* Zone 3: Theme switch + primary action */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={darkMode ? 'Přepnout do světlého režimu' : 'Přepnout do tmavého režimu'}
              title={darkMode ? 'Přepnout do světlého režimu' : 'Přepnout do tmavého režimu'}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {!authReady ? (
              <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
            ) : !user ? (
              <Button
                size="sm"
                onClick={() => setAuthModalOpen(true)}
                className="whitespace-nowrap shrink-0"
              >
                <UserIcon className="h-4 w-4" />
                Přihlásit se
              </Button>
            ) : isAdmin ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setAdminModalOpen(true)}
                  className="whitespace-nowrap shrink-0"
                >
                  <Shield className="h-4 w-4" />
                  {pendingSubmissionsCount > 0
                    ? `Administrace (${pendingSubmissionsCount})`
                    : 'Administrace'}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void signOut(auth)}
                  aria-label="Odhlásit se"
                  title="Odhlásit se"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {mySubmissions.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMySubmissionsOpen(true)}
                    className="whitespace-nowrap shrink-0"
                    title="Stav odeslaných příběhů ke schválení"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Moje návrhy</span> ({mySubmissions.length})
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleOpenShareStory}
                  className="whitespace-nowrap shrink-0"
                >
                  <PenSquare className="h-4 w-4" />
                  Odeslat příběh
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void signOut(auth)}
                  aria-label="Odhlásit se"
                  title="Odhlásit se"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Editorial Hero Section */}
        <section className="py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-between space-y-8">
                <div className="space-y-5">
                  <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                    Česká republika & Slovensko · Anonymní archiv svědectví
                  </p>
                  <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.12] text-foreground">
                    Příběhy lidí, kterým psychiatrická péče změnila život
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                    Nezávislý prostor pro autentická svědectví pacientů, rodin i zdravotníků.
                    Otevřeně pojmenováváme nedostatky v personálu, stavu budov a dostupnosti
                    pomoci v ČR a SR — s důrazem na anonymitu a bezpečí.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="lg" onClick={handleOpenShareStory}>
                      <PenSquare className="h-4 w-4" />
                      {isAdmin ? 'Přidat příběh' : 'Odeslat příběh ke schválení'}
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <a href="#mapa-zarizeni">
                        <MapPin className="h-4 w-4" />
                        Prohlédnout mapu zařízení
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col">
                <figure className="flex-1 flex flex-col">
                  <div className="rounded-xl overflow-hidden border border-border bg-muted flex-1 min-h-[280px] lg:min-h-[380px]">
                    <img
                      src={EDITORIAL_MEDIA.heroCorridor}
                      alt="Historické nádvoří psychiatrické nemocnice ve střední Evropě"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <figcaption className="text-xs font-serif italic text-muted-foreground mt-2.5">
                    Obr. 1 — Prostředí psychiatrických areálů má zásadní vliv na psychickou pohodu
                    a průběh léčby.
                  </figcaption>
                </figure>
              </div>
            </div>

            {/* Quantitative Summary Row below Hero */}
            <div className="mt-12 pt-8 border-t border-border grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <span className="text-xs text-muted-foreground block">Zveřejněných příběhů</span>
                <span className="font-mono tabular-nums text-2xl font-semibold text-foreground">
                  {stories.length}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Hodnocení z mapy</span>
                <span className="font-mono tabular-nums text-2xl font-semibold text-foreground">
                  {facilityReports.length}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Komentářů a hodnocení</span>
                <span className="font-mono tabular-nums text-2xl font-semibold text-foreground">
                  {ratings.length}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Oblast pokrytí</span>
                <span className="font-mono tabular-nums text-sm font-medium text-foreground pt-1.5 block">
                  Česká a Slovenská republika
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stories Archive, Search & Filtering */}
        <section id="pribehy" className="py-16 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  Svědectví pacientů, rodin a personálu
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight">
                  Příběhy z léčeben a nemocnic
                </h2>
              </div>

              {/* Keyword search across story texts */}
              <div className="relative w-full lg:w-96">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hledat klíčová slova v příbězích (např. sestra, sprchy, Brno)…"
                  className="pl-9"
                  aria-label="Vyhledávání klíčových slov v textech"
                />
              </div>
            </div>

            {/* Interactive Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFacilityFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                    facilityFilter === 'all'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:bg-muted'
                  }`}
                >
                  Všechny typy
                </button>
                {(Object.entries(FACILITY_TYPE_LABELS) as [FacilityType, string][]).map(
                  ([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFacilityFilter(key)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                        facilityFilter === key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg self-start">
                {(
                  [
                    ['all', 'ČR & SR'],
                    ['CZ', 'Česká republika'],
                    ['SK', 'Slovensko'],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCountryFilter(code)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      countryFilter === code
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stories Display */}
            {storiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-64 animate-pulse bg-muted/50" />
                ))}
              </div>
            ) : filteredStories.length === 0 ? (
              <Card className="p-10 text-center space-y-4">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
                <div className="space-y-1.5 max-w-lg mx-auto">
                  <h3 className="font-serif text-xl font-semibold">
                    {stories.length === 0
                      ? 'Zatím nebyly vloženy žádné příběhy'
                      : 'Žádný příběh neodpovídá zvoleným filtrům'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {stories.length === 0
                      ? 'Přihlaste se a odešlete první anonymní zkušenost ke schválení redakci, nebo jako správce publikujte úvodní redakční příběhy.'
                      : 'Zkuste upravit hledané klíčové slovo nebo přepnout filtr typu léčebny.'}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  {stories.length > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setFacilityFilter('all');
                        setCountryFilter('all');
                      }}
                    >
                      Zrušit filtry
                    </Button>
                  ) : isAdmin ? (
                    <Button onClick={handleSeedFromEmptyState} disabled={seedingInitial}>
                      <Sparkles className="h-4 w-4" />
                      {seedingInitial
                        ? 'Nahrávám do databáze…'
                        : 'Nahrát 4 úvodní redakční příběhy'}
                    </Button>
                  ) : (
                    <Button onClick={handleOpenShareStory}>Odeslat první příběh ke schválení</Button>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Tier 1: Lead Featured Story */}
                {leadStory && (
                  <Card
                    onClick={() => setSelectedStoryId(leadStory.id)}
                    className="overflow-hidden cursor-pointer hover:border-foreground/30 transition-colors"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                      <div className="lg:col-span-5 bg-muted h-60 sm:h-72 lg:h-auto lg:min-h-[260px] overflow-hidden">
                        {resolveStoryImage(leadStory.coverImage) ? (
                          <img
                            src={resolveStoryImage(leadStory.coverImage)!}
                            alt={leadStory.title}
                            referrerPolicy="no-referrer"
                            className="block w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-8 text-muted-foreground">
                            <BookOpen className="h-10 w-10" />
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{FACILITY_TYPE_LABELS[leadStory.facilityType]}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {leadStory.facilityName}, {leadStory.city} ({leadStory.country})
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{formatCzechDate(leadStory.createdAt)}</span>
                          </div>

                          <h3 className="font-serif text-2xl sm:text-3xl font-semibold leading-snug text-foreground">
                            {leadStory.title}
                          </h3>

                          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                            {leadStory.excerpt}
                          </p>

                          {leadStory.deficiencyCategories.length > 0 && (
                            <p className="text-xs text-destructive font-medium flex items-center gap-1.5 pt-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                Zaznamenané nedostatky:{' '}
                                {leadStory.deficiencyCategories
                                  .map((d) => DEFICIENCY_LABELS[d])
                                  .join(' · ')}
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {leadStory.isAnonymous || !leadStory.authorName
                                ? 'Anonymní svědectví'
                                : leadStory.authorName}
                            </span>
                            {leadStory.authorAge ? <span>· {leadStory.authorAge}</span> : null}
                            {leadStory.isVerified && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span
                                  className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium"
                                  title="Ověřená zkušenost"
                                >
                                  <BadgeCheck className="h-4 w-4 shrink-0" />
                                  Ověřená zkušenost
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            {(() => {
                              const { avg, count } = getStoryCareRating(leadStory);
                              return (
                                <StarRating
                                  value={avg}
                                  size="sm"
                                  readOnly
                                  showValue
                                  count={count}
                                />
                              );
                            })()}
                            <span className="text-xs font-medium text-primary">
                              Číst příběh & diskuzi →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Tier 2: Secondary Stories Grid */}
                {secondaryStories.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {secondaryStories.map((story) => {
                      const { avg, count } = getStoryCareRating(story);
                      const img = resolveStoryImage(story.coverImage);
                      return (
                        <Card
                          key={story.id}
                          onClick={() => setSelectedStoryId(story.id)}
                          className="flex flex-col justify-between overflow-hidden cursor-pointer hover:border-foreground/30 transition-colors"
                        >
                          <div>
                            {img && (
                              <div className="aspect-[4/3] bg-muted border-b border-border overflow-hidden">
                                <img
                                  src={img}
                                  alt={story.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardHeader className="pb-2">
                              <p className="text-xs text-muted-foreground pb-1">
                                {FACILITY_TYPE_LABELS[story.facilityType]} · {story.city} (
                                {story.country})
                              </p>
                              <CardTitle className="text-xl leading-snug line-clamp-2">
                                {story.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                {story.excerpt}
                              </p>
                              {story.deficiencyCategories.length > 0 && (
                                <p className="text-xs text-destructive font-medium line-clamp-1">
                                  {story.deficiencyCategories
                                    .map((d) => DEFICIENCY_LABELS[d])
                                    .join(' · ')}
                                </p>
                              )}
                            </CardContent>
                          </div>

                          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground truncate inline-flex items-center gap-1.5">
                              {story.isVerified && (
                                <span
                                  className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium shrink-0"
                                  title="Ověřená zkušenost"
                                >
                                  <BadgeCheck className="h-4 w-4 shrink-0" />
                                </span>
                              )}
                              <span className="truncate">
                                {story.isAnonymous || !story.authorName
                                  ? 'Anonymně'
                                  : story.authorName}
                                {story.authorAge ? `, ${story.authorAge}` : ''}
                              </span>
                            </span>
                            <StarRating value={avg} size="sm" readOnly showValue count={count} />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Systemic Deficiencies Breakdown */}
        <DeficienciesOverview
          stories={stories}
          reports={facilityReports}
          onFilterDeficiency={handleFilterDeficiency}
        />

        {/* Interactive Google Map of CZ/SK Facilities */}
        <FacilityMapSection
          user={user}
          isAdmin={isAdmin}
          reports={facilityReports}
          stories={stories}
          onRequireAuth={() => setAuthModalOpen(true)}
          onSelectStory={(st) => setSelectedStoryId(st.id)}
          onWriteStoryForFacility={handleWriteStoryForFacility}
        />

        {/* 24/7 CZ & SK Crisis Helplines */}
        <CrisisBanner />
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-border bg-card py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-serif text-sm font-semibold text-foreground">Ticho za zdmi</p>
              <p>
                Nezávislý blog a mapa dostupnosti psychiatrické péče v České a Slovenské republice.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <a href="#pribehy" className="hover:text-foreground">
                Příběhy
              </a>
              <a href="#nedostatky" className="hover:text-foreground">
                Nedostatky
              </a>
              <a href="#mapa-zarizeni" className="hover:text-foreground">
                Mapa zařízení
              </a>
              <button
                type="button"
                onClick={handleOpenShareStory}
                className="hover:text-foreground cursor-pointer"
              >
                {isAdmin ? 'Přidat příběh' : 'Odeslat příběh ke schválení'}
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-border/60">
            <p>
              © {new Date().getFullYear()} Ondřej Anděl - Ticho za zdmi. Všechna práva vyhrazena.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />

      <StoryDetailModal
        story={selectedStory}
        onClose={() => setSelectedStoryId(null)}
        user={user}
        isAdmin={isAdmin}
        ratings={ratings}
        onRequireAuth={() => setAuthModalOpen(true)}
        onEditStory={handleEditStory}
      />

      <StoryEditorModal
        open={editorOpen}
        onOpenChange={(v) => {
          setEditorOpen(v);
          if (!v) setEditingSubmission(null);
        }}
        isAdmin={isAdmin}
        editingStory={editingStory}
        editingSubmission={editingSubmission}
        prefilledPlace={prefilledPlace}
      />

      {user && !isAdmin && (
        <Dialog open={mySubmissionsOpen} onOpenChange={setMySubmissionsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Moje odeslané příběhy</DialogTitle>
              <DialogDescription>
                Přehled příběhů, které jste odeslali redakci ke kontrole a schválení před
                zveřejněním.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {mySubmissions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Zatím jste neodeslali žádný příběh ke schválení.
                </p>
              ) : (
                mySubmissions.map((sub) => {
                  const publishedStory = sub.publishedStoryId
                    ? stories.find((st) => st.id === sub.publishedStoryId)
                    : undefined;
                  return (
                    <div
                      key={sub.id}
                      className="rounded-lg border border-border bg-card p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-serif text-base font-semibold leading-snug">
                            {sub.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {sub.facilityName}, {sub.city} ({sub.country}) · Odesláno{' '}
                            {formatCzechDate(sub.createdAt)}
                          </p>
                        </div>

                        {sub.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0">
                            <Clock className="h-3.5 w-3.5" />
                            Čeká na schválení
                          </span>
                        )}
                        {sub.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Schváleno a zveřejněno
                          </span>
                        )}
                        {sub.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive shrink-0">
                            <XCircle className="h-3.5 w-3.5" />
                            Zamítnuto redakcí
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {sub.excerpt}
                      </p>

                      {sub.reviewNote && (
                        <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-foreground">
                          <span className="font-medium">Vyjádření redakce: </span>
                          {sub.reviewNote}
                        </div>
                      )}

                      {sub.status === 'approved' && publishedStory && (
                        <div className="pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMySubmissionsOpen(false);
                              setSelectedStoryId(publishedStory.id);
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Zobrazit zveřejněný příběh
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isAdmin && (
        <AdminDashboardModal
          open={adminModalOpen}
          onOpenChange={setAdminModalOpen}
          stories={stories}
          submissions={submissions}
          reports={facilityReports}
          onCreateNew={() => {
            setEditingStory(null);
            setEditingSubmission(null);
            setPrefilledPlace(null);
            setEditorOpen(true);
          }}
          onEditStory={handleEditStory}
          onEditSubmission={handleEditSubmission}
        />
      )}
    </div>
  );
}
