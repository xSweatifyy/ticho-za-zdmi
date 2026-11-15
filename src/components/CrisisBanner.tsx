import { PhoneCall } from 'lucide-react';

export function CrisisBanner() {
  const helplines = [
    {
      country: 'Česká republika',
      name: 'Linka první psychické pomoci',
      contact: '116 123',
      detail: 'Nonstop · zdarma · anonymně',
    },
    {
      country: 'Česká republika',
      name: 'Linka bezpečí (děti a studující)',
      contact: '116 111',
      detail: 'Nonstop · zdarma',
    },
    {
      country: 'Slovenská republika',
      name: 'Linka dôvery Nezábudka',
      contact: '0800 800 566',
      detail: 'Nonstop · bezplatne · Liga za duševné zdravie',
    },
    {
      country: 'Slovenská republika',
      name: 'IPčko.sk (krízová linka pomoci)',
      contact: '0800 500 333',
      detail: 'Nonstop · chat i telefonicky',
    },
  ];

  return (
    <section
      id="krizova-pomoc"
      className="py-14 border-t border-border bg-[#1E3A5F] text-white dark:bg-[#162235] dark:text-[#EAE8E3]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-xs font-medium tracking-wider uppercase text-white/75">
              Okamžitá pomoc v krizi · ČR & SR
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold">
              Nejste na to sami. Anonymní krizové linky fungují nepřetržitě.
            </h2>
          </div>
          <p className="text-xs text-white/80">
            V přímém ohrožení života volejte tísňovou linku{' '}
            <strong className="font-mono tabular-nums">155</strong> nebo{' '}
            <strong className="font-mono tabular-nums">112</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {helplines.map((line) => (
            <div
              key={line.name}
              className="rounded-lg border border-white/15 bg-white/5 p-4 space-y-1.5"
            >
              <p className="text-[11px] uppercase tracking-wider text-white/70">
                {line.country}
              </p>
              <p className="text-sm font-medium">{line.name}</p>
              <p className="text-xl font-mono tabular-nums font-semibold flex items-center gap-2 pt-0.5">
                <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
                {line.contact}
              </p>
              <p className="text-xs text-white/75">{line.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
