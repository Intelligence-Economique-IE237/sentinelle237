const RAW_COORDINATES: Record<string, [number, number]> = {
  // Afrique centrale / zone prioritaire
  cameroun: [7.3697, 12.3547],
  cameroon: [7.3697, 12.3547],
  gabon: [-0.8037, 11.6094],
  "congo brazzaville": [-0.228, 15.8277],
  congo: [-0.228, 15.8277],
  "republique democratique du congo": [-4.0383, 21.7587],
  rdc: [-4.0383, 21.7587],
  tchad: [15.4542, 18.7322],
  "guinee equatoriale": [1.6508, 10.2679],
  "republique centrafricaine": [6.6111, 20.9394],
  centrafrique: [6.6111, 20.9394],

  // Afrique de l'Ouest
  senegal: [14.4974, -14.4524],
  "cote d'ivoire": [7.54, -5.5471],
  "cote divoire": [7.54, -5.5471],
  ivoire: [7.54, -5.5471],
  mali: [17.5707, -3.9962],
  "burkina faso": [12.2383, -1.5616],
  niger: [17.6078, 8.0817],
  nigeria: [9.082, 8.6753],
  ghana: [7.9465, -1.0232],
  togo: [8.6195, 0.8248],
  benin: [9.3077, 2.3158],
  guinee: [9.9456, -9.6966],
  "sierra leone": [8.4606, -11.7799],
  liberia: [6.4281, -9.4295],
  "guinee-bissau": [11.8037, -15.1804],
  gambie: [13.4432, -15.3101],
  mauritanie: [21.0079, -10.9408],
  "cap-vert": [16.5388, -23.0418],

  // Afrique du Nord
  maroc: [31.7917, -7.0926],
  algerie: [28.0339, 1.6596],
  tunisie: [33.8869, 9.5375],
  libye: [26.3351, 17.2283],
  egypte: [26.8206, 30.8025],
  soudan: [12.8628, 30.2176],

  // Afrique de l'Est / Australe
  kenya: [-0.0236, 37.9062],
  ethiopie: [9.145, 40.4897],
  tanzanie: [-6.369, 34.8888],
  ouganda: [1.3733, 32.2903],
  rwanda: [-1.9403, 29.8739],
  burundi: [-3.3731, 29.9189],
  somalie: [5.1521, 46.1996],
  djibouti: [11.8251, 42.5903],
  "afrique du sud": [-30.5595, 22.9375],
  namibie: [-22.9576, 18.4904],
  botswana: [-22.3285, 24.6849],
  zimbabwe: [-19.0154, 29.1549],
  zambie: [-13.1339, 27.8493],
  mozambique: [-18.6657, 35.5296],
  madagascar: [-18.7669, 46.8691],
  angola: [-11.2027, 17.8739],
  malawi: [-13.2543, 34.3015],

  // Europe
  france: [46.2276, 2.2137],
  belgique: [50.5039, 4.4699],
  suisse: [46.8182, 8.2275],
  allemagne: [51.1657, 10.4515],
  "royaume-uni": [55.3781, -3.436],
  "royaume uni": [55.3781, -3.436],
  angleterre: [55.3781, -3.436],
  espagne: [40.4637, -3.7492],
  italie: [41.8719, 12.5674],
  portugal: [39.3999, -8.2245],
  "pays-bas": [52.1326, 5.2913],
  suede: [60.1282, 18.6435],
  norvege: [60.472, 8.4689],

  // Amériques
  "etats-unis": [37.0902, -95.7129],
  "etats unis": [37.0902, -95.7129],
  usa: [37.0902, -95.7129],
  canada: [56.1304, -106.3468],
  bresil: [-14.235, -51.9253],
  mexique: [23.6345, -102.5528],
  argentine: [-38.4161, -63.6167],

  // Asie / Moyen-Orient
  chine: [35.8617, 104.1954],
  inde: [20.5937, 78.9629],
  japon: [36.2048, 138.2529],
  "coree du sud": [35.9078, 127.7669],
  "emirats arabes unis": [23.4241, 53.8478],
  "arabie saoudite": [23.8859, 45.0792],
  turquie: [38.9637, 35.2433],
  liban: [33.8547, 35.8623],
  qatar: [25.3548, 51.1839],

  // Océanie
  australie: [-25.2744, 133.7751],
}

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

export function getCountryCoordinates(pays: string | null | undefined): [number, number] | null {
  if (!pays) return null
  const key = normalize(pays)
  return RAW_COORDINATES[key] ?? null
}