export type LegalDocId = 'regulamin' | 'polityka' | 'cookies' | 'odstapienie';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface LegalDocumentData {
  id: LegalDocId;
  path: string;
  title: string;
  effectiveDate: string;
  version: string;
  sections: LegalSection[];
}

export const SELLER_LEGAL_CONFIG = {
  serviceName: 'Solaris 2027',
  domain: 'https://solaris27.pl',
  sellerName: 'Roman V.',
  sellerAddress: 'Szczęsna 5A/112',
  sellerNip: '',
  contactEmail: 'kontakt@solaris27.pl',
  regulaminVersion: '1.0',
  effectiveDate: '21.11.2026',
  stripeProductName: 'Solaris 2027 — spersonalizowany raport cyfrowy',
  stripeProductDescription:
    'Cyfrowy raport na 2027 rok przygotowany na podstawie danych i odpowiedzi podanych przez klienta. Interpretacja o charakterze inspiracyjnym.',
  stripeStatementDescriptor: 'SOLARIS27',
} as const;

const SELLER_NIP_SEGMENT = SELLER_LEGAL_CONFIG.sellerNip
  ? `, ${SELLER_LEGAL_CONFIG.sellerNip}`
  : '';

export const LEGAL_TEXTS = {
  footerShortDisclaimer:
    'Solaris 2027 to interpretacja astrologiczna o charakterze inspiracyjnym. Nie stanowi porady medycznej, prawnej ani finansowej.',
  checkoutFullDisclaimer:
    'Raport Solaris 2027 to spersonalizowana interpretacja oparta na Twoich danych i odpowiedziach z quizu, przygotowana automatycznie z użyciem narzędzi obliczeniowych i sztucznej inteligencji. Nie jest gwarancją zdarzeń i nie zastępuje konsultacji ze specjalistą. Decyzje podejmujesz sam/a.',
  underPayButtonDisclaimer:
    'Raport to spersonalizowana interpretacja, nie gwarancja zdarzeń.',
  underPayButtonStripeNote:
    'Klikając przycisk, zawierasz umowę z obowiązkiem zapłaty. Płatność obsługuje Stripe. Dane płatnicze nie są dostępne dla Sprzedawcy.',
  reportTopBottomDisclaimer:
    'Astrologia to tradycja symboliczna, nie nauka ścisła. Traktuj raport jako inspirację do refleksji i planowania; decyzje podejmujesz sam/a.',
  unknownBirthTimeReportNote:
    'Bez godziny urodzenia pominęliśmy elementy zależne od godziny.',
  formPrivacyHelper:
    'Dane wykorzystujemy tylko do przygotowania Twojego Raportu. Szczegóły w',
  birthTimeHelper:
    'Godzina urodzenia jest opcjonalna. Jeśli jej nie podasz, pominiemy elementy raportu, które zależą od godziny.',
  birthTimeUnknownCheckbox: 'Nie pamiętam godziny urodzenia',
  cityHelper:
    'Zacznij pisać i wybierz miejscowość z listy. Nie ma Twojej miejscowości? Wybierz najbliższe większe miasto.',
  cityNotFoundError:
    'Nie znaleźliśmy takiej miejscowości. Sprawdź pisownię lub wybierz najbliższe większe miasto.',
  serverCalcError:
    'Mamy chwilowy problem z obliczeniami. Twoje dane zostały zapisane — spróbuj ponownie za minutę lub napisz na kontakt@solaris27.pl.',
  paymentFailedError:
    'Płatność nie została zrealizowana. Nie pobraliśmy środków. Spróbuj ponownie lub wybierz inną metodę płatności.',
  checkbox2Withdrawal:
    'Żądam rozpoczęcia dostarczania Raportu przed upływem 14-dniowego terminu do odstąpienia od umowy. Przyjmuję do wiadomości, że z chwilą rozpoczęcia dostarczania Raportu tracę prawo odstąpienia od umowy.',
  checkbox3SecondPerson:
    'Oświadczam, że druga osoba jest pełnoletnia, mam prawo podać jej dane w celu przygotowania Raportu i została o tym poinformowana.',
  checkbox4Marketing:
    'Chcę otrzymywać e-mailem informacje o nowych raportach i ofertach od Solaris 2027. Zgodę mogę wycofać w każdej chwili.',
} as const;

