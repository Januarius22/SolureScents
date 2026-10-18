export interface NigerianStateInfo {
  readonly code: string;
  readonly name: string;
  readonly zone: "lagos" | "abuja" | "south_west" | "south_east" | "south_south" | "north_central" | "north_west" | "north_east";
  readonly estimatedDays: string;
}

export const NIGERIAN_STATES: readonly NigerianStateInfo[] = [
  { code: "AB", name: "Abia", zone: "south_east", estimatedDays: "3 - 5 business days" },
  { code: "AD", name: "Adamawa", zone: "north_east", estimatedDays: "4 - 7 business days" },
  { code: "AK", name: "Akwa Ibom", zone: "south_south", estimatedDays: "3 - 5 business days" },
  { code: "AN", name: "Anambra", zone: "south_east", estimatedDays: "3 - 5 business days" },
  { code: "BA", name: "Bauchi", zone: "north_east", estimatedDays: "4 - 7 business days" },
  { code: "BY", name: "Bayelsa", zone: "south_south", estimatedDays: "3 - 6 business days" },
  { code: "BE", name: "Benue", zone: "north_central", estimatedDays: "3 - 6 business days" },
  { code: "BO", name: "Borno", zone: "north_east", estimatedDays: "5 - 8 business days" },
  { code: "CR", name: "Cross River", zone: "south_south", estimatedDays: "3 - 6 business days" },
  { code: "DE", name: "Delta", zone: "south_south", estimatedDays: "3 - 5 business days" },
  { code: "EB", name: "Ebonyi", zone: "south_east", estimatedDays: "3 - 5 business days" },
  { code: "ED", name: "Edo", zone: "south_south", estimatedDays: "3 - 5 business days" },
  { code: "EK", name: "Ekiti", zone: "south_west", estimatedDays: "2 - 4 business days" },
  { code: "EN", name: "Enugu", zone: "south_east", estimatedDays: "3 - 5 business days" },
  { code: "FC", name: "Federal Capital Territory (Abuja)", zone: "abuja", estimatedDays: "1 - 3 business days" },
  { code: "GO", name: "Gombe", zone: "north_east", estimatedDays: "4 - 7 business days" },
  { code: "IM", name: "Imo", zone: "south_east", estimatedDays: "3 - 5 business days" },
  { code: "JI", name: "Jigawa", zone: "north_west", estimatedDays: "4 - 7 business days" },
  { code: "KD", name: "Kaduna", zone: "north_west", estimatedDays: "3 - 5 business days" },
  { code: "KN", name: "Kano", zone: "north_west", estimatedDays: "3 - 5 business days" },
  { code: "KT", name: "Katsina", zone: "north_west", estimatedDays: "4 - 7 business days" },
  { code: "KE", name: "Kebbi", zone: "north_west", estimatedDays: "4 - 7 business days" },
  { code: "KO", name: "Kogi", zone: "north_central", estimatedDays: "3 - 5 business days" },
  { code: "KW", name: "Kwara", zone: "north_central", estimatedDays: "2 - 4 business days" },
  { code: "LA", name: "Lagos", zone: "lagos", estimatedDays: "1 - 2 business days" },
  { code: "NA", name: "Nasarawa", zone: "north_central", estimatedDays: "2 - 4 business days" },
  { code: "NI", name: "Niger", zone: "north_central", estimatedDays: "3 - 5 business days" },
  { code: "OG", name: "Ogun", zone: "south_west", estimatedDays: "2 - 3 business days" },
  { code: "ON", name: "Ondo", zone: "south_west", estimatedDays: "2 - 4 business days" },
  { code: "OS", name: "Osun", zone: "south_west", estimatedDays: "2 - 4 business days" },
  { code: "OY", name: "Oyo", zone: "south_west", estimatedDays: "2 - 3 business days" },
  { code: "PL", name: "Plateau", zone: "north_central", estimatedDays: "3 - 5 business days" },
  { code: "RI", name: "Rivers", zone: "south_south", estimatedDays: "3 - 5 business days" },
  { code: "SO", name: "Sokoto", zone: "north_west", estimatedDays: "4 - 7 business days" },
  { code: "TA", name: "Taraba", zone: "north_east", estimatedDays: "4 - 7 business days" },
  { code: "YO", name: "Yobe", zone: "north_east", estimatedDays: "5 - 8 business days" },
  { code: "ZA", name: "Zamfara", zone: "north_west", estimatedDays: "4 - 7 business days" },
] as const;

export const NIGERIAN_STATE_NAMES = NIGERIAN_STATES.map((s) => s.name) as [string, ...string[]];

export function findNigerianState(nameOrCode: string): NigerianStateInfo | undefined {
  const query = nameOrCode.trim().toLowerCase();
  return NIGERIAN_STATES.find(
    (s) => s.name.toLowerCase() === query || s.code.toLowerCase() === query || (s.name.toLowerCase().includes("abuja") && query.includes("abuja")),
  );
}
