import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Copy,
  Edit3,
  MessageSquare,
  Share2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { StarRating } from '@/src/components/StarRating';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Separator } from '@/src/components/ui/separator';
import { Textarea } from '@/src/components/ui/textarea';
import { resolveStoryImage } from '@/src/lib/media';
import {
  createComment,
  deleteComment,
  deleteStory,
  setStoryVerified,
  subscribeStoryComments,
  upsertStoryRating,
} from '@/src/lib/repository';
import { formatCzechDate } from '@/src/lib/utils';
import {
  DEFICIENCY_LABELS,
  FACILITY_TYPE_LABELS,
  type Story,
  type StoryComment,
  type StoryRating,
} from '@/src/types/domain';

interface StoryDetailModalProps {
  story: Story | null;
  onClose: () => void;
  user: User | null;
  isAdmin: boolean;
  ratings: StoryRating[];
  onRequireAuth: () => void;
  onEditStory: (story: Story) => void;
}

export function StoryDetailModal({
  story,
  onClose,
  user,
  isAdmin,
  ratings,
  onRequireAuth,
  onEditStory,
}: StoryDetailModalProps) {
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentNickname, setCommentNickname] = useState('');
  const [commentAge, setCommentAge] = useState('');
  const [commentAnonymous, setCommentAnonymous] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);

  const [myCare, setMyCare] = useState(4);
  const [myStaff, setMyStaff] = useState(4);
  const [myBuilding, setMyBuilding] = useState(3);
  const [myAccess, setMyAccess] = useState(3);
  const [savingRating, setSavingRating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [togglingVerified, setTogglingVerified] = useState(false);

  const shareUrl = useMemo(() => {
    if (!story || typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('pribeh', story.id);
    url.hash = '';
    return url.toString();
  }, [story]);

  const storyRatings = useMemo(() => {
    if (!story) return [];
    return ratings.filter((r) => r.storyId === story.id);
  }, [story, ratings]);

  const myExistingRating = useMemo(() => {
    if (!user) return undefined;
    return storyRatings.find((r) => r.raterUid === user.uid);
  }, [storyRatings, user]);

  useEffect(() => {
    if (myExistingRating) {
      setMyCare(myExistingRating.careRating);
      setMyStaff(myExistingRating.staffRating);
      setMyBuilding(myExistingRating.buildingRating);
      setMyAccess(myExistingRating.accessibilityRating);
    } else if (story) {
      setMyCare(story.initialCareRating || 3);
      setMyStaff(story.initialStaffRating || 3);
      setMyBuilding(story.initialBuildingRating || 2);
      setMyAccess(story.initialAccessibilityRating || 3);
    }
    setConfirmDelete(false);
    setCopiedLink(false);
  }, [myExistingRating, story]);

  useEffect(() => {
    if (!story) {
      setComments([]);
      return;
    }
    const unsub = subscribeStoryComments(
      story.id,
      (list) => setComments(list),
      () => {
        /* Handled gracefully */
      }
    );
    return () => unsub();
  }, [story]);

  if (!story) return null;

  const totalVotes = storyRatings.length + (story.initialCareRating > 0 ? 1 : 0);
  const avgCare =
    totalVotes > 0
      ? (storyRatings.reduce((a, r) => a + r.careRating, 0) +
          (story.initialCareRating > 0 ? story.initialCareRating : 0)) /
        totalVotes
      : 0;
  const avgStaff =
    totalVotes > 0
      ? (storyRatings.reduce((a, r) => a + r.staffRating, 0) +
          (story.initialStaffRating > 0 ? story.initialStaffRating : 0)) /
        totalVotes
      : 0;
  const avgBuilding =
    totalVotes > 0
      ? (storyRatings.reduce((a, r) => a + r.buildingRating, 0) +
          (story.initialBuildingRating > 0 ? story.initialBuildingRating : 0)) /
        totalVotes
      : 0;
  const avgAccess =
    totalVotes > 0
      ? (storyRatings.reduce((a, r) => a + r.accessibilityRating, 0) +
          (story.initialAccessibilityRating > 0 ? story.initialAccessibilityRating : 0)) /
        totalVotes
      : 0;

  const coverSrc = resolveStoryImage(story.coverImage);

  const handleSaveRating = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setSavingRating(true);
    try {
      await upsertStoryRating({
        storyId: story.id,
        careRating: myCare,
        staffRating: myStaff,
        buildingRating: myBuilding,
        accessibilityRating: myAccess,
        existingRating: myExistingRating,
      });
      toast.success('Vaše hvězdičkové hodnocení kvality péče bylo uloženo.');
    } catch {
      toast.error('Hodnocení se nepodařilo uložit.');
    } finally {
      setSavingRating(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!commentBody.trim()) return;

    setSendingComment(true);
    try {
      await createComment({
        storyId: story.id,
        body: commentBody,
        authorNickname: commentAnonymous ? '' : commentNickname,
        authorAge: commentAge,
        isAnonymous: commentAnonymous,
      });
      setCommentBody('');
      setCommentNickname('');
      setCommentAge('');
      toast.success('Komentář byl přidán do diskuze.');
    } catch {
      toast.error('Nepodařilo se odeslat komentář.');
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteStory = async () => {
    try {
      await deleteStory(story.id);
      toast.success('Příběh byl trvale odstraněn.');
      onClose();
    } catch {
      toast.error('Nepodařilo se smazat příběh.');
    }
  };

  const handleToggleVerified = async () => {
    const nextState = !story.isVerified;
    setTogglingVerified(true);
    try {
      await setStoryVerified(story.id, nextState);
      toast.success(
        nextState
          ? 'Příběh byl označen jako ověřená zkušenost.'
          : 'Označení ověřené zkušenosti bylo odebráno.'
      );
    } catch {
      toast.error('Nepodařilo se změnit stav ověření.');
    } finally {
      setTogglingVerified(false);
    }
  };

  const authorLabel =
    story.isAnonymous || !story.authorName ? 'Anonymní svědectví' : story.authorName;

  const shareText = `${story.title} — ${story.facilityName} (${story.city})`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Odkaz na příběh byl zkopírován do schránky.');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Odkaz se nepodařilo zkopírovat.');
    }
  };

  const handleWebShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: story.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Fallback to clipboard copy if Web Share API is blocked in an embedded context
      }
    }
    await handleCopyLink();
  };

  return (
    <Dialog open={Boolean(story)} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pb-1">
            <span>{FACILITY_TYPE_LABELS[story.facilityType]}</span>
            <span aria-hidden="true">·</span>
            <span>
              {story.facilityName}, {story.city} ({story.country})
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatCzechDate(story.createdAt)}</span>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl leading-tight">{story.title}</DialogTitle>
          <DialogDescription className="pt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-foreground">{authorLabel}</span>
            {story.authorAge && (
              <>
                <span aria-hidden="true">·</span>
                <span>{story.authorAge}</span>
              </>
            )}
            {story.isOfficialEditorial && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Redakční záznam
                </span>
              </>
            )}
            {story.isVerified && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium"
                  title="Ověřeno správcem platformy"
                >
                  <BadgeCheck className="h-4 w-4 shrink-0" />
                  Ověřená zkušenost
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 shrink-0">
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-muted border border-border">
            <span className="text-xs font-medium text-foreground">Správa příběhu (Admin)</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={story.isVerified ? 'secondary' : 'outline'}
                size="sm"
                disabled={togglingVerified}
                onClick={() => void handleToggleVerified()}
              >
                <BadgeCheck
                  className={`h-3.5 w-3.5 ${story.isVerified ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
                />
                {story.isVerified ? 'Ověřeno' : 'Označit jako ověřený'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEditStory(story);
                }}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Upravit
              </Button>
              {!confirmDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Smazat
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button variant="destructive" size="sm" onClick={handleDeleteStory}>
                    Potvrdit smazání
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Zrušit
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {coverSrc && (
          <figure className="w-full shrink-0 rounded-lg overflow-hidden border border-border bg-muted">
            <img
              src={coverSrc}
              alt={story.title}
              referrerPolicy="no-referrer"
              className="block w-full h-56 sm:h-72 object-cover"
            />
          </figure>
        )}

        {/* Long-form narrative */}
        <article className="w-full shrink-0 max-w-prose space-y-4 text-[15px] sm:text-base leading-relaxed text-foreground">
          {story.content.split('\n\n').map((paragraph, idx) => (
            <p
              key={idx}
              className={
                idx === 0
                  ? 'first-letter:text-5xl first-letter:font-serif first-letter:font-semibold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none'
                  : ''
              }
            >
              {paragraph}
            </p>
          ))}
        </article>

        {/* Documented deficiencies */}
        {(story.deficiencyCategories.length > 0 || story.deficienciesSummary) && (
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Zaznamenané nedostatky v péči, personálu a budovách</span>
            </div>
            {story.deficiencyCategories.length > 0 && (
              <p className="text-xs font-medium text-foreground">
                Oblasti:{' '}
                {story.deficiencyCategories.map((d) => DEFICIENCY_LABELS[d]).join(' · ')}
              </p>
            )}
            {story.deficienciesSummary && (
              <p className="text-sm text-foreground/90 leading-relaxed">
                {story.deficienciesSummary}
              </p>
            )}
          </div>
        )}

        {/* Quick Social Share Bar (Web Share API + Social Targets) */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">Sdílet tento příběh</p>
            <p className="text-xs text-muted-foreground">
              Pomozte zvýšit povědomí o kvalitě psychiatrické péče.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={handleWebShare}>
              <Share2 className="h-3.5 w-3.5" />
              Sdílet
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={facebookShareUrl} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              aria-label="Kopírovat odkaz na příběh"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink ? 'Zkopírováno' : 'Odkaz'}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Care Quality Star Ratings */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-serif text-lg font-semibold">Hodnocení kvality péče</h4>
              <p className="text-xs text-muted-foreground">
                Průměr z {totalVotes}{' '}
                {totalVotes === 1 ? 'hodnocení' : 'hodnocení'} (příběh + čtenáři)
              </p>
            </div>
            <StarRating value={avgCare} readOnly showValue count={totalVotes} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/50 text-xs">
            <div>
              <span className="text-muted-foreground block mb-1">Celková péče</span>
              <StarRating value={avgCare} size="sm" readOnly showValue />
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Personál</span>
              <StarRating value={avgStaff} size="sm" readOnly showValue />
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Budova a pokoje</span>
              <StarRating value={avgBuilding} size="sm" readOnly showValue />
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Dostupnost</span>
              <StarRating value={avgAccess} size="sm" readOnly showValue />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
            <p className="text-xs font-medium text-foreground">
              {myExistingRating
                ? 'Upravit vaše hvězdičkové hodnocení:'
                : 'Ohodnoťte kvalitu péče v tomto příběhu nebo zařízení:'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Celková péče</span>
                <StarRating value={myCare} onChange={setMyCare} size="sm" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Personál</span>
                <StarRating value={myStaff} onChange={setMyStaff} size="sm" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Budovy a soukromí</span>
                <StarRating value={myBuilding} onChange={setMyBuilding} size="sm" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Dostupnost pomoci</span>
                <StarRating value={myAccess} onChange={setMyAccess} size="sm" />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleSaveRating} disabled={savingRating}>
                {savingRating
                  ? 'Ukládám…'
                  : user
                    ? myExistingRating
                      ? 'Aktualizovat hodnocení'
                      : 'Uložit hodnocení'
                    : 'Přihlásit se a hodnotit'}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Discussion & Comments */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h4 className="font-serif text-lg font-semibold">
              Diskuze a sdílení zkušeností ({comments.length})
            </h4>
          </div>

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Zatím žádné komentáře. Podělte se bezpečně o svou zkušenost nebo slovo podpory.
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((cmt) => {
                const canDelete = isAdmin || (user && cmt.authorUid === user.uid);
                return (
                  <div
                    key={cmt.id}
                    className="p-3.5 rounded-lg border border-border bg-muted/25 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        <strong className="font-medium text-foreground">
                          {cmt.isAnonymous || !cmt.authorNickname
                            ? 'Anonymní čtenář'
                            : cmt.authorNickname}
                        </strong>
                        {cmt.authorAge ? ` · ${cmt.authorAge}` : ''}
                        {' · '}
                        {formatCzechDate(cmt.createdAt)}
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void deleteComment(story.id, cmt.id)}
                          className="text-destructive hover:opacity-80 p-1 cursor-pointer"
                          aria-label="Smazat komentář"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {cmt.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleSendComment} className="space-y-3 pt-2">
            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Napište svou zkušenost, podporu nebo poznatek z daného zařízení…"
              className="min-h-[85px]"
              required
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={commentAnonymous}
                  onChange={(e) => setCommentAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span>Anonymně</span>
              </label>
              {!commentAnonymous && (
                <Input
                  value={commentNickname}
                  onChange={(e) => setCommentNickname(e.target.value)}
                  placeholder="Jméno / přezdívka (nepovinné)"
                  className="h-9 text-xs"
                />
              )}
              <Input
                value={commentAge}
                onChange={(e) => setCommentAge(e.target.value)}
                placeholder="Věk (nepovinné)"
                className="h-9 text-xs sm:w-36"
              />
              <Button type="submit" size="sm" disabled={sendingComment} className="shrink-0">
                {sendingComment
                  ? 'Odesílám…'
                  : user
                    ? 'Přidat do diskuze'
                    : 'Přihlásit se a komentovat'}
              </Button>
            </div>
          </form>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
