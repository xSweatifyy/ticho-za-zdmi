import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { StarRating } from '@/src/components/StarRating';
import { Button } from '@/src/components/ui/button';
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
import {
  approveAndPublishSubmission,
  createStory,
  createStorySubmission,
  updateStory,
  updateStorySubmission,
} from '@/src/lib/repository';
import {
  DEFICIENCY_LABELS,
  FACILITY_TYPE_LABELS,
  type CountryCode,
  type DeficiencyCategory,
  type FacilityType,
  type MapPlaceResult,
  type Story,
  type StorySubmission,
} from '@/src/types/domain';

interface StoryEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  editingStory: Story | null;
  editingSubmission?: StorySubmission | null;
  prefilledPlace?: MapPlaceResult | null;
}

export function StoryEditorModal({
  open,
  onOpenChange,
  isAdmin,
  editingStory,
  editingSubmission = null,
  prefilledPlace,
}: StoryEditorModalProps) {
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState<FacilityType>('psychiatricka_nemocnice');
  const [country, setCountry] = useState<CountryCode>('CZ');
  const [city, setCity] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [deficiencies, setDeficiencies] = useState<DeficiencyCategory[]>([]);
  const [deficienciesSummary, setDeficienciesSummary] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isOfficialEditorial, setIsOfficialEditorial] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [authorAge, setAuthorAge] = useState('');
  const [careRating, setCareRating] = useState(3);
  const [staffRating, setStaffRating] = useState(3);
  const [buildingRating, setBuildingRating] = useState(2);
  const [accessibilityRating, setAccessibilityRating] = useState(3);
  const [coverImage, setCoverImage] = useState('buildingsHallway');
  const [privateAdminNote, setPrivateAdminNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingStory) {
      setTitle(editingStory.title);
      setExcerpt(editingStory.excerpt);
      setContent(editingStory.content);
      setFacilityName(editingStory.facilityName);
      setFacilityType(editingStory.facilityType);
      setCountry(editingStory.country);
      setCity(editingStory.city);
      setPlaceId(editingStory.placeId || '');
      setDeficiencies(editingStory.deficiencyCategories);
      setDeficienciesSummary(editingStory.deficienciesSummary);
      setIsAnonymous(editingStory.isAnonymous);
      setIsOfficialEditorial(editingStory.isOfficialEditorial);
      setIsVerified(Boolean(editingStory.isVerified));
      setAuthorName(editingStory.authorName || '');
      setAuthorAge(editingStory.authorAge || '');
      setCareRating(editingStory.initialCareRating || 3);
      setStaffRating(editingStory.initialStaffRating || 3);
      setBuildingRating(editingStory.initialBuildingRating || 2);
      setAccessibilityRating(editingStory.initialAccessibilityRating || 3);
      setCoverImage(editingStory.coverImage || 'buildingsHallway');
      setPrivateAdminNote('');
      return;
    }

    if (editingSubmission) {
      setTitle(editingSubmission.title);
      setExcerpt(editingSubmission.excerpt);
      setContent(editingSubmission.content);
      setFacilityName(editingSubmission.facilityName);
      setFacilityType(editingSubmission.facilityType);
      setCountry(editingSubmission.country);
      setCity(editingSubmission.city);
      setPlaceId(editingSubmission.placeId || '');
      setDeficiencies(editingSubmission.deficiencyCategories);
      setDeficienciesSummary(editingSubmission.deficienciesSummary);
      setIsAnonymous(editingSubmission.isAnonymous);
      setIsOfficialEditorial(false);
      setIsVerified(false);
      setAuthorName(editingSubmission.authorName || '');
      setAuthorAge(editingSubmission.authorAge || '');
      setCareRating(editingSubmission.initialCareRating || 3);
      setStaffRating(editingSubmission.initialStaffRating || 3);
      setBuildingRating(editingSubmission.initialBuildingRating || 2);
      setAccessibilityRating(editingSubmission.initialAccessibilityRating || 3);
      setCoverImage(editingSubmission.coverImage || 'buildingsHallway');
      setPrivateAdminNote(editingSubmission.privateAdminNote || '');
      return;
    }

    setTitle('');
    setExcerpt('');
    setContent('');
    setFacilityName(prefilledPlace?.name || '');
    const lowerPlaceName = (prefilledPlace?.name || '').toLowerCase();
    if (lowerPlaceName.includes('dětsk') || lowerPlaceName.includes('detsk')) {
      if (lowerPlaceName.includes('léčebn') || lowerPlaceName.includes('liečebn')) {
        setFacilityType('detska_psychiatricka_lecebna');
      } else if (lowerPlaceName.includes('nemocnic')) {
        setFacilityType('detska_psychiatricka_nemocnice');
      } else {
        setFacilityType('detska_psychiatrie');
      }
    } else if (lowerPlaceName.includes('léčebn') || lowerPlaceName.includes('liečebn')) {
      setFacilityType('psychiatricka_lecebna');
    } else if (lowerPlaceName.includes('krizov') || lowerPlaceName.includes('duševního zdraví')) {
      setFacilityType('krizove_centrum');
    } else {
      setFacilityType('psychiatricka_nemocnice');
    }
    setCountry(prefilledPlace?.country || 'CZ');
    setCity(
      prefilledPlace?.address
        ? prefilledPlace.address.split(',').slice(-2, -1)[0]?.trim() || ''
        : ''
    );
    setPlaceId(prefilledPlace?.placeId || '');
    setDeficiencies([]);
    setDeficienciesSummary('');
    setIsAnonymous(true);
    setIsOfficialEditorial(isAdmin);
    setIsVerified(false);
    setAuthorName('');
    setAuthorAge('');
    setCareRating(3);
    setStaffRating(3);
    setBuildingRating(2);
    setAccessibilityRating(3);
    setCoverImage('buildingsHallway');
    setPrivateAdminNote('');
  }, [open, editingStory, editingSubmission, prefilledPlace, isAdmin]);

  const toggleDeficiency = (cat: DeficiencyCategory) => {
    setDeficiencies((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  };

  const buildPayload = () => {
    const computedExcerpt =
      excerpt.trim() || content.trim().split('\n')[0].slice(0, 240) + '…';
    return {
      title,
      excerpt: computedExcerpt,
      content,
      facilityName,
      facilityType,
      country,
      city,
      placeId,
      deficiencyCategories: deficiencies,
      deficienciesSummary,
      isAnonymous,
      isOfficialEditorial: isAdmin ? isOfficialEditorial : false,
      isVerified: isAdmin ? isVerified : false,
      authorName: isAnonymous ? '' : authorName,
      authorAge,
      initialCareRating: careRating,
      initialStaffRating: staffRating,
      initialBuildingRating: buildingRating,
      initialAccessibilityRating: accessibilityRating,
      coverImage,
      privateAdminNote,
    };
  };

  const validateRequiredFields = () => {
    if (!title.trim() || !content.trim() || !facilityName.trim() || !city.trim()) {
      toast.error('Vyplňte prosím název příběhu, město, název zařízení a samotný text.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRequiredFields()) return;

    setSaving(true);
    try {
      const payload = buildPayload();

      if (editingStory) {
        await updateStory(editingStory.id, payload);
        toast.success('Příběh byl aktualizován.');
      } else if (editingSubmission) {
        await approveAndPublishSubmission(editingSubmission.id, payload);
        toast.success('Příběh byl upraven, schválen a zveřejněn na blogu.');
      } else if (isAdmin) {
        await createStory(payload);
        toast.success('Příběh byl bezpečně zveřejněn.');
      } else {
        await createStorySubmission(payload);
        toast.success('Příběh byl odeslán redakci ke schválení.');
      }
      onOpenChange(false);
    } catch {
      toast.error('Nepodařilo se uložit příběh do databáze.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraftSubmission = async () => {
    if (!editingSubmission || !validateRequiredFields()) return;
    setSaving(true);
    try {
      await updateStorySubmission(editingSubmission.id, buildPayload());
      toast.success('Úpravy návrhu byly uloženy. Příběh zůstává ve frontě ke schválení.');
      onOpenChange(false);
    } catch {
      toast.error('Nepodařilo se uložit úpravy návrhu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingStory
              ? 'Upravit zveřejněný příběh'
              : editingSubmission
                ? 'Upravit a schválit příběh čtenáře'
                : isAdmin
                  ? 'Publikovat nový příběh'
                  : 'Odeslat příběh ke schválení redakci'}
          </DialogTitle>
          <DialogDescription>
            {editingSubmission
              ? 'Můžete upravit text, údaje o zařízení nebo nastavit odznak ověřené zkušenosti a následně příběh zveřejnit.'
              : isAdmin
                ? 'Sdílejte zkušenost, která vás nebo vaše blízké změnila, a pomozte zmapovat skutečný stav péče v ČR a SR.'
                : 'Váš příběh se nezveřejní okamžitě — odešle se ke kontrole hlavnímu správci (redakci), který jej schválí, případně upraví nebo zamítne.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Titulek příběhu</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Např. Dva měsíce na otevřeném oddělení a co mi dalo sílu pokračovat"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Typ léčebny / péče</label>
              <Select
                value={facilityType}
                onValueChange={(v) => setFacilityType(v as FacilityType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FACILITY_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Stát</label>
              <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CZ">Česká republika</SelectItem>
                  <SelectItem value="SK">Slovenská republika</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Název zařízení nebo oddělení
              </label>
              <Input
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="Např. Psychiatrická nemocnice / Krizové centrum"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Město / region</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Např. Praha, Brno, Bratislava, Košice"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Krátké shrnutí pro výpis (nepovinné — jinak se vytvoří automaticky)
            </label>
            <Input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Jedna až dvě věty vystihující hlavní myšlenku příběhu…"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Text příběhu</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[180px]"
              placeholder="Popište svůj příběh, co vás změnilo, co vám pomohlo a s jakými překážkami jste se setkali…"
              required
            />
          </div>

          {/* Deficiencies */}
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/35">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                Nedostatky v personálu, budovách a dostupnosti
              </h4>
              <p className="text-xs text-muted-foreground">
                Označte systémové problémy, se kterými jste se během péče setkali.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.entries(DEFICIENCY_LABELS) as [DeficiencyCategory, string][]).map(
                ([key, label]) => {
                  const active = deficiencies.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDeficiency(key)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        active
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

            <Textarea
              value={deficienciesSummary}
              onChange={(e) => setDeficienciesSummary(e.target.value)}
              className="min-h-[76px]"
              placeholder="Konkrétní popis nedostatků (např. počet sester na oddělení, stav pokojů a koupelen, čekací lhůty)…"
            />
          </div>

          {/* Star Ratings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg border border-border bg-card">
            <div className="space-y-1">
              <span className="text-xs font-medium block">Celková kvalita péče</span>
              <StarRating value={careRating} onChange={setCareRating} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium block">Personál a lidský přístup</span>
              <StarRating value={staffRating} onChange={setStaffRating} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium block">Budova, pokoje a soukromí</span>
              <StarRating value={buildingRating} onChange={setBuildingRating} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium block">Dostupnost pomoci včas</span>
              <StarRating value={accessibilityRating} onChange={setAccessibilityRating} />
            </div>
          </div>

          {/* Optional Identity & Anonymity */}
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="font-medium">
                  Publikovat anonymně (bez zobrazení jména)
                </span>
              </label>

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOfficialEditorial}
                      onChange={(e) => setIsOfficialEditorial(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span>Redakční článek správce</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVerified}
                      onChange={(e) => setIsVerified(e.target.checked)}
                      className="h-4 w-4 rounded border-input accent-emerald-700"
                    />
                    <span className="font-medium text-emerald-800 dark:text-emerald-300">
                      Ověřená zkušenost (zobrazí odznak)
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                disabled={isAnonymous}
                placeholder={
                  isAnonymous
                    ? 'Jméno skryto (anonymní režim)'
                    : 'Jen křestní jméno nebo přezdívka (nepovinné)'
                }
              />
              <Input
                value={authorAge}
                onChange={(e) => setAuthorAge(e.target.value)}
                placeholder="Věk (nepovinné, např. 32 let)"
              />
            </div>

            {isAdmin && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-foreground">
                  Doprovodná dokumentární fotografie
                </label>
                <Select value={coverImage} onValueChange={setCoverImage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heroCorridor">Historické nádvoří léčebny</SelectItem>
                    <SelectItem value="buildingsHallway">Chodba staršího pavilonu</SelectItem>
                    <SelectItem value="careGarden">Lavička v nemocničním parku</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {editingSubmission && editingSubmission.privateAdminNote ? (
              <div className="space-y-1 p-3 rounded-md border border-primary/25 bg-primary/5 text-xs">
                <p className="font-medium text-foreground">
                  Soukromý vzkaz od autora pro redakci:
                </p>
                <p className="text-muted-foreground whitespace-pre-line">
                  {editingSubmission.privateAdminNote}
                </p>
              </div>
            ) : (
              !editingStory && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-foreground">
                    Soukromý vzkaz pouze pro správce blogu (nepovinné, nezveřejňuje se)
                  </label>
                  <Input
                    value={privateAdminNote}
                    onChange={(e) => setPrivateAdminNote(e.target.value)}
                    placeholder="Např. upřesnění pro ověření nebo kontakt, pokud chcete odpověď…"
                  />
                </div>
              )
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            {editingSubmission && (
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => void handleSaveDraftSubmission()}
              >
                Uložit úpravy bez zveřejnění
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving
                ? 'Ukládám…'
                : editingStory
                  ? 'Uložit změny'
                  : editingSubmission
                    ? 'Schválit a zveřejnit'
                    : isAdmin
                      ? 'Zveřejnit příběh'
                      : 'Odeslat ke schválení'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