export const LEGAL_DOCUMENTS: Record<LegalDocId, LegalDocumentData> = {
  regulamin: {
    id: 'regulamin',
    path: '/regulamin',
    title: 'Regulamin Serwisu Solaris 2027',
    effectiveDate: SELLER_LEGAL_CONFIG.effectiveDate,
    version: SELLER_LEGAL_CONFIG.regulaminVersion,
    sections: [
      {
        heading: '§1. Postanowienia ogólne',
        paragraphs: [
          `1. Niniejszy regulamin określa zasady korzystania z serwisu internetowego dostępnego pod adresem ${SELLER_LEGAL_CONFIG.domain} (dalej: „Serwis”) oraz zasady sprzedaży spersonalizowanych raportów cyfrowych (dalej: „Raport”).`,
          `2. Sprzedawcą i usługodawcą jest: ${SELLER_LEGAL_CONFIG.sellerName}, adres: ${SELLER_LEGAL_CONFIG.sellerAddress}${SELLER_NIP_SEGMENT}, e-mail: ${SELLER_LEGAL_CONFIG.contactEmail} (dalej: „Sprzedawca”).`,
          `3. Kontakt ze Sprzedawcą: e-mail ${SELLER_LEGAL_CONFIG.contactEmail}.`,
          '4. Użyte w regulaminie określenia oznaczają:',
        ],
        bullets: [
          'Użytkownik — osoba korzystająca z Serwisu;',
          'Klient — Użytkownik, który złożył zamówienie na Raport;',
          'Konsument — osoba fizyczna dokonująca ze Sprzedawcą czynności prawnej niezwiązanej bezpośrednio z jej działalnością gospodarczą lub zawodową;',
          'Raport — spersonalizowany plik lub strona internetowa z treścią cyfrową, przygotowana automatycznie na podstawie danych podanych przez Klienta;',
          'Treść cyfrowa — dane wytwarzane i dostarczane w postaci cyfrowej.',
        ],
      },
      {
        heading: '§1 ust. 5. Wymóg pełnoletności',
        paragraphs: ['5. Z Serwisu mogą korzystać wyłącznie osoby, które ukończyły 18 lat.'],
      },
      {
        heading: '§2. Wymagania techniczne',
        paragraphs: [
          '1. Do korzystania z Serwisu niezbędne są: urządzenie z dostępem do internetu, aktualna przeglądarka internetowa z włączoną obsługą JavaScript oraz aktywny adres e-mail (jeśli Klient go podaje).',
          '2. Serwis może wykorzystywać pliki cookies i podobne technologie zgodnie z Polityką cookies.',
        ],
      },
      {
        heading: '§3. Charakter Serwisu i Raportu',
        paragraphs: [
          '1. Raport ma charakter rozrywkowy i inspiracyjny. Stanowi interpretację opartą na danych podanych przez Klienta i jego odpowiedziach z quizu, przygotowaną automatycznie z wykorzystaniem narzędzi obliczeniowych oraz modeli sztucznej inteligencji.',
          '2. Raport nie jest prognozą ani gwarancją przyszłych zdarzeń, a także nie stanowi porady medycznej, psychologicznej, prawnej, finansowej, inwestycyjnej ani zawodowej. Nie zastępuje konsultacji ze specjalistą.',
          '3. Decyzje życiowe, finansowe, zdrowotne i dotyczące relacji Klient podejmuje na własną odpowiedzialność, z uwzględnieniem własnej oceny sytuacji.',
          '4. Sprzedawca nie gwarantuje, że Raport spełni subiektywne oczekiwania Klienta co do treści, tonu lub trafności, o ile Raport jest zgodny z opisem usługi w Serwisie.',
        ],
      },
      {
        heading: '§3a. Dane podawane w Serwisie',
        paragraphs: [
          '1. Klient podaje dane w sposób dobrowolny, jednak są one niezbędne do przygotowania Raportu. Klient obowiązany jest podawać dane prawdziwe.',
          '2. Klient nie powinien podawać danych szczególnych kategorii (m.in. dotyczących zdrowia, orientacji seksualnej, przekonań religijnych lub politycznych) ani danych nieistotnych dla przygotowania Raportu.',
          '3. Jeżeli Klient zamawia Raport „dla dwojga” i podaje dane drugiej osoby, oświadcza, że ma do tego prawo, ogranicza się do danych niezbędnych (imię lub pseudonim, data i miejsce urodzenia, ewentualnie godzina) oraz że druga osoba jest pełnoletnia i została o tym poinformowana.',
        ],
      },
      {
        heading: '§4. Zamówienia i płatności',
        paragraphs: [
          '1. Informacje o Raporcie, jego zakresie i cenie podane w Serwisie nie stanowią oferty w rozumieniu Kodeksu cywilnego, lecz zaproszenie do zawarcia umowy.',
          '2. Ceny w Serwisie podawane są w złotych polskich (PLN) jako ceny brutto (Sprzedawca korzysta ze zwolnienia z podatku VAT i nie jest zarejestrowany jako czynny podatnik VAT).',
          '3. Aby złożyć zamówienie, Klient: (1) wybiera wariant Raportu, (2) podaje wymagane dane, (3) zapoznaje się z Regulaminem i zaznacza wymagane oświadczenia, (4) klika przycisk „Zamawiam i płacę” i (5) dokonuje płatności.',
          '4. Złożenie zamówienia wiąże się z obowiązkiem zapłaty. Umowa zostaje zawarta z chwilą złożenia zamówienia i potwierdzenia płatności.',
          '5. Płatności obsługuje Stripe Payments Europe Ltd. Dostępne metody płatności (np. BLIK, karta płatnicza, Apple Pay, Google Pay) wyświetlane są w procesie zamówienia. Dane płatnicze przetwarzane są przez operatora płatności; Sprzedawca nie ma dostępu do pełnych danych karty.',
          '6. Po zaksięgowaniu płatności Klient otrzymuje dostęp do Raportu zgodnie z §5.',
        ],
      },
      {
        heading: '§5. Realizacja umowy i dostarczenie Raportu',
        paragraphs: [
          '1. Raport jest dostarczany w postaci cyfrowej: poprzez udostępnienie go na stronie Serwisu (z możliwością zapisu PDF A4 oraz pobrania kalendarza .ics zgodnie z wybranym wariantem) oraz wysyłkę pełnej treści Raportu (wraz z załącznikiem .ics, jeśli dotyczy) na adres e-mail podany w zamówieniu — bezpośrednio po potwierdzeniu płatności, nie później niż w ciągu 30 minut od zaksięgowania płatności.',
          '2. Klient powinien zachować otrzymaną wiadomość e-mail z Raportem lub zapisać wersję PDF A4; w razie potrzeby może ponownie wysłać kopię na adres e-mail z poziomu strony zamówienia.',
          '3. Raport jest dostępny dla Klienta przez okres 12 miesięcy od dostarczenia, chyba że Klient wcześniej zażąda jego usunięcia.',
          '4. Jeżeli z przyczyn technicznych Raport nie zostanie dostarczony, Klient powinien niezwłocznie skontaktować się ze Sprzedawcą. Sprzedawca dostarczy Raport ponownie lub zwróci cenę.',
        ],
      },
      {
        heading: '§6. Odstąpienie od umowy (dotyczy Konsumentów)',
        paragraphs: [
          '1. Konsument ma prawo odstąpić od umowy zawartej na odległość w terminie 14 dni od dnia jej zawarcia, bez podawania przyczyny, z zastrzeżeniem ust. 3 i 4.',
          `2. Aby skorzystać z prawa odstąpienia, Konsument składa Sprzedawcy oświadczenie o odstąpieniu (np. e-mailem na adres ${SELLER_LEGAL_CONFIG.contactEmail}). Można skorzystać z wzoru formularza stanowiącego załącznik do Regulaminu, ale nie jest to obowiązkowe. Do zachowania terminu wystarczy wysłanie oświadczenia przed jego upływem.`,
          '3. Zgodnie z art. 38 pkt 1 lub pkt 13 ustawy z dnia 30 maja 2014 r. o prawach konsumenta (w zależności od kwalifikacji umowy) prawo odstąpienia nie przysługuje w odniesieniu do umowy o dostarczenie treści cyfrowych niedostarczanych na nośniku materialnym lub o usługę wykonaną w całości, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną zgodą Konsumenta przed upływem terminu do odstąpienia, po poinformowaniu go przez Sprzedawcę o utracie prawa odstąpienia.',
          '4. Przed złożeniem zamówienia Konsument oświadcza (poprzez zaznaczenie odpowiedniego pola), że: (a) żąda rozpoczęcia dostarczania Raportu przed upływem terminu do odstąpienia od umowy; (b) przyjmuje do wiadomości, że z chwilą rozpoczęcia dostarczania Raportu traci prawo odstąpienia od umowy.',
          '5. Sprzedawca potwierdza Konsumentowi na trwałym nośniku (e-mail lub wiadomość w Serwisie) zawarcie umowy, zgodę Konsumenta oraz poinformowanie go o utracie prawa odstąpienia.',
          '6. Jeżeli Konsument skutecznie odstąpi od umowy (np. gdy Raport nie został jeszcze dostarczony), Sprzedawca zwróci mu wszystkie dokonane płatności niezwłocznie, nie później niż w terminie 14 dni od otrzymania oświadczenia, tą samą metodą płatności, chyba że Konsument wyraźnie zgodził się na inne rozwiązanie.',
        ],
      },
      {
        heading: '§7. Brak zgodności treści cyfrowej z umową (reklamacje)',
        paragraphs: [
          '1. Sprzedawca odpowiada wobec Konsumenta za brak zgodności Raportu z umową, w szczególności za sytuację, gdy Raport nie został dostarczony, jest niekompletny, jest nieczytelny lub nie otwiera się, albo zawiera treści wyraźnie niezgodne z podanymi przez Klienta danymi (np. błędne imię, data lub miejsce wynikające z błędu Serwisu).',
          `2. Reklamację można złożyć e-mailem na adres ${SELLER_LEGAL_CONFIG.contactEmail}. Zgłoszenie powinno zawierać: numer zamówienia lub adres e-mail użyty w zamówieniu, opis problemu oraz oczekiwany sposób rozwiązania.`,
          '3. Sprzedawca rozpatruje reklamację w terminie 14 dni od jej otrzymania i informuje Klienta o decyzji na adres e-mail.',
          '4. Sprzedawca doprowadzi Raport do zgodności z umową (np. dostarczy go ponownie lub przygotuje poprawiony), a gdy nie jest to możliwe lub jest nadmiernie utrudnione — zwróci cenę, zgodnie z przepisami o prawach konsumenta dotyczącymi treści cyfrowych.',
          '5. Subiektywne niezadowolenie z treści Raportu, który został przygotowany zgodnie z opisem w Serwisie i danymi podanymi przez Klienta, nie jest samo w sobie brakiem zgodności z umową.',
          '6. Postanowienia niniejszego paragrafu nie ograniczają ustawowych praw Konsumenta.',
        ],
      },
      {
        heading: '§8. Dane osobowe',
        paragraphs: ['Zasady przetwarzania danych osobowych określa Polityka prywatności dostępna w Serwisie.'],
      },
      {
        heading: '§9. Prawa autorskie i zasady korzystania',
        paragraphs: [
          '1. Raport oraz treści Serwisu są chronione prawem autorskim. Klient otrzymuje niewyłączną, nieprzenoszalną licencję na użytek osobisty, bez prawa do odsprzedaży, publicznego rozpowszechniania w celach komercyjnych ani masowego kopiowania.',
          '2. Zabronione jest: udostępnianie Serwisu w sposób zakłócający jego działanie, automatyczne pobieranie treści (scraping), próby obejścia płatności lub dostępu do cudzych Raportów, podawanie danych osób trzecich bez ich wiedzy i prawa do tego.',
          '3. Sprzedawca może zablokować dostęp Użytkownikowi, który narusza Regulamin, w zakresie niezbędnym do ochrony Serwisu.',
        ],
      },
      {
        heading: '§10. Odpowiedzialność',
        paragraphs: [
          '1. Sprzedawca odpowiada za wykonanie umowy na zasadach określonych w przepisach prawa. Żadne postanowienie Regulaminu nie wyłącza ani nie ogranicza praw Konsumenta wynikających z bezwzględnie obowiązujących przepisów.',
          '2. Z zastrzeżeniem ust. 1, Sprzedawca nie ponosi odpowiedzialności za decyzje podjęte przez Klienta na podstawie treści Raportu, a także za przerwy w działaniu Serwisu wynikające z przyczyn niezależnych od Sprzedawcy (np. awarie dostawców hostingu lub płatności).',
          '3. Sprzedawca dokłada starań, aby Serwis działał nieprzerwanie, jednak może przeprowadzać prace techniczne, o czym poinformuje z odpowiednim wyprzedzeniem, o ile jest to możliwe.',
        ],
      },
      {
        heading: '§11. Postanowienia końcowe',
        paragraphs: [
          '1. Do umów zawieranych za pośrednictwem Serwisu stosuje się prawo polskie. Wobec Konsumentów mających miejsce zamieszkania w innym państwie UE zachowują moc obowiązujące ich przepisy o ochronie konsumentów.',
          '2. Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń, w tym z mediacji lub sądu polubownego przy Wojewódzkim Inspektoracie Inspekcji Handlowej oraz z pomocy powiatowego (miejskiego) rzecznika konsumentów. Informacje dostępne są na stronie Urzędu Ochrony Konkurencji i Konsumentów (uokik.gov.pl).',
          '3. Sprzedawca zastrzega sobie prawo zmiany Regulaminu z ważnych przyczyn (zmiana przepisów, zmiana oferty, względy techniczne). Zmiany nie dotyczą zamówień złożonych przed ich wejściem w życie. O zmianach Sprzedawca informuje w Serwisie z co najmniej 7-dniowym wyprzedzeniem.',
          '4. Regulamin jest dostępny nieodpłatnie w Serwisie w formie umożliwiającej jego pobranie, utrwalenie i wydrukowanie.',
        ],
      },
      {
        heading: 'Załącznik: Wzór formularza odstąpienia od umowy',
        paragraphs: [
          '(formularz ten należy wypełnić i odesłać tylko w przypadku chęci odstąpienia od umowy)',
          `Adresat: ${SELLER_LEGAL_CONFIG.sellerName}, ${SELLER_LEGAL_CONFIG.sellerAddress}, e-mail: ${SELLER_LEGAL_CONFIG.contactEmail}`,
          'Ja/My(*) niniejszym informuję/informujemy(*) o moim/naszym odstąpieniu od umowy dostarczenia następującej treści cyfrowej: Raport Solaris 2027.',
          'Data zawarcia umowy(*): ......................................',
          'Imię i nazwisko Konsumenta(-ów): ......................................',
          'Adres Konsumenta(-ów): ......................................',
          'Podpis Konsumenta(-ów) (tylko jeżeli formularz jest przesyłany w wersji papierowej): ......................................',
          'Data: ...................................... | (*) Niepotrzebne skreślić.',
        ],
      },
    ],
  },

  polityka: {
    id: 'polityka',
    path: '/polityka-prywatnosci',
    title: 'Polityka prywatności Serwisu Solaris 2027',
    effectiveDate: SELLER_LEGAL_CONFIG.effectiveDate,
    version: SELLER_LEGAL_CONFIG.regulaminVersion,
    sections: [
      {
        heading: '1. Administrator danych',
        paragraphs: [
          `Administratorem Twoich danych osobowych jest ${SELLER_LEGAL_CONFIG.sellerName}, adres: ${SELLER_LEGAL_CONFIG.sellerAddress}${SELLER_NIP_SEGMENT}, e-mail: ${SELLER_LEGAL_CONFIG.contactEmail} (dalej: „Administrator”).`,
          `W sprawach dotyczących danych osobowych możesz pisać na adres: ${SELLER_LEGAL_CONFIG.contactEmail}.`,
        ],
      },
      {
        heading: '2. Jakie dane przetwarzamy',
        paragraphs: [
          `W zależności od tego, jak korzystasz z serwisu ${SELLER_LEGAL_CONFIG.domain} („Serwis”), przetwarzamy:`,
        ],
        bullets: [
          'Dane podane w formularzu: imię (lub pseudonim), data urodzenia, godzina urodzenia (jeśli ją podasz), miejsce urodzenia (miejscowość, współrzędne i strefa czasowa), odpowiedzi udzielone w quizie.',
          'Dane drugiej osoby — jeśli zamawiasz Raport „dla dwojga”: imię lub pseudonim, data i miejsce urodzenia, ewentualnie godzina. Podajesz je na własną odpowiedzialność i wyłącznie wtedy, gdy masz do tego prawo (patrz pkt 8).',
          'Adres e-mail — jeśli go podasz (np. w celu otrzymania linku do Raportu, potwierdzenia zakupu lub zapisu na wiadomości).',
          'Dane dotyczące zamówienia i płatności: numer i status zamówienia, kwota, data, identyfikator transakcji, metoda płatności. Dane karty i konta bankowego są przetwarzane przez operatora płatności; Administrator ich nie widzi.',
          'Dane techniczne i logi: adres IP (w tym w postaci zanonimizowanej lub zhaszowanej), typ przeglądarki i urządzenia, data i godzina wizyty, identyfikatory sesji, informacje o błędach.',
          'Dane z cookies i podobnych technologii — zgodnie z Polityką cookies; analityczne i marketingowe wyłącznie po wyrażeniu zgody.',
          'Treść wiadomości, które do nas wysyłasz (np. reklamacje, pytania).',
        ],
      },
      {
        heading: 'Dane szczególnych kategorii',
        paragraphs: [
          'Nie prosimy o dane szczególnych kategorii (np. dotyczące zdrowia, orientacji seksualnej, przekonań religijnych). Prosimy, abyś nie podawał(a) takich informacji w formularzu ani w wiadomościach.',
        ],
      },
      {
        heading: '3. Cele i podstawy prawne przetwarzania',
        paragraphs: [
          'Podanie danych niezbędnych do przygotowania Raportu jest dobrowolne, ale bez nich nie możemy zrealizować zamówienia.',
        ],
        table: {
          headers: ['Cel', 'Podstawa prawna (RODO)'],
          rows: [
            ['Przygotowanie i dostarczenie zamówionego Raportu, obsługa zamówienia', 'art. 6 ust. 1 lit. b (wykonanie umowy lub działania przed jej zawarciem)'],
            ['Obsługa płatności i zwrotów', 'art. 6 ust. 1 lit. b'],
            ['Rozpatrywanie reklamacji i kontakt z Tobą', 'art. 6 ust. 1 lit. b oraz lit. f (prawnie uzasadniony interes: obsługa zapytań)'],
            ['Wystawianie dokumentów, rachunkowość i rozliczenia podatkowe', 'art. 6 ust. 1 lit. c (obowiązek prawny)'],
            ['Bezpieczeństwo Serwisu, zapobieganie nadużyciom i oszustwom, dochodzenie i obrona przed roszczeniami', 'art. 6 ust. 1 lit. f (prawnie uzasadniony interes)'],
            ['Statystyki i analityka ruchu, pomiar skuteczności reklam (pliki cookies i piksele)', 'art. 6 ust. 1 lit. a (zgoda)'],
            ['Wysyłka informacji handlowych e-mailem (jeśli wyrazisz zgodę)', 'art. 6 ust. 1 lit. a (zgoda)'],
          ],
        },
      },
      {
        heading: '4. Zautomatyzowane przetwarzanie i sztuczna inteligencja',
        paragraphs: [
          'Raport jest generowany automatycznie z użyciem narzędzi obliczeniowych oraz modeli sztucznej inteligencji (OpenAI, L.L.C. / OpenAI Ireland Ltd.). Dane niezbędne do przygotowania Raportu (np. data, miejsce i odpowiedzi z quizu) są przekazywane temu dostawcy wyłącznie w zakresie koniecznym do wygenerowania treści. Nie podejmujemy wobec Ciebie decyzji wywołujących skutki prawne ani w podobny sposób istotnie na Ciebie wpływających. Raport ma charakter rozrywkowy i inspiracyjny.',
        ],
      },
      {
        heading: '5. Odbiorcy danych',
        paragraphs: ['Dane mogą być powierzane lub udostępniane podmiotom, z których usług korzystamy:'],
        bullets: [
          'operatorowi płatności: Stripe Payments Europe Ltd. (płatności, BLIK, karty, Apple Pay, Google Pay);',
          'dostawcom hostingu, domeny i infrastruktury sieciowej: Vercel Inc., Cloudflare, Inc. oraz Hostinger International Ltd.;',
          'dostawcy modeli sztucznej inteligencji: OpenAI, L.L.C. / OpenAI Ireland Ltd. (wyłącznie dane niezbędne do wygenerowania treści Raportu);',
          'dostawcy wysyłki wiadomości e-mail: Resend (Plus Five Five, Inc.) — w celu dostarczenia Raportu i potwierdzenia zamówienia;',
          'dostawcom narzędzi analitycznych i reklamowych — tylko po Twojej zgodzie (jeśli aktywowane w Serwisie);',
          'biuru rachunkowemu i doradcom prawnym (jeśli dotyczy);',
          'organom publicznym, jeśli wymaga tego prawo.',
        ],
      },
      {
        heading: '6. Przekazywanie danych poza EOG',
        paragraphs: [
          `Część dostawców (np. Stripe, Vercel, OpenAI, Resend, Cloudflare) może przetwarzać dane poza Europejskim Obszarem Gospodarczym, w tym w USA. Transfer odbywa się na podstawie mechanizmów przewidzianych w RODO, w szczególności decyzji Komisji Europejskiej o odpowiednim stopniu ochrony (EU–US Data Privacy Framework, o ile dany podmiot jest certyfikowany) lub standardowych klauzul umownych. Kopię zabezpieczeń możesz uzyskać, pisząc na adres ${SELLER_LEGAL_CONFIG.contactEmail}.`,
        ],
      },
      {
        heading: '7. Okres przechowywania danych',
        paragraphs: [],
        bullets: [
          'Dane Raportu (imię, dane urodzenia, odpowiedzi z quizu, treść Raportu): przez 12 miesięcy od dostarczenia Raportu, a po tym czasie usuwamy je lub anonimizujemy, chyba że wcześniej zażądasz usunięcia (patrz pkt 9).',
          'Dane niezbędne do wykazania zawarcia umowy i do obrony przed roszczeniami: do czasu upływu terminu przedawnienia roszczeń (3 lata od końca roku, w którym powstały).',
          'Dokumenty księgowe i podatkowe: przez 5 lat, licząc od końca roku podatkowego, w którym powstał obowiązek podatkowy.',
          'Adres e-mail do celów marketingowych: do czasu wycofania zgody.',
          'Logi techniczne: do 30 dni.',
          'Cookies: zgodnie z Polityką cookies.',
        ],
      },
      {
        heading: '8. Dane osób trzecich',
        paragraphs: [
          'Jeżeli zamawiasz Raport „dla dwojga” i podajesz dane drugiej osoby, oświadczasz, że jest ona pełnoletnia, masz prawo przekazać nam jej dane w celu przygotowania Raportu i że została o tym poinformowana. Dane tej osoby przetwarzamy wyłącznie w celu przygotowania Twojego Raportu i na tych samych zasadach, jak Twoje dane. Osoba ta ma wszystkie prawa opisane w pkt 9 i może skontaktować się z nami bezpośrednio. Prosimy o ograniczenie się do danych niezbędnych (imię lub pseudonim, data i miejsce urodzenia).',
        ],
      },
      {
        heading: '9. Twoje prawa',
        paragraphs: [
          'Przysługuje Ci prawo do: dostępu do danych, ich sprostowania, usunięcia („prawo do bycia zapomnianym”), ograniczenia przetwarzania, przenoszenia danych oraz wniesienia sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie. Jeśli przetwarzamy dane na podstawie Twojej zgody, możesz ją w każdej chwili cofnąć (cofnięcie zgody nie wpływa na zgodność z prawem przetwarzania dokonanego przed jej cofnięciem).',
          `Aby skorzystać z praw, napisz na adres ${SELLER_LEGAL_CONFIG.contactEmail}. Aby usunąć dane związane z Raportem, podaj numer zamówienia lub link do Raportu. Zastrzegamy sobie prawo zweryfikowania tożsamości osoby zgłaszającej żądanie.`,
          'Masz prawo wniesienia skargi do organu nadzorczego: Prezes Urzędu Ochrony Danych Osobowych, ul. Stawki 2, 00-193 Warszawa (uodo.gov.pl).',
        ],
      },
      {
        heading: '10. Bezpieczeństwo',
        paragraphs: [
          'Stosujemy środki techniczne i organizacyjne adekwatne do ryzyka: szyfrowane połączenie (HTTPS), ograniczenie dostępu do danych, unikalne i losowe identyfikatory Raportów (128-bit UUID), weryfikację płatności po stronie serwera oraz haszowanie adresów IP w rejestrze zgód. Mimo to żaden system nie jest całkowicie wolny od ryzyka. Jeśli dowiesz się o naruszeniu, napisz do nas.',
        ],
      },
      {
        heading: '11. Osoby niepełnoletnie',
        paragraphs: [
          'Serwis jest przeznaczony dla osób, które ukończyły 18 lat. Nie zbieramy świadomie danych osób niepełnoletnich. Jeśli uważasz, że takie dane trafiły do Serwisu, skontaktuj się z nami, a niezwłocznie je usuniemy.',
        ],
      },
      {
        heading: '12. Pliki cookies i 13. Zmiany polityki',
        paragraphs: [
          'Informacje o plikach cookies i o zarządzaniu zgodami znajdziesz w Polityce cookies.',
          'Możemy aktualizować niniejszą politykę, np. w razie zmiany przepisów lub sposobu działania Serwisu. Aktualna wersja jest zawsze dostępna w Serwisie z datą obowiązywania.',
        ],
      },
    ],
  },

  cookies: {
    id: 'cookies',
    path: '/polityka-cookies',
    title: 'Polityka cookies Serwisu Solaris 2027',
    effectiveDate: SELLER_LEGAL_CONFIG.effectiveDate,
    version: SELLER_LEGAL_CONFIG.regulaminVersion,
    sections: [
      {
        heading: '1. Czym są pliki cookies',
        paragraphs: [
          'Pliki cookies to niewielkie pliki zapisywane na Twoim urządzeniu podczas korzystania ze strony. Podobne funkcje pełnią m.in. localStorage i piksele śledzące. W tej polityce nazywamy je łącznie „cookies”.',
        ],
      },
      {
        heading: '2. Jakich cookies używamy',
        paragraphs: [
          'Cookies analityczne i marketingowe ustawiamy wyłącznie po wyrażeniu przez Ciebie zgody w oknie cookies. Do czasu zgody nie ładujemy odpowiednich skryptów.',
        ],
        table: {
          headers: ['Kategoria', 'Cel', 'Czy wymaga zgody', 'Przykłady / czas'],
          rows: [
            [
              'Niezbędne',
              'Działanie Serwisu: zapamiętanie wprowadzonych danych formularza, identyfikator zamówienia i Raportu, bezpieczeństwo, zapis wyboru dotyczącego cookies',
              'Nie',
              'localStorage: solaris_form_draft_v1, solaris_2027_session_v2, cookie_consent — do 12 miesięcy / do wyczyszczenia przeglądarki',
            ],
            [
              'Analityczne',
              'Statystyki odwiedzin i sposobu korzystania z Serwisu',
              'Tak',
              'Ładowane wyłącznie po wyrażeniu zgody w ustawieniach cookies',
            ],
            [
              'Marketingowe',
              'Pomiar skuteczności reklam i dopasowanie komunikatów (np. TikTok Pixel, Meta Pixel); przekazywanie informacji o zakupie do platform reklamowych',
              'Tak',
              'Ładowane wyłącznie po wyrażeniu zgody w ustawieniach cookies',
            ],
          ],
        },
      },
      {
        heading: '3. Zarządzanie zgodą',
        paragraphs: [
          '1. Przy pierwszej wizycie wyświetlamy okno z wyborem: „Akceptuję wszystkie”, „Tylko niezbędne” oraz przycisk „Ustawienia” do ustawień szczegółowych.',
          '2. Zgodę możesz zmienić lub wycofać w dowolnym momencie przez link „Ustawienia cookies” w stopce Serwisu.',
          '3. Możesz też usunąć lub zablokować cookies w ustawieniach swojej przeglądarki. Zablokowanie cookies niezbędnych może jednak utrudnić lub uniemożliwić korzystanie z Serwisu (np. odzyskanie zamówionego Raportu po powrocie z aplikacji banku).',
        ],
      },
      {
        heading: '4. Dane przekazywane do platform reklamowych',
        paragraphs: [
          'Jeżeli wyrazisz zgodę na cookies marketingowe, informacje o Twoich działaniach w Serwisie (np. rozpoczęcie zamówienia, zakup) mogą być przekazywane do platform reklamowych, w tym także z naszego serwera (tzw. konwersje po stronie serwera). Szczegóły przetwarzania danych opisuje Polityka prywatności.',
        ],
      },
      {
        heading: '5. Kontakt',
        paragraphs: [`W sprawach dotyczących cookies napisz: ${SELLER_LEGAL_CONFIG.contactEmail}.`],
      },
    ],
  },

  odstapienie: {
    id: 'odstapienie',
    path: '/odstapienie',
    title: 'Odstąpienie od umowy i reklamacje — Solaris 2027',
    effectiveDate: SELLER_LEGAL_CONFIG.effectiveDate,
    version: SELLER_LEGAL_CONFIG.regulaminVersion,
    sections: [
      {
        heading: '1. Prawo odstąpienia od umowy i art. 38 ustawy o prawach konsumenta',
        paragraphs: [
          'Konsument ma prawo odstąpić od umowy zawartej na odległość w terminie 14 dni od dnia jej zawarcia bez podawania przyczyny, z zastrzeżeniem przepisów dotyczących treści cyfrowych.',
          'Zgodnie z art. 38 pkt 1 lub pkt 13 ustawy z dnia 30 maja 2014 r. o prawach konsumenta prawo odstąpienia nie przysługuje w odniesieniu do umowy o dostarczenie treści cyfrowych niedostarczanych na nośniku materialnym, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną zgodą Konsumenta przed upływem terminu do odstąpienia, po poinformowaniu go przez Sprzedawcę o utracie prawa odstąpienia.',
          'Jeżeli Konsument skutecznie odstąpi od umowy (np. gdy Raport nie został jeszcze dostarczony), Sprzedawca zwraca płatność nie później niż w terminie 14 dni od otrzymania oświadczenia.',
        ],
      },
      {
        heading: '2. Reklamacje (brak zgodności treści cyfrowej z umową)',
        paragraphs: [
          `Reklamację można złożyć e-mailem na adres ${SELLER_LEGAL_CONFIG.contactEmail}, podając numer zamówienia lub adres e-mail użyty w zamówieniu oraz opis problemu. Reklamacje rozpatrujemy w terminie 14 dni.`,
        ],
      },
      {
        heading: '3. Wzór formularza odstąpienia od umowy',
        paragraphs: [
          '(formularz ten należy wypełnić i odesłać tylko w przypadku chęci odstąpienia od umowy)',
          `Adresat: ${SELLER_LEGAL_CONFIG.sellerName}, ${SELLER_LEGAL_CONFIG.sellerAddress}, e-mail: ${SELLER_LEGAL_CONFIG.contactEmail}`,
          'Ja/My(*) niniejszym informuję/informujemy(*) o moim/naszym odstąpieniu od umowy dostarczenia następującej treści cyfrowej: Raport Solaris 2027.',
          'Data zawarcia umowy(*): ......................................',
          'Imię i nazwisko Konsumenta(-ów): ......................................',
          'Adres Konsumenta(-ów): ......................................',
          'Podpis Konsumenta(-ów) (tylko jeżeli formularz jest przesyłany w wersji papierowej): ......................................',
          'Data: ...................................... | (*) Niepotrzebne skreślić.',
        ],
      },
    ],
  },
};

