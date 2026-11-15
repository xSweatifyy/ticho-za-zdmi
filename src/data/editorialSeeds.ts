import type { CreateStoryInput } from '@/src/lib/repository';

export const ADMIN_EDITORIAL_SEEDS: CreateStoryInput[] = [
  {
    title: 'Šest týdnů na uzavřeném oddělení: Jak mi jeden empatický sanitář vrátil důstojnost',
    excerpt:
      'Když člověk překročí práh starého pavilonu s mřížemi a oprýskanou omítkou, strach je to první, co ho ochromí. Přesto i uprostřed přetíženého systému existují lidé, kteří dokážou změnit směr života.',
    content: `Nastupoval jsem v pozdním listopadovém odpoledni, vyčerpaný po měsících nespavosti a panických atak. První dojem z historické budovy byl drtivý — dlouhá studená chodba, linoleum pamatující devadesátá léta, koupelna bez jediného háčku nebo závěsu, kde se člověk cítí zbavený posledních zbytků soukromí.

Na čtyřicet pacientů připadaly na noční službě jen dvě sestry a jeden sanitář. Bylo vidět, jak jsou na hranici fyzických sil. Lékařská vizita trvala často méně než tři minuty a točila se výhradně kolem úpravy dávek medikace. Psychologická podpora nebo individuální terapie v akutní fázi prakticky neexistovala.

Zvrat nastal třetí týden. Starší sanitář si všiml, že už třetí den nevycházím z pokoje a odmítám jídlo. Neposlal za mnou jen sestru s další tabletou na uklidnění. Sedl si na kraj židle u okna, pět minut mlčel a pak se zeptal, co mi teď nejvíc chybí z normálního života. Ten obyčejný lidský rozhovor bez povýšenosti byl moment, kdy jsem poprvé uvěřil, že nejsem jen číslo v chorobopisu.

Nechci mlčet o tom, v jakém stavu jsou zdi, toalety a personální stavy našich léčeben. Změna prostředí a posílení týmů o psychology a sociální pracovníky není luxus — je to základ léčby.`,
    facilityName: 'Psychiatrická nemocnice (příjmový pavilon)',
    facilityType: 'psychiatricka_nemocnice',
    country: 'CZ',
    city: 'Praha',
    deficiencyCategories: ['staff_shortage', 'building_condition', 'lack_of_privacy'],
    deficienciesSummary:
      'Na 40 lůžek připadaly v noci jen 2 sestry. Pokoje pro 6 lidí bez oddělení soukromí, zastaralé sprchy bez možnosti zavření a minimum individuální psychoterapie.',
    isAnonymous: true,
    isOfficialEditorial: true,
    authorName: 'Lukáš',
    authorAge: '29 let',
    initialCareRating: 3,
    initialStaffRating: 3,
    initialBuildingRating: 1,
    initialAccessibilityRating: 3,
    coverImage: 'buildingsHallway',
  },
  {
    title: 'Čekání na pomoc pro sedmnáctiletou dceru: Sedm měsíců na seznamu a cesta na Slovensko',
    excerpt:
      'Dostupnost dětské a dorostové psychiatrie v regionech je kritická. Příběh rodiny, která narážela na zavřené ambulance a přeplněná lůžka, až našla záchranu v denním stacionáři.',
    content: `Když se u naší sedmnáctileté dcery objevily těžké úzkosti a sebepoškozování, mysleli jsme si, že pomoc najdeme během několika dnů. Realita nás tvrdě zasáhla. V celém našem kraji nám dětské ambulance nabízely první volný termín za pět až osm měsíců.

V okresní nemocnici nám řekli, že lůžkové oddělení je plné a akutně mohou přijmout jen při bezprostředním ohrožení života, přičemž by dcera ležela na dospělém oddělení mezi pacienty v těžkých psychózách. To jsme nechtěli dopustit.

Nakonec jsme díky doporučení z krizové linky objevili denní stacionář v příhraničí na Slovensku, kde pracoval mladý tým terapeutů a psychiatrů. Prostředí bylo světlé, bez mříží, s prostorem pro arteterapii a rodinné konzultace. Dceru to doslova postavilo na nohy.

Tento příběh píšu proto, aby rodiče věděli, že cesta existuje, ale systém nesmí nutit rodiny v krizi hledat pomoc stovky kilometrů od domova.`,
    facilityName: 'Dětská a dorostová psychiatrie / Denní stacionář',
    facilityType: 'detska_psychiatrie',
    country: 'SK',
    city: 'Bratislava',
    deficiencyCategories: ['long_wait_times', 'accessibility', 'staff_shortage'],
    deficienciesSummary:
      'Extrémní čekací doby na ambulantní vyšetření (5–8 měsíců), akutní nedostatek dětských psychiatrů v regionech a chybějící přechodná lůžka mezi ambulancí a nemocnicí.',
    isAnonymous: true,
    isOfficialEditorial: true,
    authorName: 'Martina',
    authorAge: '44 let',
    initialCareRating: 4,
    initialStaffRating: 5,
    initialBuildingRating: 4,
    initialAccessibilityRating: 1,
    coverImage: 'careGarden',
  },
  {
    title: 'Zahrada, kde se nesmí mluvit o penězích na opravy: Pohled zevnitř léčebny',
    excerpt:
      'Bývalá zdravotní sestra popisuje dvacet let služby v regionální léčebně: vyhoření týmů, zatékající střechy pavilonů a snaha udržet lidskost navzdory tabulkám.',
    content: `Dvacet let jsem chodila na směny parkem pod staletými kaštany. Pro pacienty byla zahrada jediným místem, kde mohli na chvíli zapomenout na oprýskané zdi uvnitř pavilonů. Jako personál jsme ale věděli, kolik věcí drží pohromadě jen díky obětavosti několika lidí.

Chyběly nám posily na noční směny, sanitáři odcházeli za lépe placenou prací do supermarketů a mladí lékaři po atestaci mířili do soukromých ambulancí. Když máte na starosti třicet pacientů v akutním stavu a k tomu administrativu, nezbývá vám čas si s člověkem jen tak sednout a vyslechnout ho.

Pacienti si právem stěžují na neosobní přístup, na hluk na vícelůžkových pokojích a na stav sociálních zařízení. My sestry jsme si na to stěžovaly vedení opakovaně. Dokud ale reforma psychiatrické péče nezůstane jen na papíře a nepromítne se do rekonstrukcí budov a důstojného ohodnocení týmů, budou trpět pacienti i personál.`,
    facilityName: 'Regionální psychiatrická léčebna',
    facilityType: 'psychiatricka_lecebna',
    country: 'CZ',
    city: 'Brno',
    deficiencyCategories: ['staff_shortage', 'building_condition', 'hygiene', 'communication'],
    deficienciesSummary:
      'Dlouhodobý podstav nelékařského personálu, zanedbané rozvody vody a zastaralé hygienické buňky na společných chodbách, přetížená administrativa bránící terapeutické práci.',
    isAnonymous: true,
    isOfficialEditorial: true,
    authorName: '',
    authorAge: '51 let',
    initialCareRating: 3,
    initialStaffRating: 4,
    initialBuildingRating: 2,
    initialAccessibilityRating: 3,
    coverImage: 'heroCorridor',
  },
  {
    title: 'Krizové centrum jako záchranná brzda před hospitalizací',
    excerpt:
      'Využít krizovou intervenci včas mi zachránilo práci i vztah. Proč ale o centrech duševního zdraví většina lidí v menších městech vůbec neví?',
    content: `Do krizového centra jsem přišel ve stavu, kdy jsem si byl jistý, že jediná možnost je nástup na uzavřené oddělení. Bál jsem se stigmatu, ztráty zaměstnání i toho, jak to přijme rodina.

V centru mě přijali bez objednání do dvou hodin. Nabídli mi třídenní pobyt na krizovém lůžku, kde se mnou od prvního dne mluvil psycholog i sociální pracovník. Žádné ponižující procedury, normální pokoj pro dva, respektující komunikace.

Problém je v tom, že taková místa existují jen ve větších městech. Můj kamarád ze středního Slovenska musel v podobné krizi čekat na záchyt na urgentním příjmu okresní nemocnice bez jakéhokoli soukromí. Dostupnost krizové péče by neměla záviset na poštovním směrovacím čísle.`,
    facilityName: 'Krizové centrum a Centrum duševního zdraví',
    facilityType: 'krizove_centrum',
    country: 'SK',
    city: 'Košice',
    deficiencyCategories: ['accessibility', 'communication'],
    deficienciesSummary:
      'Vynikající úroveň péče v samotném centru, ale slabá informovanost a geografická nedostupnost mimo krajská města.',
    isAnonymous: true,
    isOfficialEditorial: true,
    authorName: 'Marek',
    authorAge: '34 let',
    initialCareRating: 5,
    initialStaffRating: 5,
    initialBuildingRating: 4,
    initialAccessibilityRating: 2,
    coverImage: 'careGarden',
  },
];
