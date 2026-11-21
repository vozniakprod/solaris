export interface PlaceOption {
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
  altNames?: readonly string[];
}

// Compact tuple format: [name, admin1, country, lat, lon, tz, altNames?]
type RawPlaceTuple = readonly [
  string,
  string,
  string,
  number,
  number,
  string,
  (readonly string[])?,
];

const RAW_PLACES: readonly RawPlaceTuple[] = [
  // POLSKA — województwa, miasta na prawach powiatu i główne miasta powiatowe
  ['Warszawa', 'mazowieckie', 'Polska', 52.2297, 21.0122, 'Europe/Warsaw', ['Warsaw', 'Варшава', 'Warschau']],
  ['Kraków', 'małopolskie', 'Polska', 50.0647, 19.945, 'Europe/Warsaw', ['Krakow', 'Cracow', 'Краков', 'Krakau']],
  ['Wrocław', 'dolnośląskie', 'Polska', 51.1079, 17.0385, 'Europe/Warsaw', ['Wroclaw', 'Breslau', 'Вроцлав']],
  ['Łódź', 'łódzkie', 'Polska', 51.7592, 19.456, 'Europe/Warsaw', ['Lodz', 'Лодзь']],
  ['Poznań', 'wielkopolskie', 'Polska', 52.4064, 16.9252, 'Europe/Warsaw', ['Poznan', 'Posen', 'Познань']],
  ['Gdańsk', 'pomorskie', 'Polska', 54.352, 18.6466, 'Europe/Warsaw', ['Gdansk', 'Danzig', 'Гданьск']],
  ['Szczecin', 'zachodniopomorskie', 'Polska', 53.4285, 14.5528, 'Europe/Warsaw', ['Stettin', 'Щецин']],
  ['Bydgoszcz', 'kujawsko-pomorskie', 'Polska', 53.1235, 18.0084, 'Europe/Warsaw', ['Bromberg']],
  ['Lublin', 'lubelskie', 'Polska', 51.2465, 22.5684, 'Europe/Warsaw', ['Люблин']],
  ['Białystok', 'podlaskie', 'Polska', 53.1325, 23.1688, 'Europe/Warsaw', ['Bialystok', 'Белосток']],
  ['Katowice', 'śląskie', 'Polska', 50.2649, 19.0238, 'Europe/Warsaw', ['Kattowitz', 'Катовице']],
  ['Gdynia', 'pomorskie', 'Polska', 54.5189, 18.5305, 'Europe/Warsaw'],
  ['Sopot', 'pomorskie', 'Polska', 54.4416, 18.5601, 'Europe/Warsaw'],
  ['Częstochowa', 'śląskie', 'Polska', 50.8118, 19.1203, 'Europe/Warsaw', ['Czestochowa']],
  ['Radom', 'mazowieckie', 'Polska', 51.4027, 21.1471, 'Europe/Warsaw'],
  ['Toruń', 'kujawsko-pomorskie', 'Polska', 53.0138, 18.5984, 'Europe/Warsaw', ['Torun', 'Thorn']],
  ['Rzeszów', 'podkarpackie', 'Polska', 50.0412, 21.9991, 'Europe/Warsaw', ['Rzeszow']],
  ['Sosnowiec', 'śląskie', 'Polska', 50.2863, 19.1041, 'Europe/Warsaw'],
  ['Kielce', 'świętokrzyskie', 'Polska', 50.8661, 20.6286, 'Europe/Warsaw'],
  ['Gliwice', 'śląskie', 'Polska', 50.2945, 18.6714, 'Europe/Warsaw'],
  ['Olsztyn', 'warmińsko-mazurskie', 'Polska', 53.7784, 20.4801, 'Europe/Warsaw', ['Allenstein']],
  ['Zabrze', 'śląskie', 'Polska', 50.3249, 18.7857, 'Europe/Warsaw'],
  ['Bielsko-Biała', 'śląskie', 'Polska', 49.8224, 19.0584, 'Europe/Warsaw', ['Bielsko Biala']],
  ['Bytom', 'śląskie', 'Polska', 50.3484, 18.9157, 'Europe/Warsaw'],
  ['Zielona Góra', 'lubuskie', 'Polska', 51.9356, 15.5062, 'Europe/Warsaw', ['Zielona Gora']],
  ['Rybnik', 'śląskie', 'Polska', 50.1022, 18.5463, 'Europe/Warsaw'],
  ['Ruda Śląska', 'śląskie', 'Polska', 50.2584, 18.8563, 'Europe/Warsaw', ['Ruda Slaska']],
  ['Opole', 'opolskie', 'Polska', 50.6751, 17.9213, 'Europe/Warsaw'],
  ['Tychy', 'śląskie', 'Polska', 50.1372, 18.9664, 'Europe/Warsaw'],
  ['Gorzów Wielkopolski', 'lubuskie', 'Polska', 52.7325, 15.2369, 'Europe/Warsaw', ['Gorzow']],
  ['Elbląg', 'warmińsko-mazurskie', 'Polska', 54.1522, 19.4088, 'Europe/Warsaw', ['Elblag']],
  ['Płock', 'mazowieckie', 'Polska', 52.5463, 19.7065, 'Europe/Warsaw', ['Plock']],
  ['Dąbrowa Górnicza', 'śląskie', 'Polska', 50.3217, 19.1949, 'Europe/Warsaw'],
  ['Wałbrzych', 'dolnośląskie', 'Polska', 50.7714, 16.2843, 'Europe/Warsaw', ['Walbrzych']],
  ['Włocławek', 'kujawsko-pomorskie', 'Polska', 52.6483, 19.0677, 'Europe/Warsaw', ['Wloclawek']],
  ['Tarnów', 'małopolskie', 'Polska', 50.0121, 20.9858, 'Europe/Warsaw', ['Tarnow']],
  ['Chorzów', 'śląskie', 'Polska', 50.2975, 18.9546, 'Europe/Warsaw', ['Chorzow']],
  ['Koszalin', 'zachodniopomorskie', 'Polska', 54.1943, 16.1715, 'Europe/Warsaw'],
  ['Kalisz', 'wielkopolskie', 'Polska', 51.7673, 18.0853, 'Europe/Warsaw'],
  ['Legnica', 'dolnośląskie', 'Polska', 51.207, 16.1553, 'Europe/Warsaw'],
  ['Grudziądz', 'kujawsko-pomorskie', 'Polska', 53.4837, 18.7536, 'Europe/Warsaw'],
  ['Jaworzno', 'śląskie', 'Polska', 50.2053, 19.275, 'Europe/Warsaw'],
  ['Słupsk', 'pomorskie', 'Polska', 54.4641, 17.0285, 'Europe/Warsaw', ['Slupsk']],
  ['Jastrzębie-Zdrój', 'śląskie', 'Polska', 49.948, 18.5944, 'Europe/Warsaw'],
  ['Nowy Sącz', 'małopolskie', 'Polska', 49.625, 20.6913, 'Europe/Warsaw', ['Nowy Sacz']],
  ['Jelenia Góra', 'dolnośląskie', 'Polska', 50.9044, 15.7194, 'Europe/Warsaw', ['Jelenia Gora']],
  ['Siedlce', 'mazowieckie', 'Polska', 52.1676, 22.2902, 'Europe/Warsaw'],
  ['Mysłowice', 'śląskie', 'Polska', 50.208, 19.1661, 'Europe/Warsaw'],
  ['Konin', 'wielkopolskie', 'Polska', 52.223, 18.2511, 'Europe/Warsaw'],
  ['Piła', 'wielkopolskie', 'Polska', 53.1514, 16.7378, 'Europe/Warsaw', ['Pila']],
  ['Piotrków Trybunalski', 'łódzkie', 'Polska', 51.4052, 19.703, 'Europe/Warsaw'],
  ['Inowrocław', 'kujawsko-pomorskie', 'Polska', 52.7931, 18.2636, 'Europe/Warsaw'],
  ['Lubin', 'dolnośląskie', 'Polska', 51.4009, 16.2015, 'Europe/Warsaw'],
  ['Ostrów Wielkopolski', 'wielkopolskie', 'Polska', 51.655, 17.8069, 'Europe/Warsaw'],
  ['Suwałki', 'podlaskie', 'Polska', 54.1115, 22.9308, 'Europe/Warsaw', ['Suwalki']],
  ['Stargard', 'zachodniopomorskie', 'Polska', 53.3365, 15.0504, 'Europe/Warsaw'],
  ['Gniezno', 'wielkopolskie', 'Polska', 52.5349, 17.5826, 'Europe/Warsaw'],
  ['Ostrowiec Świętokrzyski', 'świętokrzyskie', 'Polska', 50.9294, 21.3853, 'Europe/Warsaw'],
  ['Siemianowice Śląskie', 'śląskie', 'Polska', 50.327, 19.0292, 'Europe/Warsaw'],
  ['Głogów', 'dolnośląskie', 'Polska', 51.6636, 16.0845, 'Europe/Warsaw', ['Glogow']],
  ['Pabianice', 'łódzkie', 'Polska', 51.6642, 19.3547, 'Europe/Warsaw'],
  ['Leszno', 'wielkopolskie', 'Polska', 51.8419, 16.5749, 'Europe/Warsaw'],
  ['Żory', 'śląskie', 'Polska', 50.0454, 18.6945, 'Europe/Warsaw'],
  ['Zamość', 'lubelskie', 'Polska', 50.7231, 23.252, 'Europe/Warsaw', ['Zamosc']],
  ['Pruszków', 'mazowieckie', 'Polska', 52.1706, 20.812, 'Europe/Warsaw'],
  ['Łomża', 'podlaskie', 'Polska', 53.1781, 22.0593, 'Europe/Warsaw', ['Lomza']],
  ['Ełk', 'warmińsko-mazurskie', 'Polska', 53.8281, 22.3647, 'Europe/Warsaw', ['Elk']],
  ['Tomaszów Mazowiecki', 'łódzkie', 'Polska', 51.5313, 20.0086, 'Europe/Warsaw'],
  ['Chełm', 'lubelskie', 'Polska', 51.1431, 23.4712, 'Europe/Warsaw'],
  ['Mielec', 'podkarpackie', 'Polska', 50.2871, 21.4239, 'Europe/Warsaw'],
  ['Kędzierzyn-Koźle', 'opolskie', 'Polska', 50.3498, 18.2261, 'Europe/Warsaw'],
  ['Przemyśl', 'podkarpackie', 'Polska', 49.7839, 22.7678, 'Europe/Warsaw', ['Przemysl']],
  ['Stalowa Wola', 'podkarpackie', 'Polska', 50.5826, 22.0536, 'Europe/Warsaw'],
  ['Tczew', 'pomorskie', 'Polska', 54.0924, 18.7779, 'Europe/Warsaw'],
  ['Biała Podlaska', 'lubelskie', 'Polska', 52.0324, 23.1165, 'Europe/Warsaw'],
  ['Bełchatów', 'łódzkie', 'Polska', 51.3688, 19.3567, 'Europe/Warsaw'],
  ['Świdnica', 'dolnośląskie', 'Polska', 50.8438, 16.4886, 'Europe/Warsaw'],
  ['Będzin', 'śląskie', 'Polska', 50.3249, 19.1292, 'Europe/Warsaw'],
  ['Zgierz', 'łódzkie', 'Polska', 51.8551, 19.4062, 'Europe/Warsaw'],
  ['Piekary Śląskie', 'śląskie', 'Polska', 50.3782, 18.9467, 'Europe/Warsaw'],
  ['Racibórz', 'śląskie', 'Polska', 50.0919, 18.2194, 'Europe/Warsaw'],
  ['Legionowo', 'mazowieckie', 'Polska', 52.4017, 20.927, 'Europe/Warsaw'],
  ['Ostrołęka', 'mazowieckie', 'Polska', 53.0844, 21.5754, 'Europe/Warsaw'],
  ['Świętochłowice', 'śląskie', 'Polska', 50.2918, 18.9178, 'Europe/Warsaw'],
  ['Wejherowo', 'pomorskie', 'Polska', 54.6056, 18.2356, 'Europe/Warsaw'],
  ['Zawiercie', 'śląskie', 'Polska', 50.4877, 19.4168, 'Europe/Warsaw'],
  ['Skierniewice', 'łódzkie', 'Polska', 51.9548, 20.1584, 'Europe/Warsaw'],
  ['Starachowice', 'świętokrzyskie', 'Polska', 51.0369, 21.0714, 'Europe/Warsaw'],
  ['Wodzisław Śląski', 'śląskie', 'Polska', 50.0025, 18.4631, 'Europe/Warsaw'],
  ['Starogard Gdański', 'pomorskie', 'Polska', 53.9634, 18.5256, 'Europe/Warsaw'],
  ['Puławy', 'lubelskie', 'Polska', 51.4166, 21.9694, 'Europe/Warsaw'],
  ['Tarnobrzeg', 'podkarpackie', 'Polska', 50.573, 21.6794, 'Europe/Warsaw'],
  ['Kołobrzeg', 'zachodniopomorskie', 'Polska', 54.1759, 15.5833, 'Europe/Warsaw', ['Kolobrzeg']],
  ['Krosno', 'podkarpackie', 'Polska', 49.6887, 21.7706, 'Europe/Warsaw'],
  ['Radomsko', 'łódzkie', 'Polska', 51.0672, 19.4446, 'Europe/Warsaw'],
  ['Otwock', 'mazowieckie', 'Polska', 52.1058, 21.2613, 'Europe/Warsaw'],
  ['Skarżysko-Kamienna', 'świętokrzyskie', 'Polska', 51.1131, 20.8712, 'Europe/Warsaw'],
  ['Ciechanów', 'mazowieckie', 'Polska', 52.8819, 20.6106, 'Europe/Warsaw'],
  ['Kutno', 'łódzkie', 'Polska', 52.2306, 19.3641, 'Europe/Warsaw'],
  ['Sieradz', 'łódzkie', 'Polska', 51.5956, 18.7303, 'Europe/Warsaw'],
  ['Zduńska Wola', 'łódzkie', 'Polska', 51.6003, 18.9389, 'Europe/Warsaw'],
  ['Świnoujście', 'zachodniopomorskie', 'Polska', 53.9105, 14.2471, 'Europe/Warsaw', ['Swinoujscie']],
  ['Żyrardów', 'mazowieckie', 'Polska', 52.0488, 20.446, 'Europe/Warsaw'],
  ['Bolesławiec', 'dolnośląskie', 'Polska', 51.2636, 15.5675, 'Europe/Warsaw'],
  ['Nowa Sól', 'lubuskie', 'Polska', 51.8058, 15.717, 'Europe/Warsaw'],
  ['Knurów', 'śląskie', 'Polska', 50.2206, 18.6708, 'Europe/Warsaw'],
  ['Oświęcim', 'małopolskie', 'Polska', 50.0344, 19.2104, 'Europe/Warsaw', ['Oswiecim']],
  ['Sandomierz', 'świętokrzyskie', 'Polska', 50.6822, 21.749, 'Europe/Warsaw'],
  ['Sanok', 'podkarpackie', 'Polska', 49.5557, 22.2056, 'Europe/Warsaw'],
  ['Jarosław', 'podkarpackie', 'Polska', 50.0162, 22.6778, 'Europe/Warsaw'],
  ['Dębica', 'podkarpackie', 'Polska', 50.0517, 21.4116, 'Europe/Warsaw'],
  ['Jasło', 'podkarpackie', 'Polska', 49.745, 21.4725, 'Europe/Warsaw'],
  ['Zakopane', 'małopolskie', 'Polska', 49.2992, 19.9496, 'Europe/Warsaw'],
  ['Nowy Targ', 'małopolskie', 'Polska', 49.4778, 20.0323, 'Europe/Warsaw'],
  ['Bochnia', 'małopolskie', 'Polska', 49.9691, 20.4303, 'Europe/Warsaw'],
  ['Wieliczka', 'małopolskie', 'Polska', 49.9871, 20.0648, 'Europe/Warsaw'],
  ['Wadowice', 'małopolskie', 'Polska', 49.8834, 19.4937, 'Europe/Warsaw'],
  ['Olkusz', 'małopolskie', 'Polska', 50.2792, 19.5665, 'Europe/Warsaw'],
  ['Chrzanów', 'małopolskie', 'Polska', 50.1355, 19.402, 'Europe/Warsaw'],
  ['Gorlice', 'małopolskie', 'Polska', 49.6544, 21.1597, 'Europe/Warsaw'],
  ['Limanowa', 'małopolskie', 'Polska', 49.7016, 20.4227, 'Europe/Warsaw'],
  ['Brzesko', 'małopolskie', 'Polska', 49.969, 20.6062, 'Europe/Warsaw'],
  ['Piaseczno', 'mazowieckie', 'Polska', 52.0733, 21.0269, 'Europe/Warsaw'],
  ['Wołomin', 'mazowieckie', 'Polska', 52.3458, 21.2414, 'Europe/Warsaw'],
  ['Mińsk Mazowiecki', 'mazowieckie', 'Polska', 52.1794, 21.5725, 'Europe/Warsaw'],
  ['Grodzisk Mazowiecki', 'mazowieckie', 'Polska', 52.1095, 20.6335, 'Europe/Warsaw'],
  ['Sochaczew', 'mazowieckie', 'Polska', 52.2292, 20.2383, 'Europe/Warsaw'],
  ['Mława', 'mazowieckie', 'Polska', 53.1128, 20.3849, 'Europe/Warsaw'],
  ['Płońsk', 'mazowieckie', 'Polska', 52.6235, 20.3755, 'Europe/Warsaw'],
  ['Wyszków', 'mazowieckie', 'Polska', 52.5928, 21.4584, 'Europe/Warsaw'],
  ['Pułtusk', 'mazowieckie', 'Polska', 52.7031, 21.0846, 'Europe/Warsaw'],
  ['Garwolin', 'mazowieckie', 'Polska', 51.8966, 21.6152, 'Europe/Warsaw'],
  ['Rumia', 'pomorskie', 'Polska', 54.5707, 18.3879, 'Europe/Warsaw'],
  ['Reda', 'pomorskie', 'Polska', 54.6053, 18.3472, 'Europe/Warsaw'],
  ['Pruszcz Gdański', 'pomorskie', 'Polska', 54.2621, 18.6363, 'Europe/Warsaw'],
  ['Malbork', 'pomorskie', 'Polska', 54.0359, 19.0266, 'Europe/Warsaw'],
  ['Kwidzyn', 'pomorskie', 'Polska', 53.7259, 18.9311, 'Europe/Warsaw'],
  ['Chojnice', 'pomorskie', 'Polska', 53.6957, 17.557, 'Europe/Warsaw'],
  ['Lębork', 'pomorskie', 'Polska', 54.5392, 17.7501, 'Europe/Warsaw'],
  ['Kościerzyna', 'pomorskie', 'Polska', 54.1219, 17.9812, 'Europe/Warsaw'],
  ['Kartuzy', 'pomorskie', 'Polska', 54.3341, 18.2003, 'Europe/Warsaw'],
  ['Bytów', 'pomorskie', 'Polska', 54.1707, 17.4906, 'Europe/Warsaw'],
  ['Puck', 'pomorskie', 'Polska', 54.7176, 18.4084, 'Europe/Warsaw'],
  ['Ustka', 'pomorskie', 'Polska', 54.5805, 16.8619, 'Europe/Warsaw'],
  ['Władysławowo', 'pomorskie', 'Polska', 54.7909, 18.4009, 'Europe/Warsaw'],
  ['Swarzędz', 'wielkopolskie', 'Polska', 52.4114, 17.0785, 'Europe/Warsaw'],
  ['Luboń', 'wielkopolskie', 'Polska', 52.3458, 16.8763, 'Europe/Warsaw'],
  ['Września', 'wielkopolskie', 'Polska', 52.3251, 17.5652, 'Europe/Warsaw'],
  ['Śrem', 'wielkopolskie', 'Polska', 52.0887, 17.0151, 'Europe/Warsaw'],
  ['Jarocin', 'wielkopolskie', 'Polska', 51.9727, 17.5026, 'Europe/Warsaw'],
  ['Krotoszyn', 'wielkopolskie', 'Polska', 51.6987, 17.437, 'Europe/Warsaw'],
  ['Turek', 'wielkopolskie', 'Polska', 52.0156, 18.5006, 'Europe/Warsaw'],
  ['Kościan', 'wielkopolskie', 'Polska', 52.0883, 16.6487, 'Europe/Warsaw'],
  ['Wągrowiec', 'wielkopolskie', 'Polska', 52.8085, 17.1997, 'Europe/Warsaw'],
  ['Koło', 'wielkopolskie', 'Polska', 52.2001, 18.6387, 'Europe/Warsaw'],
  ['Środa Wielkopolska', 'wielkopolskie', 'Polska', 52.2286, 17.2756, 'Europe/Warsaw'],
  ['Szamotuły', 'wielkopolskie', 'Polska', 52.6122, 16.5784, 'Europe/Warsaw'],
  ['Gostyń', 'wielkopolskie', 'Polska', 51.8794, 17.0124, 'Europe/Warsaw'],
  ['Rawicz', 'wielkopolskie', 'Polska', 51.6092, 16.8574, 'Europe/Warsaw'],
  ['Kępno', 'wielkopolskie', 'Polska', 51.2785, 17.9891, 'Europe/Warsaw'],
  ['Oława', 'dolnośląskie', 'Polska', 50.9462, 17.2926, 'Europe/Warsaw'],
  ['Oleśnica', 'dolnośląskie', 'Polska', 51.2116, 17.3834, 'Europe/Warsaw'],
  ['Dzierżoniów', 'dolnośląskie', 'Polska', 50.7281, 16.6512, 'Europe/Warsaw'],
  ['Zgorzelec', 'dolnośląskie', 'Polska', 51.1494, 15.0083, 'Europe/Warsaw'],
  ['Kłodzko', 'dolnośląskie', 'Polska', 50.4349, 16.6544, 'Europe/Warsaw'],
  ['Polkowice', 'dolnośląskie', 'Polska', 51.5008, 16.0686, 'Europe/Warsaw'],
  ['Jawor', 'dolnośląskie', 'Polska', 51.0528, 16.1912, 'Europe/Warsaw'],
  ['Bielawa', 'dolnośląskie', 'Polska', 50.6908, 16.6231, 'Europe/Warsaw'],
  ['Świebodzice', 'dolnośląskie', 'Polska', 50.8599, 16.3282, 'Europe/Warsaw'],
  ['Nysa', 'opolskie', 'Polska', 50.4738, 17.3344, 'Europe/Warsaw'],
  ['Brzeg', 'opolskie', 'Polska', 50.8608, 17.4674, 'Europe/Warsaw'],
  ['Kluczbork', 'opolskie', 'Polska', 50.9726, 18.2182, 'Europe/Warsaw'],
  ['Prudnik', 'opolskie', 'Polska', 50.3212, 17.5754, 'Europe/Warsaw'],
  ['Strzelce Opolskie', 'opolskie', 'Polska', 50.5112, 18.3007, 'Europe/Warsaw'],
  ['Krapkowice', 'opolskie', 'Polska', 50.4752, 17.9654, 'Europe/Warsaw'],
  ['Cieszyn', 'śląskie', 'Polska', 49.7495, 18.6331, 'Europe/Warsaw'],
  ['Żywiec', 'śląskie', 'Polska', 49.6853, 19.1924, 'Europe/Warsaw'],
  ['Tarnowskie Góry', 'śląskie', 'Polska', 50.444, 18.8558, 'Europe/Warsaw'],
  ['Mikołów', 'śląskie', 'Polska', 50.1711, 18.9039, 'Europe/Warsaw'],
  ['Pszczyna', 'śląskie', 'Polska', 49.9776, 18.9416, 'Europe/Warsaw'],
  ['Czechowice-Dziedzice', 'śląskie', 'Polska', 49.9134, 19.0044, 'Europe/Warsaw'],
  ['Czeladź', 'śląskie', 'Polska', 50.3173, 19.0706, 'Europe/Warsaw'],
  ['Lubliniec', 'śląskie', 'Polska', 50.6687, 18.6844, 'Europe/Warsaw'],
  ['Brodnica', 'kujawsko-pomorskie', 'Polska', 53.2597, 19.3958, 'Europe/Warsaw'],
  ['Świecie', 'kujawsko-pomorskie', 'Polska', 53.4095, 18.4472, 'Europe/Warsaw'],
  ['Chełmno', 'kujawsko-pomorskie', 'Polska', 53.3491, 18.4256, 'Europe/Warsaw'],
  ['Nakło nad Notecią', 'kujawsko-pomorskie', 'Polska', 53.1422, 17.6018, 'Europe/Warsaw'],
  ['Rypin', 'kujawsko-pomorskie', 'Polska', 53.0668, 19.4071, 'Europe/Warsaw'],
  ['Iława', 'warmińsko-mazurskie', 'Polska', 53.5964, 19.5686, 'Europe/Warsaw'],
  ['Ostróda', 'warmińsko-mazurskie', 'Polska', 53.6967, 19.9649, 'Europe/Warsaw'],
  ['Giżycko', 'warmińsko-mazurskie', 'Polska', 54.0381, 21.7644, 'Europe/Warsaw'],
  ['Kętrzyn', 'warmińsko-mazurskie', 'Polska', 54.0768, 21.3753, 'Europe/Warsaw'],
  ['Szczytno', 'warmińsko-mazurskie', 'Polska', 53.5626, 20.9875, 'Europe/Warsaw'],
  ['Mrągowo', 'warmińsko-mazurskie', 'Polska', 53.8644, 21.3051, 'Europe/Warsaw'],
  ['Bartoszyce', 'warmińsko-mazurskie', 'Polska', 54.2535, 20.8082, 'Europe/Warsaw'],
  ['Augustów', 'podlaskie', 'Polska', 53.8434, 22.9798, 'Europe/Warsaw'],
  ['Bielsk Podlaski', 'podlaskie', 'Polska', 52.7683, 23.1921, 'Europe/Warsaw'],
  ['Zambrów', 'podlaskie', 'Polska', 52.9854, 22.2435, 'Europe/Warsaw'],
  ['Grajewo', 'podlaskie', 'Polska', 53.6473, 22.4553, 'Europe/Warsaw'],
  ['Hajnówka', 'podlaskie', 'Polska', 52.7433, 23.5812, 'Europe/Warsaw'],
  ['Sokółka', 'podlaskie', 'Polska', 53.4072, 23.5023, 'Europe/Warsaw'],
  ['Świdnik', 'lubelskie', 'Polska', 51.2194, 22.6997, 'Europe/Warsaw'],
  ['Kraśnik', 'lubelskie', 'Polska', 50.9234, 22.2275, 'Europe/Warsaw'],
  ['Łuków', 'lubelskie', 'Polska', 51.9293, 22.3822, 'Europe/Warsaw'],
  ['Biłgoraj', 'lubelskie', 'Polska', 50.5409, 22.722, 'Europe/Warsaw'],
  ['Lubartów', 'lubelskie', 'Polska', 51.4622, 22.6085, 'Europe/Warsaw'],
  ['Łęczna', 'lubelskie', 'Polska', 51.3016, 22.8789, 'Europe/Warsaw'],
  ['Krasnystaw', 'lubelskie', 'Polska', 50.9844, 23.1731, 'Europe/Warsaw'],
  ['Szczecinek', 'zachodniopomorskie', 'Polska', 53.7079, 16.6994, 'Europe/Warsaw'],
  ['Police', 'zachodniopomorskie', 'Polska', 53.5521, 14.5718, 'Europe/Warsaw'],
  ['Wałcz', 'zachodniopomorskie', 'Polska', 53.2779, 16.4712, 'Europe/Warsaw'],
  ['Białogard', 'zachodniopomorskie', 'Polska', 54.007, 15.9875, 'Europe/Warsaw'],
  ['Goleniów', 'zachodniopomorskie', 'Polska', 53.5639, 14.8286, 'Europe/Warsaw'],
  ['Gryfino', 'zachodniopomorskie', 'Polska', 53.2524, 14.4883, 'Europe/Warsaw'],
  ['Żary', 'lubuskie', 'Polska', 51.6421, 15.1373, 'Europe/Warsaw'],
  ['Żagań', 'lubuskie', 'Polska', 51.617, 15.3148, 'Europe/Warsaw'],
  ['Świebodzin', 'lubuskie', 'Polska', 52.2471, 15.5333, 'Europe/Warsaw'],
  ['Międzyrzecz', 'lubuskie', 'Polska', 52.4446, 15.578, 'Europe/Warsaw'],
  ['Słubice', 'lubuskie', 'Polska', 52.3496, 14.5608, 'Europe/Warsaw'],
  ['Kostrzyn nad Odrą', 'lubuskie', 'Polska', 52.5877, 14.6499, 'Europe/Warsaw'],
  ['Końskie', 'świętokrzyskie', 'Polska', 51.1912, 20.4063, 'Europe/Warsaw'],
  ['Busko-Zdrój', 'świętokrzyskie', 'Polska', 50.4706, 20.7191, 'Europe/Warsaw'],
  ['Jędrzejów', 'świętokrzyskie', 'Polska', 50.6394, 20.3046, 'Europe/Warsaw'],
  ['Staszów', 'świętokrzyskie', 'Polska', 50.5608, 21.1666, 'Europe/Warsaw'],
  ['Łowicz', 'łódzkie', 'Polska', 52.1069, 19.9453, 'Europe/Warsaw'],
  ['Wieluń', 'łódzkie', 'Polska', 51.2206, 18.57, 'Europe/Warsaw'],
  ['Opoczno', 'łódzkie', 'Polska', 51.3762, 20.2869, 'Europe/Warsaw'],
  ['Aleksandrów Łódzki', 'łódzkie', 'Polska', 51.8194, 19.3037, 'Europe/Warsaw'],
  ['Ozorków', 'łódzkie', 'Polska', 51.9647, 19.2861, 'Europe/Warsaw'],
  ['Łask', 'łódzkie', 'Polska', 51.5906, 19.1325, 'Europe/Warsaw'],
  ['Rawa Mazowiecka', 'łódzkie', 'Polska', 51.7647, 20.2528, 'Europe/Warsaw'],

  // EUROPA & ŚWIAT (z poprawnymi strefami IANA i alternatywnymi nazwami)
  ['Berlin', 'Berlin', 'Niemcy', 52.52, 13.405, 'Europe/Berlin', ['Берлин']],
  ['Monachium', 'Bawaria', 'Niemcy', 48.1351, 11.582, 'Europe/Berlin', ['Munich', 'München', 'Мюнхен']],
  ['Hamburg', 'Hamburg', 'Niemcy', 53.5511, 9.9937, 'Europe/Berlin'],
  ['Frankfurt nad Menem', 'Hesja', 'Niemcy', 50.1109, 8.6821, 'Europe/Berlin', ['Frankfurt']],
  ['Kolonia', 'Nadrenia Północna-Westfalia', 'Niemcy', 50.9375, 6.9603, 'Europe/Berlin', ['Cologne', 'Köln']],
  ['Stuttgart', 'Badenia-Wirtembergia', 'Niemcy', 48.7758, 9.1829, 'Europe/Berlin'],
  ['Düsseldorf', 'Nadrenia Północna-Westfalia', 'Niemcy', 51.2277, 6.7735, 'Europe/Berlin', ['Dusseldorf']],
  ['Dortmund', 'Nadrenia Północna-Westfalia', 'Niemcy', 51.5136, 7.4653, 'Europe/Berlin'],
  ['Lipsk', 'Saksonia', 'Niemcy', 51.3397, 12.3731, 'Europe/Berlin', ['Leipzig']],
  ['Drezno', 'Saksonia', 'Niemcy', 51.0504, 13.7373, 'Europe/Berlin', ['Dresden']],
  ['Hanower', 'Dolna Saksonia', 'Niemcy', 52.3759, 9.732, 'Europe/Berlin', ['Hannover', 'Hanover']],
  ['Norymberga', 'Bawaria', 'Niemcy', 49.4521, 11.0767, 'Europe/Berlin', ['Nuremberg', 'Nürnberg']],
  ['Londyn', 'Anglia', 'Wielka Brytania', 51.5072, -0.1276, 'Europe/London', ['London', 'Лондон']],
  ['Manchester', 'Anglia', 'Wielka Brytania', 53.4808, -2.2426, 'Europe/London'],
  ['Birmingham', 'Anglia', 'Wielka Brytania', 52.4862, -1.8904, 'Europe/London'],
  ['Liverpool', 'Anglia', 'Wielka Brytania', 53.4084, -2.9916, 'Europe/London'],
  ['Leeds', 'Anglia', 'Wielka Brytania', 53.8008, -1.5491, 'Europe/London'],
  ['Bristol', 'Anglia', 'Wielka Brytania', 51.4545, -2.5879, 'Europe/London'],
  ['Edynburg', 'Szkocja', 'Wielka Brytania', 55.9533, -3.1883, 'Europe/London', ['Edinburgh']],
  ['Glasgow', 'Szkocja', 'Wielka Brytania', 55.8642, -4.2518, 'Europe/London'],
  ['Belfast', 'Irlandia Północna', 'Wielka Brytania', 54.5973, -5.9301, 'Europe/London'],
  ['Dublin', 'Leinster', 'Irlandia', 53.3498, -6.2603, 'Europe/Dublin'],
  ['Cork', 'Munster', 'Irlandia', 51.8985, -8.4756, 'Europe/Dublin'],
  ['Galway', 'Connacht', 'Irlandia', 53.2707, -9.0568, 'Europe/Dublin'],
  ['Amsterdam', 'Holandia Północna', 'Holandia', 52.3676, 4.9041, 'Europe/Amsterdam'],
  ['Rotterdam', 'Holandia Południowa', 'Holandia', 51.9244, 4.4777, 'Europe/Amsterdam'],
  ['Haga', 'Holandia Południowa', 'Holandia', 52.0705, 4.3007, 'Europe/Amsterdam', ['The Hague', 'Den Haag']],
  ['Utrecht', 'Utrecht', 'Holandia', 52.0907, 5.1214, 'Europe/Amsterdam'],
  ['Eindhoven', 'Brabancja Północna', 'Holandia', 51.4416, 5.4697, 'Europe/Amsterdam'],
  ['Paryż', 'Île-de-France', 'Francja', 48.8566, 2.3522, 'Europe/Paris', ['Paris', 'Париж']],
  ['Lyon', 'Owernia-Rodan-Alpy', 'Francja', 45.764, 4.8357, 'Europe/Paris'],
  ['Marsylia', 'Prowansja-Alpy-Lazurowe Wybrzeże', 'Francja', 43.2965, 5.3698, 'Europe/Paris', ['Marseille']],
  ['Nicea', 'Prowansja-Alpy-Lazurowe Wybrzeże', 'Francja', 43.7102, 7.262, 'Europe/Paris', ['Nice']],
  ['Bruksela', 'Region Stołeczny Brukseli', 'Belgia', 50.8503, 4.3517, 'Europe/Brussels', ['Brussels', 'Bruxelles']],
  ['Antwerpia', 'Flandria', 'Belgia', 51.2194, 4.4025, 'Europe/Brussels', ['Antwerp', 'Antwerpen']],
  ['Luksemburg', 'Luksemburg', 'Luksemburg', 49.6116, 6.1319, 'Europe/Luxembourg', ['Luxembourg']],
  ['Praga', 'Praga', 'Czechy', 50.0755, 14.4378, 'Europe/Prague', ['Prague', 'Praha', 'Прага']],
  ['Brno', 'Kraj południowomorawski', 'Czechy', 49.1951, 16.6068, 'Europe/Prague'],
  ['Ostrawa', 'Kraj morawsko-śląski', 'Czechy', 49.8209, 18.2625, 'Europe/Prague', ['Ostrava']],
  ['Bratysława', 'Kraj bratysławski', 'Słowacja', 48.1486, 17.1077, 'Europe/Bratislava', ['Bratislava']],
  ['Koszyce', 'Kraj koszycki', 'Słowacja', 48.7164, 21.2611, 'Europe/Bratislava', ['Kosice', 'Košice']],
  ['Wiedeń', 'Wiedeń', 'Austria', 48.2082, 16.3738, 'Europe/Vienna', ['Vienna', 'Wien', 'Вена']],
  ['Graz', 'Styria', 'Austria', 47.0707, 15.4395, 'Europe/Vienna'],
  ['Salzburg', 'Salzburg', 'Austria', 47.8095, 13.055, 'Europe/Vienna'],
  ['Zurych', 'Zurych', 'Szwajcaria', 47.3769, 8.5417, 'Europe/Zurich', ['Zurich', 'Zürich']],
  ['Genewa', 'Genewa', 'Szwajcaria', 46.2044, 6.1432, 'Europe/Zurich', ['Geneva', 'Genève']],
  ['Bazylea', 'Bazylea-Miasto', 'Szwajcaria', 47.5596, 7.5886, 'Europe/Zurich', ['Basel']],
  ['Berno', 'Berno', 'Szwajcaria', 46.948, 7.4474, 'Europe/Zurich', ['Bern']],
  ['Mediolan', 'Lombardia', 'Włochy', 45.4642, 9.19, 'Europe/Rome', ['Milan', 'Milano']],
  ['Rzym', 'Lacjum', 'Włochy', 41.9028, 12.4964, 'Europe/Rome', ['Rome', 'Roma', 'Рим']],
  ['Neapol', 'Kampania', 'Włochy', 40.8518, 14.2681, 'Europe/Rome', ['Naples', 'Napoli']],
  ['Turyn', 'Piemont', 'Włochy', 45.0703, 7.6869, 'Europe/Rome', ['Turin', 'Torino']],
  ['Bolonia', 'Emilia-Romania', 'Włochy', 44.4949, 11.3426, 'Europe/Rome', ['Bologna']],
  ['Florencja', 'Toskania', 'Włochy', 43.7696, 11.2558, 'Europe/Rome', ['Florence', 'Firenze']],
  ['Wenecja', 'Wenecja Euganejska', 'Włochy', 45.4408, 12.3155, 'Europe/Rome', ['Venice', 'Venezia']],
  ['Barcelona', 'Katalonia', 'Hiszpania', 41.3874, 2.1686, 'Europe/Madrid'],
  ['Madryt', 'Madryt', 'Hiszpania', 40.4168, -3.7038, 'Europe/Madrid', ['Madrid', 'Мадрид']],
  ['Walencja', 'Walencja', 'Hiszpania', 39.4699, -0.3763, 'Europe/Madrid', ['Valencia']],
  ['Malaga', 'Andaluzja', 'Hiszpania', 36.7213, -4.4214, 'Europe/Madrid', ['Málaga']],
  ['Sewilla', 'Andaluzja', 'Hiszpania', 37.3891, -5.9845, 'Europe/Madrid', ['Seville', 'Sevilla']],
  ['Lizbona', 'Lizbona', 'Portugalia', 38.7223, -9.1393, 'Europe/Lisbon', ['Lisbon', 'Lisboa']],
  ['Porto', 'Porto', 'Portugalia', 41.1579, -8.6291, 'Europe/Lisbon'],
  ['Sztokholm', 'Sztokholm', 'Szwecja', 59.3293, 18.0686, 'Europe/Stockholm', ['Stockholm']],
  ['Göteborg', 'Västra Götaland', 'Szwecja', 57.7089, 11.9746, 'Europe/Stockholm', ['Gothenburg', 'Goteborg']],
  ['Malmö', 'Skania', 'Szwecja', 55.605, 13.0038, 'Europe/Stockholm', ['Malmo']],
  ['Oslo', 'Oslo', 'Norwegia', 59.9139, 10.7522, 'Europe/Oslo'],
  ['Bergen', 'Vestland', 'Norwegia', 60.3913, 5.3221, 'Europe/Oslo'],
  ['Stavanger', 'Rogaland', 'Norwegia', 58.97, 5.7331, 'Europe/Oslo'],
  ['Trondheim', 'Trøndelag', 'Norwegia', 63.4305, 10.3951, 'Europe/Oslo'],
  ['Kopenhaga', 'Region Stołeczny', 'Dania', 55.6761, 12.5683, 'Europe/Copenhagen', ['Copenhagen', 'København']],
  ['Aarhus', 'Jutlandia Środkowa', 'Dania', 56.1629, 10.2039, 'Europe/Copenhagen'],
  ['Helsinki', 'Uusimaa', 'Finlandia', 60.1699, 24.9384, 'Europe/Helsinki'],
  ['Reykjavík', 'Region Stołeczny', 'Islandia', 64.1466, -21.9426, 'Atlantic/Reykjavik', ['Reykjavik']],
  ['Wilno', 'Okręg wileński', 'Litwa', 54.6872, 25.2797, 'Europe/Vilnius', ['Vilnius', 'Вильнюс']],
  ['Kowno', 'Okręg kowieński', 'Litwa', 54.8985, 23.9036, 'Europe/Vilnius', ['Kaunas']],
  ['Ryga', 'Ryga', 'Łotwa', 56.9496, 24.1052, 'Europe/Riga', ['Riga', 'Рига']],
  ['Tallinn', 'Harjumaa', 'Estonia', 59.437, 24.7536, 'Europe/Tallinn', ['Tallin']],
  ['Lwów', 'obwód lwowski', 'Ukraina', 49.8397, 24.0297, 'Europe/Kyiv', ['Lviv', 'Львов', 'Львів']],
  ['Kijów', 'Kijów', 'Ukraina', 50.4501, 30.5234, 'Europe/Kyiv', ['Kyiv', 'Kiev', 'Киев', 'Київ']],
  ['Odessa', 'obwód odeski', 'Ukraina', 46.4825, 30.7233, 'Europe/Kyiv', ['Odesa', 'Одесса', 'Одеса']],
  ['Charków', 'obwód charkowski', 'Ukraina', 49.9935, 36.2304, 'Europe/Kyiv', ['Kharkiv', 'Харьков', 'Харків']],
  ['Dnipro', 'obwód dniepropetrowski', 'Ukraina', 48.4647, 35.0462, 'Europe/Kyiv', ['Dniepr', 'Днепр', 'Дніпро']],
  ['Mińsk', 'Mińsk', 'Białoruś', 53.9006, 27.559, 'Europe/Minsk', ['Minsk', 'Минск', 'Мінск']],
  ['Grodno', 'obwód grodzieński', 'Białoruś', 53.6694, 23.8131, 'Europe/Minsk', ['Hrodna', 'Гродно']],
  ['Brześć', 'obwód brzeski', 'Białoruś', 52.0976, 23.7341, 'Europe/Minsk', ['Brest', 'Брест']],
  ['Budapeszt', 'Budapeszt', 'Węgry', 47.4979, 19.0402, 'Europe/Budapest', ['Budapest']],
  ['Bukareszt', 'Bukareszt', 'Rumunia', 44.4268, 26.1025, 'Europe/Bucharest', ['Bucharest', 'București']],
  ['Sofia', 'Sofia', 'Bułgaria', 42.6977, 23.3219, 'Europe/Sofia'],
  ['Ateny', 'Attyka', 'Grecja', 37.9838, 23.7275, 'Europe/Athens', ['Athens']],
  ['Zagrzeb', 'Zagrzeb', 'Chorwacja', 45.815, 15.9819, 'Europe/Zagreb', ['Zagreb']],
  ['Lublana', 'Słowenia Środkowa', 'Słowenia', 46.0569, 14.5058, 'Europe/Ljubljana', ['Ljubljana']],
  ['Belgrad', 'Belgrad', 'Serbia', 44.7866, 20.4489, 'Europe/Belgrade', ['Belgrade']],
  ['Stambuł', 'Stambuł', 'Turcja', 41.0082, 28.9784, 'Europe/Istanbul', ['Istanbul']],
  ['Moskwa', 'Moskwa', 'Rosja', 55.7558, 37.6173, 'Europe/Moscow', ['Moscow', 'Москва']],
  ['Sankt Petersburg', 'Sankt Petersburg', 'Rosja', 59.9343, 30.3351, 'Europe/Moscow', ['Saint Petersburg', 'Санкт-Петербург']],
  ['Nowy Jork', 'Nowy Jork', 'USA', 40.7128, -74.006, 'America/New_York', ['New York', 'NYC', 'Нью-Йорк']],
  ['Chicago', 'Illinois', 'USA', 41.8781, -87.6298, 'America/Chicago', ['Чикаго']],
  ['Los Angeles', 'Kalifornia', 'USA', 34.0522, -118.2437, 'America/Los_Angeles'],
  ['San Francisco', 'Kalifornia', 'USA', 37.7749, -122.4194, 'America/Los_Angeles'],
  ['Miami', 'Floryda', 'USA', 25.7617, -80.1918, 'America/New_York'],
  ['Boston', 'Massachusetts', 'USA', 42.3601, -71.0589, 'America/New_York'],
  ['Toronto', 'Ontario', 'Kanada', 43.6532, -79.3832, 'America/Toronto'],
  ['Vancouver', 'Kolumbia Brytyjska', 'Kanada', 49.2827, -123.1207, 'America/Vancouver'],
  ['Montreal', 'Quebec', 'Kanada', 45.5017, -73.5673, 'America/Toronto'],
  ['Sydney', 'Nowa Południowa Walia', 'Australia', -33.8688, 151.2093, 'Australia/Sydney'],
  ['Melbourne', 'Wiktoria', 'Australia', -37.8136, 144.9631, 'Australia/Melbourne'],
  ['Dubaj', 'Dubaj', 'ZEA', 25.2048, 55.2708, 'Asia/Dubai', ['Dubai']],
  ['Tokio', 'Tokio', 'Japonia', 35.6762, 139.6503, 'Asia/Tokyo', ['Tokyo']],
  ['Singapur', 'Singapur', 'Singapur', 1.3521, 103.8198, 'Asia/Singapore', ['Singapore']],
  ['Tel Awiw', 'Tel Awiw', 'Izrael', 32.0853, 34.7818, 'Asia/Jerusalem', ['Tel Aviv']],
  ['Ałmaty', 'Ałmaty', 'Kazachstan', 43.222, 76.8512, 'Asia/Almaty', ['Almaty', 'Алматы']],
  ['Tbilisi', 'Tbilisi', 'Gruzja', 41.7151, 44.8271, 'Asia/Tbilisi', ['Тбилиси']],
];

