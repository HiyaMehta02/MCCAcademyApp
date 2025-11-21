// components/Login-Box.js
import React, {useEffect, useState} from 'react';
import { View, StyleSheet, Text, TextInput, Image, Pressable } from 'react-native';
import { BASE_URL } from "../app/config/api";

interface Branch {
  Name: string;
}

export default function GreenBox({ style }) {
  const [phase, setPhase] = useState("login"); 
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogin = () => {
    setPhase("branch");
  };

  const handleBranchConfirm = () => {
    setPhase("menu");
  };

  useEffect(() => {
async function fetchBranches() {
  try {
    const response = await fetch(`${BASE_URL}/api/login`);

    if (!response.ok) throw new Error("Failed to fetch branches");

    const data = await response.json();
    setBranches(data);

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
  {/* the following is the login phase code */}
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
            
    {/* the following is the branch phase code */}
    {phase === "branch" && (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 24 }}>Branch Selection</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 }}>
              {branches.map((branch, index) => (
                <View
                  key={index}
                  style={{
                    borderWidth: 1,
                    borderColor: '#ccc',
                    padding: 20,
                    borderRadius: 8,
                    minWidth: 150,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 20,
                    marginBottom: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#000' }}>{branch.Name}</Text>
                </View>
              ))}
            </View>
            <Pressable
            onPress={handleBranchConfirm}
            style={{
                backgroundColor: "#116C1B",
                width: "50%",
                height: 50,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
            }}
            >
            <Text style={{ color: "white", fontSize: 18 }}>Select Branch</Text>
            </Pressable> 
        </View>
      )}

    {/* the following is the menu phase code */}
      {phase === "menu" && (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 24 }}>Welcome to the Home Screen!</Text>
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
    borderRadius: "4%"
  }
});


