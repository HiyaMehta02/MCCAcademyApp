import React, {useEffect, useState} from 'react';
import { View, StyleSheet, Text, TextInput, Image, Pressable } from 'react-native';
import { router } from 'expo-router';

interface Branch {
  name: string;
}

export default function GreenBox({ style }) {
  const [phase, setPhase] = useState("login"); 
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  const handleLogin = () => {
    setPhase("branch");
  };

  const handleBranchConfirm = () => {
    setPhase("menu");
  };

  useEffect(() => {
    async function fetchBranches() {
      try {
        const apiIp = process.env.EXPO_PUBLIC_IP_ADDRESS; 
        const response = await fetch(`http://${apiIp}:8000/branches`);

        if (!response.ok) throw new Error("Failed to fetch branches");

        const data = await response.json();
        
        setBranches(data.branches);
        console.log("Fetched branches for GreenBox:", data.branches);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, []);

  return (
  <View style={[styles.box, style]}> 
    {phase === "login" && ( 
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", width: "100%" }}>
            <Text style={{ color: "white", fontSize: 37, marginBottom: 20 }}>Log In</Text>
            <Text style={{ color: "white", fontSize: 17, marginBottom: 20, width: "70%", textAlign: "center" }}>Please enter your coach ID to get access to the app!</Text>
            <TextInput
                style={{
                    width: "60%",      
                    height: 45,
                    fontSize: 16,
                    color: "#000",
                    backgroundColor: "#fff",
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    marginBottom: 20,
                    textAlign: "center", 
                }}
                placeholder="Enter Coach ID"
                placeholderTextColor="#808080"
                keyboardType="numeric"
                autoCapitalize="none"
            />
            <Pressable
            onPress={handleLogin}
            style={{
                backgroundColor: "#232323",
                width: "35%",
                height: 40,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
            }}
            >
            <Text style={{ color: "white", fontSize: 18 }}>Log In</Text>
            </Pressable>
            
            <Pressable
            // Reminder: change this onPress later to go to a registration screen!
            onPress={handleLogin}
            style={{
                backgroundColor: "#116C1B",
                width: "50%",
                height: 50,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
            }}
            >
            <Text style={{ color: "white", fontSize: 18 }}>Add Coach</Text>
            </Pressable> 
            <Image
                source={require("../images/Logo.png")}
                style={{
                width: 30,
                height: 40,
                resizeMode: "contain",
                marginBottom: 1,
                paddingRight: 60,
                paddingBottom: 30,
                }}
            />
        </View>
    )}
            
    {/* Branch phase */}
    {phase === "branch" && (
      <View style={{ marginTop: 30, alignItems: "center", width: '100%' }}>
        <Text style={{ color: "white", fontSize: 30,marginHorizontal: 100, textAlign: "center", marginTop: 12, marginBottom:6 }}>Select the branch you are in</Text>
        
        {loading ? (
           <Text style={{color: 'white', fontSize: 18, marginTop: 40}}>Loading branches...</Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, justifyContent: 'center' }}>
              {branches.map((branch, index) => (
                <Pressable
                  key={index}
                  onPress={() => setSelectedBranch(branch.name)}
                  style={{
                    borderWidth: 2,
                    borderColor: selectedBranch === branch.name ? '#ffffff' : '#2C2C2C',
                    padding: 20,
                    borderRadius: 8,
                    minWidth: 150,
                    width: '40%',
                    height: '80%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    marginLeft: 10,
                    elevation: 3,
                    backgroundColor: selectedBranch === branch.name ? '#ffffff' : '#2C2C2C',
                  }}
                >
                  <Text style={{ fontSize: 20, color: selectedBranch === branch.name ? '#2C2C2C' : '#ffffff', textAlign: 'center' }}>
                    {branch.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleBranchConfirm}
              style={{
                backgroundColor: "#ffffff",
                width: "50%",
                height: 50,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -20,
              }}
            >
              <Text style={{ color: "#2C2C2C", fontSize: 18 }}>Next</Text>
            </Pressable>
          </>
        )}
      </View>
    )}
      
      {phase === "menu" && (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 24 }}>Welcome to the Home Screen!</Text>
          <Pressable
                onPress={() => router.push('/Take_Attendance')}
                  style={{
                    borderWidth: 2,
                    padding: 20,
                    borderRadius: 8,
                    minWidth: 150,
                    width: '40%',
                    height: '30%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    marginLeft: 10,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 10, textAlign: 'center', color: 'white' }}>
                    Take Attendance
                  </Text>
          </Pressable>
          <Pressable
                  style={{
                    borderWidth: 2,
                    padding: 20,
                    borderRadius: 8,
                    minWidth: 150,
                    width: '40%',
                    height: '30%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    marginLeft: 10,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 10, textAlign: 'center', color: 'white' }}>
                    Add Student
                  </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: "39%",
    minHeight: "45%",
    backgroundColor: "#116C1B",
    borderRadius: 8,
  }
});