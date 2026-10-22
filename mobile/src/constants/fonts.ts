import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader/600SemiBold';
import { Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader/500Medium_Italic';

// Each face is imported from its own per-weight module. Importing from the
// package root bundles EVERY weight and italic of the family into the app
// (44 font files, 7.4 MB) although only these 8 are used.
//
// Passed straight to useFonts() in app/_layout.tsx — keys must match
// constants/theme.ts's FontFamily values exactly.
export const FontsToLoad = {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  Newsreader_500Medium_Italic,
};