export const POLISH_EU_CITIES: readonly PlaceOption[] = RAW_PLACES.map(
  ([name, admin1, country, lat, lon, tz, altNames]) => ({
    name,
    admin1,
    country,
    lat,
    lon,
    tz,
    ...(altNames ? { altNames } : {}),
  }),
);

export const NEAREST_MAJOR_POLISH_CITIES: readonly PlaceOption[] = POLISH_EU_CITIES.slice(0, 12);

export function normalizePlaceQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/ß/g, 'ss');
}

export function formatPlaceLabel(place: Pick<PlaceOption, 'name' | 'admin1' | 'country'>): string {
  if (place.admin1 && normalizePlaceQuery(place.admin1) !== normalizePlaceQuery(place.name)) {
    return `${place.name}, ${place.admin1}, ${place.country}`;
  }
  return `${place.name}, ${place.country}`;
}

export function searchCities(query: string, limit = 8): PlaceOption[] {
  const safeLimit = Math.max(1, Math.min(20, Math.floor(limit) || 8));
  const normQ = normalizePlaceQuery(query);
  if (!normQ) return POLISH_EU_CITIES.slice(0, safeLimit);

  const exactMatches: PlaceOption[] = [];
  const startsWith: PlaceOption[] = [];
  const includes: PlaceOption[] = [];

  for (const city of POLISH_EU_CITIES) {
    const candidates = [city.name, ...(city.altNames ?? [])].map(normalizePlaceQuery);
    const labelNorm = normalizePlaceQuery(formatPlaceLabel(city));

    if (candidates.some((c) => c === normQ) || labelNorm === normQ) {
      exactMatches.push(city);
    } else if (candidates.some((c) => c.startsWith(normQ))) {
      startsWith.push(city);
    } else if (
      candidates.some((c) => c.includes(normQ)) ||
      normalizePlaceQuery(city.admin1).includes(normQ) ||
      normalizePlaceQuery(city.country).includes(normQ) ||
      labelNorm.includes(normQ)
    ) {
      includes.push(city);
    }
  }

  return [...exactMatches, ...startsWith, ...includes].slice(0, safeLimit);
}

