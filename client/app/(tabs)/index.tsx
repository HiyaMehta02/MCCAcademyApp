import { Text, View, FlatList } from "react-native";
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
  <Text style={{ paddingTop: 30, paddingLeft: 40, fontSize: 70, lineHeight: 65, fontFamily: "Montserrat", color: "white" }}>
    <Text style={{ fontWeight: "bold" }}>M</Text>USCAT
  </Text>
  <Text style={{ paddingLeft: 40, fontSize: 70, lineHeight: 65, fontFamily: "Montserrat", color: "white" }}>
    <Text style={{ fontWeight: "bold" }}>C</Text>RICKET
  </Text>
  <Text style={{ paddingLeft: 40, fontSize: 70, lineHeight: 65, fontFamily: "Montserrat", color: "white" }}>
    <Text style={{ fontWeight: "bold" }}>C</Text>OACHING
  </Text>
  <Text style={{ paddingLeft: 40, fontSize: 70, lineHeight: 65, fontFamily: "Montserrat", color: "white" }}>
    <Text style={{ fontWeight: "bold" }}>C</Text>ENTER
  </Text>
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
