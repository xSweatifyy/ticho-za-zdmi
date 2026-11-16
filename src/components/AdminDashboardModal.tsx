import { useState } from 'react';
import {
  BadgeCheck,
  BookPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Lock,
  MessageSquare,
  Shield,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { ADMIN_EDITORIAL_SEEDS } from '@/src/data/editorialSeeds';
import {
  approveAndPublishSubmission,
  createStory,
  deleteFacilityReport,
  deleteStory,
  deleteStorySubmission,
  rejectStorySubmission,
  setStoryVerified,
} from '@/src/lib/repository';
import { formatCzechDate } from '@/src/lib/utils';
import {
  DEFICIENCY_LABELS,
  FACILITY_TYPE_LABELS,
  type FacilityReport,
  type Story,
  type StorySubmission,
} from '@/src/types/domain';

interface AdminDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stories: Story[];
  submissions: StorySubmission[];
  reports: FacilityReport[];
  onCreateNew: () => void;
  onEditStory: (story: Story) => void;
  onEditSubmission: (submission: StorySubmission) => void;
}

export function AdminDashboardModal({
  open,
  onOpenChange,
  stories,
  submissions,
  reports,
  onCreateNew,
  onEditStory,
  onEditSubmission,
}: AdminDashboardModalProps) {
  const [seeding, setSeeding] = useState(false);
  const [togglingVerifyId, setTogglingVerifyId] = useState<string | null>(null);
  const [processingSubmissionId, setProcessingSubmissionId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingDeleteStoryId, setPendingDeleteStoryId] = useState<string | null>(null);
  const [pendingDeleteReportId, setPendingDeleteReportId] = useState<string | null>(null);

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending');
  const resolvedSubmissions = submissions.filter((s) => s.status !== 'pending');

  const handleSeedEditorialStories = async () => {
    setSeeding(true);
    try {
      for (const seed of ADMIN_EDITORIAL_SEEDS) {
        await createStory(seed);
      }
      toast.success('4 úvodní redakční příběhy byly uloženy do databáze.');
    } catch {
      toast.error('Nepodařilo se nahrát úvodní příběhy.');
    } finally {
      setSeeding(false);
    }
  };

  const handleApproveSubmission = async (sub: StorySubmission) => {
    setProcessingSubmissionId(sub.id);
    try {
      await approveAndPublishSubmission(sub.id, {
        title: sub.title,
        excerpt: sub.excerpt,
        content: sub.content,
        facilityName: sub.facilityName,
        facilityType: sub.facilityType,
        country: sub.country,
        city: sub.city,
        placeId: sub.placeId,
        deficiencyCategories: sub.deficiencyCategories,
        deficienciesSummary: sub.deficienciesSummary,
        isAnonymous: sub.isAnonymous,
        isOfficialEditorial: false,
        isVerified: false,
        authorName: sub.authorName,
        authorAge: sub.authorAge,
        initialCareRating: sub.initialCareRating,
        initialStaffRating: sub.initialStaffRating,
        initialBuildingRating: sub.initialBuildingRating,
        initialAccessibilityRating: sub.initialAccessibilityRating,
        coverImage: sub.coverImage || 'buildingsHallway',
      });
      toast.success('Příběh byl schválen a zveřejněn na blogu.');
    } catch {
      toast.error('Nepodařilo se schválit příběh.');
    } finally {
      setProcessingSubmissionId(null);
    }
  };

  const handleConfirmReject = async (subId: string) => {
    setProcessingSubmissionId(subId);
    try {
      await rejectStorySubmission(subId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      toast.success('Příběh byl zamítnut.');
    } catch {
      toast.error('Nepodařilo se zamítnout příběh.');
    } finally {
      setProcessingSubmissionId(null);
    }
  };

  const handleDeleteSubmission = async (subId: string) => {
    setProcessingSubmissionId(subId);
    try {
      await deleteStorySubmission(subId);
      toast.success('Záznam návrhu byl odstraněn.');
    } catch {
      toast.error('Nepodařilo se smazat návrh.');
    } finally {
      setProcessingSubmissionId(null);
    }
  };

  const handleToggleVerified = async (story: Story) => {
    const nextState = !story.isVerified;
    setTogglingVerifyId(story.id);
    try {
      await setStoryVerified(story.id, nextState);
      toast.success(
        nextState
          ? 'Příběh byl označen jako ověřená zkušenost.'
          : 'Označení ověřené zkušenosti bylo odebráno.'
      );
    } catch {
      toast.error('Nepodařilo se změnit stav ověření příběhu.');
    } finally {
      setTogglingVerifyId(null);
    }
  };

  const handleDeleteStory = async (id: string) => {
    try {
      await deleteStory(id);
      setPendingDeleteStoryId(null);
      toast.success('Příběh byl smazán.');
    } catch {
      toast.error('Smazání příběhu selhalo.');
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteFacilityReport(id);
      setPendingDeleteReportId(null);
      toast.success('Hlášení zařízení bylo smazáno.');
    } catch {
      toast.error('Smazání hlášení selhalo.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary text-xs font-medium">
            <Shield className="h-4 w-4" />
            <span>Chráněná správa obsahu</span>
          </div>
          <DialogTitle>Administrace příběhů, schvalování a hlášení</DialogTitle>
          <DialogDescription>
            Schvalujte, upravujte nebo zamítejte příběhy zaslané čtenáři, publikujte redakční
            články a dohlížejte na hlášení z mapy.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3 pb-2">
          <Button
            onClick={() => {
              onOpenChange(false);
              onCreateNew();
            }}
          >
            <BookPlus className="h-4 w-4" />
            Napsat nový příběh
          </Button>

          {stories.length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeedEditorialStories}
              disabled={seeding}
            >
              <Sparkles className="h-4 w-4" />
              {seeding ? 'Nahrávám do databáze…' : 'Nahrát 4 úvodní redakční příběhy'}
            </Button>
          )}
        </div>

        <Tabs defaultValue={pendingSubmissions.length > 0 ? 'pending' : 'stories'} className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="pending">
              Ke schválení ({pendingSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="stories">Zveřejněné ({stories.length})</TabsTrigger>
            <TabsTrigger value="reports">Hlášení na mapě ({reports.length})</TabsTrigger>
          </TabsList>

          {/* Pending Editorial Approval Queue */}
          <TabsContent value="pending" className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
            {pendingSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Momentálně nečekají žádné nové příběhy od čtenářů na schválení.
              </p>
            ) : (
              pendingSubmissions.map((sub) => {
                const isExpanded = expandedSubmissionId === sub.id;
                const isRejecting = rejectingId === sub.id;
                const isBusy = processingSubmissionId === sub.id;

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-lg border border-border bg-card space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            Čeká na schválení
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{FACILITY_TYPE_LABELS[sub.facilityType]}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {sub.city} ({sub.country})
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{formatCzechDate(sub.createdAt)}</span>
                        </div>
                        <p className="font-serif font-semibold text-base text-foreground">
                          {sub.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sub.facilityName} ·{' '}
                          {sub.isAnonymous || !sub.authorName ? 'Anonymní autor' : sub.authorName}
                          {sub.authorAge ? ` (${sub.authorAge})` : ''} · Hodnocení péče{' '}
                          {sub.initialCareRating}/5
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 self-start"
                        onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Skrýt text
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Celý text
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {sub.excerpt}
                    </p>

                    {isExpanded && (
                      <div className="space-y-3 p-3.5 rounded-md bg-muted/40 border border-border text-xs sm:text-sm">
                        <div className="whitespace-pre-line text-foreground leading-relaxed">
                          {sub.content}
                        </div>

                        {(sub.deficiencyCategories.length > 0 || sub.deficienciesSummary) && (
                          <div className="pt-2 border-t border-border/60 space-y-1 text-xs">
                            {sub.deficiencyCategories.length > 0 && (
                              <p className="font-medium text-destructive">
                                Nedostatky:{' '}
                                {sub.deficiencyCategories
                                  .map((c) => DEFICIENCY_LABELS[c])
                                  .join(', ')}
                              </p>
                            )}
                            {sub.deficienciesSummary && (
                              <p className="text-muted-foreground">{sub.deficienciesSummary}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {sub.privateAdminNote && (
                      <div className="p-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs flex items-start gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-foreground block">
                            Soukromý vzkaz redakci:
                          </span>
                          <span className="text-muted-foreground">{sub.privateAdminNote}</span>
                        </div>
                      </div>
                    )}

                    {isRejecting ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                        <Input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Poznámka / důvod zamítnutí pro autora (nepovinné)…"
                          className="h-9 text-xs flex-1"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handleConfirmReject(sub.id)}
                          >
                            Potvrdit zamítnutí
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason('');
                            }}
                          >
                            Zrušit
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleApproveSubmission(sub)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Schválit a zveřejnit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => {
                            onOpenChange(false);
                            onEditSubmission(sub);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Upravit před schválením
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => {
                            setRejectingId(sub.id);
                            setRejectReason('');
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Zamítnout
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {resolvedSubmissions.length > 0 && (
              <div className="pt-4 border-t border-border space-y-2.5">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Vyřízené žádosti ({resolvedSubmissions.length})
                </h4>
                {resolvedSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-lg border border-border bg-muted/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={
                            sub.status === 'approved'
                              ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                              : 'text-destructive font-medium'
                          }
                        >
                          {sub.status === 'approved' ? 'Schváleno' : 'Zamítnuto'}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {formatCzechDate(sub.updatedAt || sub.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{sub.title}</p>
                      {sub.reviewNote && (
                        <p className="text-xs text-muted-foreground truncate">
                          Poznámka: {sub.reviewNote}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={processingSubmissionId === sub.id}
                      onClick={() => void handleDeleteSubmission(sub.id)}
                      className="text-destructive hover:text-destructive shrink-0 self-start sm:self-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Odstranit záznam
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Published Stories */}
          <TabsContent value="stories" className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {stories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Databáze příběhů je zatím prázdná. Můžete napsat vlastní příběh nebo jedním
                kliknutím nahrát 4 připravené redakční články.
              </p>
            ) : (
              stories.map((story) => (
                <div
                  key={story.id}
                  className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{FACILITY_TYPE_LABELS[story.facilityType]}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {story.city} ({story.country})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatCzechDate(story.createdAt)}</span>
                      {story.isEncrypted && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Šifrováno
                          </span>
                        </>
                      )}
                      {story.isVerified && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Ověřená zkušenost
                          </span>
                        </>
                      )}
                    </div>
                    <p className="font-serif font-semibold text-base text-foreground truncate">
                      {story.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {story.facilityName} ·{' '}
                      {story.isAnonymous || !story.authorName
                        ? 'Anonymní autor'
                        : story.authorName}
                      {story.authorAge ? ` (${story.authorAge})` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      variant={story.isVerified ? 'secondary' : 'outline'}
                      size="sm"
                      disabled={togglingVerifyId === story.id}
                      onClick={() => void handleToggleVerified(story)}
                      title={
                        story.isVerified
                          ? 'Zrušit označení ověřené zkušenosti'
                          : 'Označit příběh jako ověřenou zkušenost'
                      }
                    >
                      <BadgeCheck
                        className={`h-3.5 w-3.5 ${story.isVerified ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
                      />
                      {story.isVerified ? 'Ověřeno' : 'Ověřit'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        onEditStory(story);
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Upravit
                    </Button>

                    {pendingDeleteStoryId === story.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteStory(story.id)}
                        >
                          Potvrdit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDeleteStoryId(null)}
                        >
                          Zrušit
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPendingDeleteStoryId(story.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Smazat
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Map Facility Reports */}
          <TabsContent value="reports" className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Zatím nebyla odeslána žádná hodnocení konkrétních zařízení z mapy.
              </p>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {rep.facilityName} ({rep.country}) · Péče {rep.careRating}/5 ·{' '}
                      {formatCzechDate(rep.createdAt)}
                    </p>
                    <p className="text-sm text-foreground line-clamp-2">{rep.note}</p>
                  </div>

                  <div className="shrink-0">
                    {pendingDeleteReportId === rep.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteReport(rep.id)}
                        >
                          Potvrdit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDeleteReportId(null)}
                        >
                          Zrušit
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPendingDeleteReportId(rep.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Smazat
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