export function findExactCity(query: string): PlaceOption | null {
  const normQ = normalizePlaceQuery(query);
  if (!normQ) return null;

  for (const city of POLISH_EU_CITIES) {
    const candidates = [
      city.name,
      `${city.name}, ${city.country}`,
      formatPlaceLabel(city),
      ...(city.altNames ?? []),
    ].map(normalizePlaceQuery);
    if (candidates.includes(normQ)) {
      return city;
    }
  }
  return null;
}

export function resolveCityCoordinates(
  cityName: string,
  structured?: Partial<PlaceOption> | null,
): PlaceOption {
  if (
    structured &&
    typeof structured.name === 'string' &&
    typeof structured.lat === 'number' &&
    Number.isFinite(structured.lat) &&
    typeof structured.lon === 'number' &&
    Number.isFinite(structured.lon) &&
    typeof structured.tz === 'string' &&
    structured.tz.length > 0
  ) {
    return {
      name: structured.name,
      admin1: structured.admin1 ?? '',
      country: structured.country ?? 'Polska',
      lat: structured.lat,
      lon: structured.lon,
      tz: structured.tz,
    };
  }

  const exact = findExactCity(cityName);
  if (exact) return exact;

  const matches = searchCities(cityName, 1);
  if (matches.length > 0 && cityName.trim().length > 0) {
    return matches[0];
  }

  return POLISH_EU_CITIES[0];
}
