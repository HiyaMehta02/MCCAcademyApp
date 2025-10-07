// components/Login-Box.js
import React, {useState} from 'react';
import { View, StyleSheet, Text, TextInput, Image, Pressable } from 'react-native';

export default function GreenBox({ style }) {
  const [phase, setPhase] = useState("login"); 

  const handleLogin = () => {
    setPhase("branch");
  };

  const handleBranchConfirm = () => {
    setPhase("menu");
  };

  return <View style={[styles.box, style]}> 
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
            
    {phase === "branch" && (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 24 }}>Branch Selection</Text>
          <Button title="Select Branch" onPress={handleBranchConfirm} />
        </View>
      )}

      {phase === "menu" && (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 24 }}>Welcome to the Home Screen!</Text>
        </View>
      )}
    </View>;
}

const styles = StyleSheet.create({
  box: {
    width: "38%",
    height: "45%",
    backgroundColor: '#116C1B',
  },
});


