import { StyleSheet, Text, View } from "react-native";

// import EditScreenInfo from '../../components/EditScreenInfo';

export default function TabTwoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Экран Прогресса</Text>
      <View style={styles.separator} />
      {/* <EditScreenInfo path="app/(tabs)/two.tsx" /> */}
      <Text style={styles.comingSoon}>
        Скоро здесь будет крутая статистика!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
    backgroundColor: "#333",
  },
  comingSoon: {
    fontSize: 16,
    color: "#A0A0A0",
  },
});
