// Directory of active Venezuela earthquake-relief initiatives (2026-06-24 doublet,
// M7.2 + M7.5, north coast / Yaracuy). LifeLink routes people to the authoritative
// platform for each need instead of duplicating their data into a stale silo.
//
// Source list curated by the user from the "Reporte de estatus · 25 jun 2026"
// (12 active initiatives). Links are external and owned by their respective orgs.
// We LINK, we do not copy personal data.

export interface ReliefResource {
  name: string;
  url: string;
}

export interface ReliefCategory {
  /** i18n key suffix under `relief.categories` */
  key: string;
  /** lucide-react icon name */
  icon: string;
  /** whether this need involves personal/sensitive data (we only link, never host) */
  sensitive: boolean;
  resources: ReliefResource[];
}

export const RELIEF_DIRECTORY: ReliefCategory[] = [
  {
    key: 'missingPersons',
    icon: 'UserSearch',
    sensitive: true,
    resources: [
      { name: 'Venezuela Reporta', url: 'https://venezuelareporta.org' },
      { name: 'Venezuela Te Busca', url: 'https://venezuelatebusca.com' },
      { name: 'Desaparecidos Terremoto Venezuela', url: 'https://desaparecidosterremotovenezuela.com' },
    ],
  },
  {
    key: 'structuralDamage',
    icon: 'Building2',
    sensitive: false,
    resources: [
      { name: 'Terremoto Venezuela', url: 'https://terremotovenezuela.com' },
      { name: 'Tilín App', url: 'https://tilinapp.com' },
      { name: 'Centinela', url: 'https://app.appcentinela.com/instalar' },
    ],
  },
  {
    key: 'rescue',
    icon: 'LifeBuoy',
    sensitive: false,
    resources: [
      { name: 'Rescate VE', url: 'https://rescate-ve.vercel.app' },
    ],
  },
  {
    key: 'habitability',
    icon: 'HardHat',
    sensitive: false,
    resources: [
      { name: 'Habitable', url: 'https://habitable.lovable.app' },
      { name: 'Grupo Ávila VE', url: 'https://www.instagram.com/grupoavila.ve' },
      { name: 'Centinela', url: 'https://app.appcentinela.com/instalar' },
    ],
  },
  {
    key: 'collectionCenters',
    icon: 'PackageOpen',
    sensitive: false,
    resources: [
      { name: 'Ayuda para Venezuela', url: 'https://ayudaparavenezuela.com' },
      { name: 'VeneConnect', url: 'https://www.veneconnect.com/apoyo-terremoto' },
      { name: 'Tu Gruero', url: 'https://tugruero.com' },
      { name: 'Zona Segura', url: 'https://zonasegura.up.railway.app' },
    ],
  },
  {
    key: 'suppliesNeeded',
    icon: 'ClipboardList',
    sensitive: false,
    resources: [
      { name: 'Ayuda para Venezuela', url: 'https://ayudaparavenezuela.com' },
    ],
  },
  {
    key: 'foodCenters',
    icon: 'Utensils',
    sensitive: false,
    resources: [
      { name: 'Refugios Venezuela', url: 'https://refugiosvenezuela.com' },
    ],
  },
  {
    key: 'shelters',
    icon: 'Home',
    sensitive: false,
    resources: [
      { name: 'Refugios Venezuela', url: 'https://refugiosvenezuela.com' },
      { name: 'Zona Segura', url: 'https://zonasegura.up.railway.app' },
    ],
  },
  {
    key: 'hospitalPatients',
    icon: 'HeartPulse',
    sensitive: true,
    resources: [
      { name: 'Pacientes Terremoto Vzla', url: 'https://pacientesterremotovzla.lovable.app' },
    ],
  },
  {
    key: 'pets',
    icon: 'PawPrint',
    sensitive: true,
    resources: [
      { name: 'HuellasCan — Terremoto', url: 'https://www.huellascan.com/terremoto' },
    ],
  },
  {
    key: 'logistics',
    icon: 'Truck',
    sensitive: false,
    resources: [
      { name: 'Rescate VE', url: 'https://rescate-ve.vercel.app' },
    ],
  },
  {
    key: 'medicalSupport',
    icon: 'Stethoscope',
    sensitive: false,
    resources: [
      { name: 'Nueve Once', url: 'https://www.nueveonce.com' },
      { name: 'VenEmergencia', url: 'https://venemergencia.com' },
    ],
  },
];
