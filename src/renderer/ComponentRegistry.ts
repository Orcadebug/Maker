// Maps type strings to React Native components.
// The server sends nodes like { type: "view", ... } and we map "view" to <View>.

import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Switch,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ComponentEntry = {
  component: React.ComponentType<any>;
  isTextContainer: boolean; // Whether children should be treated as text content
};

const registry: Record<string, ComponentEntry> = {
  view: { component: View, isTextContainer: false },
  text: { component: Text, isTextContainer: true },
  scrollView: { component: ScrollView, isTextContainer: false },
  safeArea: { component: SafeAreaView, isTextContainer: false },
  textInput: { component: TextInput, isTextContainer: false },
  button: { component: Pressable, isTextContainer: false },
  image: { component: Image, isTextContainer: false },
  switch: { component: Switch, isTextContainer: false },
  activityIndicator: { component: ActivityIndicator, isTextContainer: false },
  flatList: { component: FlatList, isTextContainer: false },
};

export function getComponent(type: string): ComponentEntry | undefined {
  return registry[type];
}

export function registerComponent(type: string, entry: ComponentEntry) {
  registry[type] = entry;
}

export default registry;
