import { Text, View, FlatList, Image } from "react-native";
import { useState, useEffect } from "react";

type Branch = {
  BranchID: number;
  Name: string;
};

export default function HomeScreen() {
  const [branchs, setBranchs] = useState<Branch[]>([]);

  useEffect(() => {
    async function fetchBranchs() {
      try {
        const apiIp = process.env.API_IP;
        const res = await fetch(`http://${apiIp}:3000/branchs`);
        const data: Branch[] = await res.json();
        console.log(data);
        setBranchs(data);
      } catch (err) {
        console.error("Error fetching branchs:", err);
      }
    }
    fetchBranchs();
  }, []);

  return (
<View style={{ padding: 20, backgroundColor: "#232323", flex: 1 }}>
  {/* Row container: puts text and image side by side */}
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
    marginTop: 45,
  }}
>
</View>
    {/* Text column */}
    <View>
      <Text style={{ paddingTop: 60, paddingLeft: 10, fontSize: 75, lineHeight: 65, fontFamily: "Montserrat", color: "white" }}>
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

    {/* Image on the right */}
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
  </View>
      {/* <FlatList 
        data={branchs}
        keyExtractor={(item) => item.BranchID.toString()}
        renderItem={({ item }) => (
          <Text style={{ fontSize: 18, marginBottom: 10 }}>
            {item.Name}
          </Text>
        )}
      /> */}
    </View>
  );
}
