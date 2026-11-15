import { Building2, Clock, ShieldAlert, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { DEFICIENCY_LABELS, type DeficiencyCategory, type FacilityReport, type Story } from '@/src/types/domain';

interface DeficienciesOverviewProps {
  stories: Story[];
  reports: FacilityReport[];
  onFilterDeficiency?: (keyword: string) => void;
}

export function DeficienciesOverview({
  stories,
  reports,
  onFilterDeficiency,
}: DeficienciesOverviewProps) {
  const counts: Record<DeficiencyCategory, number> = {
    staff_shortage: 0,
    building_condition: 0,
    long_wait_times: 0,
    lack_of_privacy: 0,
    overmedication: 0,
    communication: 0,
    hygiene: 0,
    accessibility: 0,
  };

  for (const s of stories) {
    for (const d of s.deficiencyCategories) {
      counts[d] = (counts[d] || 0) + 1;
    }
  }
  for (const r of reports) {
    for (const d of r.deficiencies) {
      counts[d] = (counts[d] || 0) + 1;
    }
  }

  const pillars = [
    {
      icon: Users,
      category: 'staff_shortage' as DeficiencyCategory,
      title: 'Nedostatek personálu a přetížení týmů',
      description:
        'Na jednoho lékaře či sestru často připadají desítky pacientů. Chybí kliničtí psychologové, sociální pracovníci i prostor pro individuální rozhovor mimo pouhé podávání léků.',
      searchTerm: 'personál',
    },
    {
      icon: Building2,
      category: 'building_condition' as DeficiencyCategory,
      title: 'Zastaralé budovy a ztráta soukromí',
      description:
        'Vícelůžkové pokoje bez oddělení soukromí, mříže, neudržované společné sprchy a toalety či chybějící klidové zóny prohlubují úzkost v nejtěžších chvílích léčby.',
      searchTerm: 'budov',
    },
    {
      icon: Clock,
      category: 'long_wait_times' as DeficiencyCategory,
      title: 'Čekací lhůty a regionální propast',
      description:
        'Zejména v dětské a ambulantní psychiatrii v ČR i na Slovensku lidé čekají měsíce na první vyšetření. Krizová centra jsou soustředěna téměř výhradně do velkých měst.',
      searchTerm: 'čekac',
    },
    {
      icon: ShieldAlert,
      category: 'communication' as DeficiencyCategory,
      title: 'Komunikace, medikace a respekt',
      description:
        'Pacienti a rodiny opakovaně upozorňují na nedostatečné vysvětlení léčby, spoléhání na vysoké dávky medikace bez psychoterapie a strach ze stigmatizace.',
      searchTerm: 'komunikac',
    },
  ];

  const totalMentions = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <section id="nedostatky" className="py-16 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
              Systémová svědectví · Zmapované problémy
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Na co lidé nejčastěji upozorňují
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Kromě samotných lidských příběhů evidujeme konkrétní nedostatky v personálním
              obsazení, stavu nemocničních budov a dostupnosti včasné péče.
            </p>
          </div>
          <div className="text-left md:text-right">
            <span className="text-xs text-muted-foreground block">Zaznamenaných podnětů</span>
            <span className="font-mono tabular-nums text-2xl font-semibold text-foreground">
              {totalMentions}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            const mentionCount = counts[pillar.category];
            return (
              <Card key={pillar.category} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 pb-2">
                    <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground">
                      {DEFICIENCY_LABELS[pillar.category]} · {mentionCount}×
                    </span>
                  </div>
                  <CardTitle className="text-xl">{pillar.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pillar.description}
                  </p>
                  {onFilterDeficiency && (
                    <button
                      type="button"
                      onClick={() => onFilterDeficiency(pillar.searchTerm)}
                      className="text-xs font-medium text-primary hover:underline cursor-pointer"
                    >
                      Vyhledat související příběhy →
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
