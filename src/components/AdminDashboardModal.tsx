import { useState } from 'react';
import { BadgeCheck, BookPlus, Edit3, Lock, Shield, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { ADMIN_EDITORIAL_SEEDS } from '@/src/data/editorialSeeds';
import {
  createStory,
  deleteFacilityReport,
  deleteStory,
  setStoryVerified,
} from '@/src/lib/repository';
import { formatCzechDate } from '@/src/lib/utils';
import {
  FACILITY_TYPE_LABELS,
  type FacilityReport,
  type Story,
} from '@/src/types/domain';

interface AdminDashboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stories: Story[];
  reports: FacilityReport[];
  onCreateNew: () => void;
  onEditStory: (story: Story) => void;
}

export function AdminDashboardModal({
  open,
  onOpenChange,
  stories,
  reports,
  onCreateNew,
  onEditStory,
}: AdminDashboardModalProps) {
  const [seeding, setSeeding] = useState(false);
  const [togglingVerifyId, setTogglingVerifyId] = useState<string | null>(null);
  const [pendingDeleteStoryId, setPendingDeleteStoryId] = useState<string | null>(null);
  const [pendingDeleteReportId, setPendingDeleteReportId] = useState<string | null>(null);

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
          <DialogTitle>Administrace příběhů a hlášení</DialogTitle>
          <DialogDescription>
            Přidávejte vlastní redakční příběhy, upravujte nebo mažte příspěvky a dohlížejte na
            hlášení z interaktivní mapy.
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

        <Tabs defaultValue="stories" className="w-full">
          <TabsList>
            <TabsTrigger value="stories">Příběhy ({stories.length})</TabsTrigger>
            <TabsTrigger value="reports">Hlášení na mapě ({reports.length})</TabsTrigger>
          </TabsList>

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
