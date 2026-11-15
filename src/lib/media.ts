import heroCorridorImg from '@/src/assets/images/hero_psychiatric_corridor_1794778617737.jpg';
import buildingsHallwayImg from '@/src/assets/images/story_editorial_buildings_1794778618748.jpg';
import careGardenImg from '@/src/assets/images/story_editorial_care_1794778618841.jpg';

export const EDITORIAL_MEDIA = {
  heroCorridor: heroCorridorImg,
  buildingsHallway: buildingsHallwayImg,
  careGarden: careGardenImg,
} as const;

export type EditorialMediaKey = keyof typeof EDITORIAL_MEDIA;

export function resolveStoryImage(keyOrPath?: string): string | null {
  if (!keyOrPath) return null;
  if (keyOrPath === 'heroCorridor') return EDITORIAL_MEDIA.heroCorridor;
  if (keyOrPath === 'buildingsHallway') return EDITORIAL_MEDIA.buildingsHallway;
  if (keyOrPath === 'careGarden') return EDITORIAL_MEDIA.careGarden;
  if (keyOrPath.startsWith('http') || keyOrPath.startsWith('/') || keyOrPath.startsWith('data:')) {
    return keyOrPath;
  }
  return EDITORIAL_MEDIA.heroCorridor;
}