export interface DurableOrderConfirmation {
  subject: string;
  orderId: string;
  orderedAtPl: string;
  personName: string;
  variantLabel: string;
  priceGrossPln: string;
  reportUrl: string;
  regulaminUrl: string;
  politykaUrl: string;
  contactEmail: string;
  sellerName: string;
  plainTextBody: string;
}

export function buildDurableOrderConfirmation(params: {
  orderId: string;
  personName: string;
  mode: 'solo' | 'pair';
  priceGrossPln: string;
  sessionId: string;
  baseUrl: string;
  orderedAt?: Date;
}): DurableOrderConfirmation {
  const now = params.orderedAt ?? new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const orderedAtPl = `${dd}.${mm}.${yyyy}, ${hh}:${min}`;

  const cleanBase = params.baseUrl.replace(/\/+$/, '');
  const reportUrl = `${cleanBase}/?raport=${encodeURIComponent(params.sessionId)}`;
  const regulaminUrl = `${cleanBase}/regulamin`;
  const politykaUrl = `${cleanBase}/polityka-prywatnosci`;
  const variantLabel = params.mode === 'pair' ? 'dla dwojga' : 'dla Ciebie';
  const subject = `Twój Raport Solaris 2027 i potwierdzenie zamówienia nr ${params.orderId}`;

  const plainTextBody = [
    `Cześć ${params.personName},`,
    '',
    'dziękujemy za zamówienie. Twój Raport jest dostępny pod tym adresem:',
    reportUrl,
    '(Zachowaj ten link — dzięki niemu otworzysz Raport na dowolnym urządzeniu.)',
    '',
    'Podsumowanie zamówienia:',
    `Produkt: Raport Solaris 2027 (${variantLabel})`,
    `Cena: ${params.priceGrossPln} brutto`,
    `Data zamówienia: ${orderedAtPl}`,
    `Numer zamówienia: ${params.orderId}`,
    '',
    'Ważne informacje:',
    '• Na Twoje wyraźne żądanie rozpoczęliśmy dostarczanie Raportu przed upływem 14-dniowego terminu do odstąpienia od umowy. Zgodnie z art. 38 ustawy o prawach konsumenta oznacza to utratę prawa odstąpienia, o czym zostałeś/aś poinformowany/a przed zakupem.',
    '• Raport to spersonalizowana interpretacja, nie gwarancja zdarzeń ani porada specjalisty.',
    `• Regulamin: ${regulaminUrl} | Polityka prywatności: ${politykaUrl}`,
    `• Jeśli Raport się nie otwiera lub zawiera błąd, napisz na ${SELLER_LEGAL_CONFIG.contactEmail} — odpowiemy w ciągu 14 dni, zwykle znacznie szybciej.`,
    '',
    'Pozdrawiamy,',
    SELLER_LEGAL_CONFIG.sellerName,
    SELLER_LEGAL_CONFIG.contactEmail,
  ].join('\n');

  return {
    subject,
    orderId: params.orderId,
    orderedAtPl,
    personName: params.personName,
    variantLabel,
    priceGrossPln: params.priceGrossPln,
    reportUrl,
    regulaminUrl,
    politykaUrl,
    contactEmail: SELLER_LEGAL_CONFIG.contactEmail,
    sellerName: SELLER_LEGAL_CONFIG.sellerName,
    plainTextBody,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderStaticLegalHtml(doc: LegalDocumentData): string {
  const sectionsHtml = doc.sections
    .map((sec) => {
      const paras = sec.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
      const bullets = sec.bullets
        ? `<ul>${sec.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
        : '';
      const table = sec.table
        ? `<div class="table-wrap"><table><thead><tr>${sec.table.headers
            .map((h) => `<th>${escapeHtml(h)}</th>`)
            .join('')}</tr></thead><tbody>${sec.table.rows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody></table></div>`
        : '';
      return `<section><h2>${escapeHtml(sec.heading)}</h2>${paras}${bullets}${table}</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(doc.title)} — Solaris 2027</title>
  <meta name="description" content="${escapeHtml(doc.title)} — oficjalny dokument serwisu Solaris 2027." />
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0B0B0D; color: #E4E4EA; line-height: 1.65; }
    .wrap { max-width: 820px; margin: 0 auto; padding: 40px 20px 72px; }
    header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 28px; }
    a { color: #FF7B5A; text-decoration: none; }
    a:hover { text-decoration: underline; }
    nav { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; }
    h1 { font-size: 28px; color: #FFFFFF; margin: 0 0 8px; line-height: 1.25; }
    .meta { font-size: 13px; color: #9A9AA3; margin-bottom: 28px; }
    h2 { font-size: 18px; color: #FFFFFF; margin: 28px 0 10px; }
    p, li { font-size: 14px; color: #D4D4DC; }
    ul { padding-left: 20px; }
    li { margin-bottom: 6px; }
    .table-wrap { overflow-x: auto; margin: 14px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid rgba(255,255,255,0.12); padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #17171B; color: #FFFFFF; }
    footer { margin-top: 44px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #8E8E98; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <a href="/"><strong>← Powrót do Solaris 2027</strong></a>
      <nav aria-label="Dokumenty prawne">
        <a href="/regulamin">Regulamin</a>
        <a href="/polityka-prywatnosci">Polityka prywatności</a>
        <a href="/polityka-cookies">Polityka cookies</a>
        <a href="/odstapienie">Odstąpienie</a>
      </nav>
    </header>
    <main>
      <h1>${escapeHtml(doc.title)}</h1>
      <p class="meta">Obowiązuje od: ${escapeHtml(doc.effectiveDate)} · Wersja ${escapeHtml(doc.version)}</p>
      ${sectionsHtml}
    </main>
    <footer>
      <p>${escapeHtml(LEGAL_TEXTS.footerShortDisclaimer)}</p>
      <p>Dane geograficzne: GeoNames.org · Kontakt: <a href="mailto:${escapeHtml(SELLER_LEGAL_CONFIG.contactEmail)}">${escapeHtml(SELLER_LEGAL_CONFIG.contactEmail)}</a></p>
    </footer>
  </div>
</body>
</html>`;
}
