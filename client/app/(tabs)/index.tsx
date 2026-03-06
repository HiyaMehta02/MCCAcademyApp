import { Text, View, Image } from "react-native";
import GreenBox from '../../components/Login-Box';

export default function HomeScreen() {
  return (
<View style={{ padding: 20, backgroundColor: "#232323", flex: 1 }}>
  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <View
  style={{
    width: 10,
    height: 290,
    backgroundColor: "#BD1F14",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 30,
    marginTop: 34,
  }}
>
</View>
    <View>
      <Text style={{ paddingTop: 40, paddingLeft: 10, fontSize: 75, lineHeight: 65, fontFamily: "Montserrat", color: "white" }}>
        <Text style={{ fontWeight: "bold" }}>M</Text>USCAT
      </Text>
      <Text style={{ paddingLeft: 10, fontSize: 75, lineHeight: 75, fontFamily: "Montserrat", color: "white" }}>
        <Text style={{ fontWeight: "bold" }}>C</Text>RICKET
      </Text>
      <Text style={{ paddingLeft: 10, fontSize: 75, lineHeight: 75, fontFamily: "Montserrat", color: "white" }}>
        <Text style={{ fontWeight: "bold" }}>C</Text>OACHING
      </Text>
      <Text style={{ paddingLeft: 10, fontSize: 75, lineHeight: 75, fontFamily: "Montserrat", color: "white" }}>
        <Text style={{ fontWeight: "bold" }}>C</Text>ENTER
      </Text>
    </View>

    <Image
      source={require("../../images/cricketman.png")}
      style={{
        width: 857,
        height: 857,
        paddingRight: 60,
        resizeMode: "contain",
        marginRight: 20,
        paddingBottom: 30,
      }}
    />
    <GreenBox style={{ position: "absolute", bottom: "14%", left: "2.3%" }} />
  </View>
    </View>
  );
}