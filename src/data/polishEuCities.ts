export interface CityOption {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export const POLISH_EU_CITIES: readonly CityOption[] = [
  { name: 'Warszawa', country: 'Polska', lat: 52.2297, lon: 21.0122 },
  { name: 'Kraków', country: 'Polska', lat: 50.0647, lon: 19.945 },
  { name: 'Wrocław', country: 'Polska', lat: 51.1079, lon: 17.0385 },
  { name: 'Poznań', country: 'Polska', lat: 52.4064, lon: 16.9252 },
  { name: 'Gdańsk', country: 'Polska', lat: 54.352, lon: 18.6466 },
  { name: 'Gdynia', country: 'Polska', lat: 54.5189, lon: 18.5305 },
  { name: 'Sopot', country: 'Polska', lat: 54.4416, lon: 18.5601 },
  { name: 'Łódź', country: 'Polska', lat: 51.7592, lon: 19.456 },
  { name: 'Szczecin', country: 'Polska', lat: 53.4285, lon: 14.5528 },
  { name: 'Lublin', country: 'Polska', lat: 51.2465, lon: 22.5684 },
  { name: 'Bydgoszcz', country: 'Polska', lat: 53.1235, lon: 18.0084 },
  { name: 'Białystok', country: 'Polska', lat: 53.1325, lon: 23.1688 },
  { name: 'Katowice', country: 'Polska', lat: 50.2649, lon: 19.0238 },
  { name: 'Częstochowa', country: 'Polska', lat: 50.8118, lon: 19.1203 },
  { name: 'Radom', country: 'Polska', lat: 51.4027, lon: 21.1471 },
  { name: 'Toruń', country: 'Polska', lat: 53.0138, lon: 18.5984 },
  { name: 'Rzeszów', country: 'Polska', lat: 50.0412, lon: 21.9991 },
  { name: 'Kielce', country: 'Polska', lat: 50.8661, lon: 20.6286 },
  { name: 'Olsztyn', country: 'Polska', lat: 53.7784, lon: 20.4801 },
  { name: 'Gliwice', country: 'Polska', lat: 50.2945, lon: 18.6714 },
  { name: 'Bielsko-Biała', country: 'Polska', lat: 49.8224, lon: 19.0584 },
  { name: 'Zielona Góra', country: 'Polska', lat: 51.9356, lon: 15.5062 },
  { name: 'Opole', country: 'Polska', lat: 50.6751, lon: 17.9213 },
  { name: 'Gorzów Wielkopolski', country: 'Polska', lat: 52.7325, lon: 15.2369 },
  { name: 'Płock', country: 'Polska', lat: 52.5463, lon: 19.7065 },
  { name: 'Elbląg', country: 'Polska', lat: 54.1522, lon: 19.4088 },
  { name: 'Wałbrzych', country: 'Polska', lat: 50.7714, lon: 16.2843 },
  { name: 'Tarnów', country: 'Polska', lat: 50.0121, lon: 20.9858 },
  { name: 'Koszalin', country: 'Polska', lat: 54.1943, lon: 16.1715 },
  { name: 'Kalisz', country: 'Polska', lat: 51.7673, lon: 18.0853 },
  { name: 'Legnica', country: 'Polska', lat: 51.207, lon: 16.1553 },
  { name: 'Słupsk', country: 'Polska', lat: 54.4641, lon: 17.0285 },
  { name: 'Nowy Sącz', country: 'Polska', lat: 49.625, lon: 20.6913 },
  { name: 'Zakopane', country: 'Polska', lat: 49.2992, lon: 19.9496 },
  { name: 'Berlin', country: 'Niemcy', lat: 52.52, lon: 13.405 },
  { name: 'Monachium', country: 'Niemcy', lat: 48.1351, lon: 11.582 },
  { name: 'Hamburg', country: 'Niemcy', lat: 53.5511, lon: 9.9937 },
  { name: 'Frankfurt', country: 'Niemcy', lat: 50.1109, lon: 8.6821 },
  { name: 'Londyn', country: 'Wielka Brytania', lat: 51.5072, lon: -0.1276 },
  { name: 'Manchester', country: 'Wielka Brytania', lat: 53.4808, lon: -2.2426 },
  { name: 'Edynburg', country: 'Wielka Brytania', lat: 55.9533, lon: -3.1883 },
  { name: 'Dublin', country: 'Irlandia', lat: 53.3498, lon: -6.2603 },
  { name: 'Amsterdam', country: 'Holandia', lat: 52.3676, lon: 4.9041 },
  { name: 'Rotterdam', country: 'Holandia', lat: 51.9244, lon: 4.4777 },
  { name: 'Paryż', country: 'Francja', lat: 48.8566, lon: 2.3522 },
  { name: 'Bruksela', country: 'Belgia', lat: 50.8503, lon: 4.3517 },
  { name: 'Praga', country: 'Czechy', lat: 50.0755, lon: 14.4378 },
  { name: 'Wiedeń', country: 'Austria', lat: 48.2082, lon: 16.3738 },
  { name: 'Zurych', country: 'Szwajcaria', lat: 47.3769, lon: 8.5417 },
  { name: 'Mediolan', country: 'Włochy', lat: 45.4642, lon: 9.19 },
  { name: 'Rzym', country: 'Włochy', lat: 41.9028, lon: 12.4964 },
  { name: 'Barcelona', country: 'Hiszpania', lat: 41.3874, lon: 2.1686 },
  { name: 'Madryt', country: 'Hiszpania', lat: 40.4168, lon: -3.7038 },
  { name: 'Lizbona', country: 'Portugalia', lat: 38.7223, lon: -9.1393 },
  { name: 'Sztokholm', country: 'Szwecja', lat: 59.3293, lon: 18.0686 },
  { name: 'Oslo', country: 'Norwegia', lat: 59.9139, lon: 10.7522 },
  { name: 'Kopenhaga', country: 'Dania', lat: 55.6761, lon: 12.5683 },
  { name: 'Wilno', country: 'Litwa', lat: 54.6872, lon: 25.2797 },
  { name: 'Lwów', country: 'Ukraina', lat: 49.8397, lon: 24.0297 },
  { name: 'Kijów', country: 'Ukraina', lat: 50.4501, lon: 30.5234 },
];

export function searchCities(query: string, limit = 6): CityOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return POLISH_EU_CITIES.slice(0, limit);

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l');

  const normQ = normalize(q);
  const startsWith: CityOption[] = [];
  const includes: CityOption[] = [];

  for (const city of POLISH_EU_CITIES) {
    const normName = normalize(city.name);
    if (normName.startsWith(normQ)) {
      startsWith.push(city);
    } else if (normName.includes(normQ) || normalize(city.country).includes(normQ)) {
      includes.push(city);
    }
  }

  return [...startsWith, ...includes].slice(0, limit);
}

export function resolveCityCoordinates(cityName: string): CityOption {
  const matches = searchCities(cityName, 1);
  if (matches.length > 0 && cityName.trim().length > 0) {
    return matches[0];
  }
  return {
    name: cityName.trim() || 'Warszawa',
    country: 'Polska',
    lat: 52.2297,
    lon: 21.0122,
  };
}
