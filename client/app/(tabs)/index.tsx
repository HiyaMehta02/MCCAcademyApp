import { Text, View, Image, StyleSheet } from "react-native";
import GreenBox from "../../components/Login-Box";

export default function HomeScreen() {
  return (
    <View style={styles.page}>
      <View style={styles.heroRow}>
        <View style={styles.heroTitleRow}>
          <View style={styles.redBar} />

          <View style={styles.heroTextCol}>
            <Text style={[styles.heroLine, styles.heroLineFirst]}>
              <Text style={styles.heroBold}>M</Text>USCAT
            </Text>
            <Text style={styles.heroLine}>
              <Text style={styles.heroBold}>C</Text>RICKET
            </Text>
            <Text style={styles.heroLine}>
              <Text style={styles.heroBold}>C</Text>OACHING
            </Text>
            <Text style={styles.heroLine}>
              <Text style={styles.heroBold}>C</Text>ENTER
            </Text>
          </View>
        </View>

        <Image source={require("../../images/cricketman.png")} style={styles.heroImage} />

        <GreenBox style={styles.greenBoxOverlay} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    padding: 20,
    backgroundColor: "#232323",
  },
  heroRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 34,
    marginLeft: 30,
  },
  heroTextCol: {
    flexShrink: 1,
  },
  redBar: {
    width: 10,
    height: 290,
    backgroundColor: "#BD1F14",
    borderRadius: 10,
  },
  heroLine: {
    paddingLeft: 10,
    fontSize: 75,
    lineHeight: 75,
    fontFamily: "Montserrat",
    color: "white",
  },
  heroLineFirst: {
    paddingTop: 13,
    lineHeight: 65,
  },
  heroBold: {
    fontWeight: "bold",
  },
  heroImage: {
    width: 857,
    height: 857,
    resizeMode: "contain",
    marginRight: 20,
    paddingBottom: 30,
  },
  greenBoxOverlay: {
    position: "absolute",
    bottom: "12%",
    left: "2.3%",
    width: "39%",
    maxWidth: 460,
    maxHeight: "72%",
    paddingVertical: 16,
  },
});
