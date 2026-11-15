import { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { auth, googleProvider } from '@/src/lib/firebase';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showFallbackTabLink, setShowFallbackTabLink] = useState(false);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setShowFallbackTabLink(false);

    // Invoke signInWithPopup synchronously inside click gesture so browsers allow the popup
    const popupPromise = signInWithPopup(auth, googleProvider);
    setLoading(true);

    try {
      await popupPromise;
      toast.success('Úspěšně přihlášeno přes Google účet.');
      onOpenChange(false);
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : '';
      const rawMessage = error instanceof Error ? error.message : String(error);

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(
          'Přihlašovací okno bylo zavřeno před dokončením. Pokud okno prohlížeč zablokoval, zkuste přihlášení přesměrováním nebo v nové kartě.'
        );
        setShowFallbackTabLink(true);
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'Prohlížeč zablokoval vyskakovací okno. Povolte vyskakovací okna pro tuto stránku nebo použijte přesměrování níže.'
        );
        setShowFallbackTabLink(true);
      } else if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setAuthError(
          `Doména "${host}" není v Firebase Console povolena pro OAuth přihlášení (auth/unauthorized-domain). Přidejte ji v Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (code === 'auth/operation-not-allowed') {
        setAuthError(
          'Přihlašování přes Google není v tomto Firebase projektu povoleno (auth/operation-not-allowed). Aktivujte Google provider v Firebase Console.'
        );
      } else {
        setAuthError(`Přihlášení se nezdařilo (${code || rawMessage}). Zkuste to prosím znovu.`);
        setShowFallbackTabLink(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedirectFallback = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : '';
      setAuthError(`Přesměrování se nezdařilo (${code || 'chyba'}). Otevřete prosím aplikaci v nové kartě.`);
      setShowFallbackTabLink(true);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Přihlášení přes Google účet</DialogTitle>
          <DialogDescription>
            Přihlášení přes Google účet chrání diskuzi a hodnocení před automatizovaným spamem.
            Vaše jméno ani e-mail se u anonymních příběhů a komentářů nikdy nezobrazují.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {authError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3.5 text-xs text-foreground space-y-2">
              <p className="flex items-start gap-2 font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </p>
              {showFallbackTabLink && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRedirectFallback}
                    disabled={loading}
                  >
                    Zkusit přesměrování
                  </Button>
                  {typeof window !== 'undefined' && (
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={window.location.href} target="_blank" rel="noopener noreferrer">
                        Otevřít v nové kartě
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <Button onClick={handleGoogleLogin} disabled={loading} className="w-full h-11">
            {loading ? 'Probíhá přihlašování…' : 'Pokračovat přes Google účet'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
