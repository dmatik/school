import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
} from '@expo-google-fonts/heebo';

export const HEEBO_FONTS = {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
};

export function heeboFont(weight: '400' | '500' | '600' | '700' | '800' = '400') {
  switch (weight) {
    case '500':
      return { fontFamily: 'Heebo_500Medium' } as const;
    case '600':
      return { fontFamily: 'Heebo_600SemiBold' } as const;
    case '700':
      return { fontFamily: 'Heebo_700Bold' } as const;
    case '800':
      return { fontFamily: 'Heebo_800ExtraBold' } as const;
    default:
      return { fontFamily: 'Heebo_400Regular' } as const;
  }
}
