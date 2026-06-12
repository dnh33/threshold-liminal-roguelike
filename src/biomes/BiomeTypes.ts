export const BiomeType = {
  CUBICLE_SEA: 'cubicle_sea',
  SUBMERGED_GARAGE: 'submerged_garage',
  SERVER_CATHEDRAL: 'server_cathedral',
  ATRIUM_MALL: 'atrium_mall',
  STAIRWELL_INFINITE: 'stairwell_infinite',
  POOL_COMPLEX: 'pool_complex',
} as const;

export type BiomeType = (typeof BiomeType)[keyof typeof BiomeType];

export const ThreatType = {
  PATROL: 'patrol',
  AMBUSHER: 'ambusher',
  SOUND_HUNTER: 'sound_hunter',
  STALKER: 'stalker',
  MIMIC: 'mimic',
  SENTRY: 'sentry',
} as const;

export type ThreatType = (typeof ThreatType)[keyof typeof ThreatType];

export interface BiomeDefinition {
  id: BiomeType;
  name: string;
  description: string;
  difficulty: number;
  colorPalette: { primary: number; secondary: number; accent: number; fog: number };
  ambientLight: { color: number; intensity: number };
  fogSettings: { near: number; far: number };
  roomTemplates: string[];
  threatPool: ThreatType[];
  landmarkCount: { min: number; max: number };
  anomalyProbability: number;
  soundAmbience: string;
  musicTheme: string;
}

export const BIOME_DEFINITIONS: Record<BiomeType, BiomeDefinition> = {
  [BiomeType.CUBICLE_SEA]: {
    id: BiomeType.CUBICLE_SEA,
    name: 'Cubicle Sea',
    description: 'Endless rows of identical workstations under fluorescent hum',
    difficulty: 1,
    colorPalette: { primary: 0x6b7b8d, secondary: 0x4a5a6a, accent: 0x8fbc9a, fog: 0x3a4a5a },
    ambientLight: { color: 0x8f9faf, intensity: 0.4 },
    fogSettings: { near: 15, far: 50 },
    roomTemplates: ['cubicle_open', 'cubicle_maze', 'office_hall', 'break_room', 'conference_room'],
    threatPool: [ThreatType.PATROL, ThreatType.SOUND_HUNTER],
    landmarkCount: { min: 1, max: 3 },
    anomalyProbability: 0.15,
    soundAmbience: 'ambient_office_hum',
    musicTheme: 'theme_office_liminal',
  },
  [BiomeType.SUBMERGED_GARAGE]: {
    id: BiomeType.SUBMERGED_GARAGE,
    name: 'Submerged Garage',
    description: 'Flooded parking levels where water laps against concrete pillars',
    difficulty: 2,
    colorPalette: { primary: 0x2a4a5a, secondary: 0x1a3a4a, accent: 0x6a9a7a, fog: 0x0a2a3a },
    ambientLight: { color: 0x3a6a7a, intensity: 0.25 },
    fogSettings: { near: 12, far: 45 },
    roomTemplates: ['garage_ramp', 'garage_level', 'parking_bay', 'stairwell_entrance', 'utility_room'],
    threatPool: [ThreatType.PATROL, ThreatType.AMBUSHER, ThreatType.STALKER],
    landmarkCount: { min: 1, max: 2 },
    anomalyProbability: 0.2,
    soundAmbience: 'ambient_water_drip',
    musicTheme: 'theme_garage_submerged',
  },
  [BiomeType.SERVER_CATHEDRAL]: {
    id: BiomeType.SERVER_CATHEDRAL,
    name: 'Server Cathedral',
    description: 'Towering server racks like pillars in a digital nave, amber lights blinking',
    difficulty: 3,
    colorPalette: { primary: 0x4a3a5a, secondary: 0x2a1a3a, accent: 0xda9a3a, fog: 0x1a0a2a },
    ambientLight: { color: 0x8a6a3a, intensity: 0.15 },
    fogSettings: { near: 10, far: 60 },
    roomTemplates: ['server_hall', 'cable_trench', 'cooling_aisle', 'control_room', 'generator_room'],
    threatPool: [ThreatType.SENTRY, ThreatType.PATROL, ThreatType.MIMIC],
    landmarkCount: { min: 2, max: 4 },
    anomalyProbability: 0.25,
    soundAmbience: 'ambient_server_hum',
    musicTheme: 'theme_server_cathedral',
  },
  [BiomeType.ATRIUM_MALL]: {
    id: BiomeType.ATRIUM_MALL,
    name: 'Atrium Mall',
    description: 'Deserted shopping galleries with frozen escalators and empty storefronts',
    difficulty: 2,
    colorPalette: { primary: 0x8a7a6a, secondary: 0x6a5a4a, accent: 0xcaaa7a, fog: 0x5a4a3a },
    ambientLight: { color: 0xcaaa7a, intensity: 0.5 },
    fogSettings: { near: 20, far: 70 },
    roomTemplates: ['mall_corridor', 'atrium_center', 'store_front', 'food_court', 'escalator_landing'],
    threatPool: [ThreatType.AMBUSHER, ThreatType.SOUND_HUNTER, ThreatType.STALKER],
    landmarkCount: { min: 2, max: 3 },
    anomalyProbability: 0.18,
    soundAmbience: 'ambient_mall_echo',
    musicTheme: 'theme_mall_atrium',
  },
  [BiomeType.STAIRWELL_INFINITE]: {
    id: BiomeType.STAIRWELL_INFINITE,
    name: 'Stairwell Infinite',
    description: 'A spiral descent that defies geometry, each landing a threshold',
    difficulty: 4,
    colorPalette: { primary: 0x3a2a2a, secondary: 0x2a1a1a, accent: 0xaa4a3a, fog: 0x1a0a0a },
    ambientLight: { color: 0x5a3a2a, intensity: 0.1 },
    fogSettings: { near: 8, far: 35 },
    roomTemplates: ['stairwell_landing', 'stairwell_hall', 'maintenance_door', 'elevator_lobby', 'transition_chamber'],
    threatPool: [ThreatType.STALKER, ThreatType.MIMIC, ThreatType.SENTRY, ThreatType.AMBUSHER],
    landmarkCount: { min: 1, max: 2 },
    anomalyProbability: 0.35,
    soundAmbience: 'ambient_stairwell_drone',
    musicTheme: 'theme_stairwell_infinite',
  },
  [BiomeType.POOL_COMPLEX]: {
    id: BiomeType.POOL_COMPLEX,
    name: 'Pool Complex',
    description: 'Tiled corridors and empty pools reflecting distant light from nowhere',
    difficulty: 3,
    colorPalette: { primary: 0x5a8a9a, secondary: 0x3a6a7a, accent: 0x9acaca, fog: 0x2a4a5a },
    ambientLight: { color: 0x7aaa9a, intensity: 0.35 },
    fogSettings: { near: 15, far: 55 },
    roomTemplates: ['pool_hall', 'locker_room', 'pool_chamber', 'sauna_room', 'filter_room'],
    threatPool: [ThreatType.PATROL, ThreatType.SOUND_HUNTER, ThreatType.MIMIC],
    landmarkCount: { min: 1, max: 3 },
    anomalyProbability: 0.22,
    soundAmbience: 'ambient_pool_echo',
    musicTheme: 'theme_pool_complex',
  },
};
