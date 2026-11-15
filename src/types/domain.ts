export type FacilityType =
  | 'psychiatricka_nemocnice'
  | 'psychiatricka_lecebna'
  | 'detska_psychiatricka_nemocnice'
  | 'detska_psychiatricka_lecebna'
  | 'krizove_centrum'
  | 'denni_stacionar'
  | 'detska_psychiatrie'
  | 'cdz_ambulance';

export type CountryCode = 'CZ' | 'SK';

export type DeficiencyCategory =
  | 'staff_shortage'
  | 'building_condition'
  | 'long_wait_times'
  | 'lack_of_privacy'
  | 'overmedication'
  | 'communication'
  | 'hygiene'
  | 'accessibility';

export interface Story {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  facilityName: string;
  facilityType: FacilityType;
  country: CountryCode;
  city: string;
  placeId?: string;
  deficiencyCategories: DeficiencyCategory[];
  deficienciesSummary: string;
  isAnonymous: boolean;
  isOfficialEditorial: boolean;
  isVerified?: boolean;
  authorName?: string;
  authorAge?: string;
  initialCareRating: number;
  initialStaffRating: number;
  initialBuildingRating: number;
  initialAccessibilityRating: number;
  coverImage?: string;
  isEncrypted: boolean;
  authorUid: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoryComment {
  id: string;
  storyId: string;
  body: string;
  authorNickname?: string;
  authorAge?: string;
  isAnonymous: boolean;
  isEncrypted: boolean;
  authorUid: string;
  createdAt: Date | null;
}

export interface StoryRating {
  id: string;
  storyId: string;
  raterUid: string;
  careRating: number;
  staffRating: number;
  buildingRating: number;
  accessibilityRating: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface FacilityReport {
  id: string;
  placeId: string;
  facilityName: string;
  facilityAddress?: string;
  facilityType: FacilityType;
  country: CountryCode;
  lat: number;
  lng: number;
  careRating: number;
  staffRating: number;
  buildingRating: number;
  accessibilityRating: number;
  deficiencies: DeficiencyCategory[];
  note: string;
  authorNickname?: string;
  authorAge?: string;
  isAnonymous: boolean;
  isEncrypted: boolean;
  authorUid: string;
  createdAt: Date | null;
}

export interface MapPlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  googleRating?: number;
  userRatingCount?: number;
  phone?: string;
  website?: string;
  openNowText?: string;
  country: CountryCode;
}

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  psychiatricka_nemocnice: 'Psychiatrická nemocnice',
  psychiatricka_lecebna: 'Psychiatrická léčebna',
  detska_psychiatricka_nemocnice: 'Dětská psychiatrická nemocnice',
  detska_psychiatricka_lecebna: 'Dětská psychiatrická léčebna',
  krizove_centrum: 'Krizové centrum',
  denni_stacionar: 'Denní stacionář',
  detska_psychiatrie: 'Dětská psychiatrie (ambulance)',
  cdz_ambulance: 'CDZ / Ambulance',
};

export const DEFICIENCY_LABELS: Record<DeficiencyCategory, string> = {
  staff_shortage: 'Nedostatek personálu',
  building_condition: 'Stav budov a pokojů',
  long_wait_times: 'Dlouhé čekací lhůty',
  lack_of_privacy: 'Chybějící soukromí',
  overmedication: 'Přemedikace místo terapie',
  communication: 'Komunikace s pacientem',
  hygiene: 'Hygienické zázemí',
  accessibility: 'Regionální nedostupnost',
};
