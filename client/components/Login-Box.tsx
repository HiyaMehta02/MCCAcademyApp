// components/Login-Box.js
import React, {useState} from 'react';
import { View, StyleSheet, Button, Text } from 'react-native';

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
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ color: "white", fontSize: 24 }}>Login Screen</Text>
          <Button title="Confirm Identity" onPress={handleLogin} />
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
    height: "41%",
    backgroundColor: '#116C1B',
  },
});


