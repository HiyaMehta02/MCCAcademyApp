import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Image, Pressable, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

// Required for iOS to complete the auth session in the browser
WebBrowser.maybeCompleteAuthSession();

interface Branch {
  branch_id: string;
  branch_name: string;
}

export default function GreenBox({ style }) {
  const [phase, setPhase] = useState("login");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // GOOGLE LOGIN LOGIC
  const handleGoogleLogin = async () => {
    console.log("1. Login button clicked...");
    setAuthLoading(true);

    try {
      // 1. Create the return URL
      const redirectTo = Linking.createURL('auth');
      console.log("2. Redirect URL created:", redirectTo);

      // 2. Get the OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true, 
        },
      });

      if (error) {
        console.error("Supabase Auth Error:", error.message);
        throw error;
      }

      console.log("3. Supabase returned URL:", data?.url);

      if (data?.url) {
        // 4. MANUALLY open the browser
        console.log("4. Attempting to open WebBrowser...");
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        console.log("5. Browser session finished with result:", result.type);

if (result.type === 'success' && result.url) {
        const { url } = result;
        console.log("6. Received URL:", url);

        const parts = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
        
        if (parts) {
          const params = Object.fromEntries(new URLSearchParams(parts));
          
          if (params.access_token) {
            console.log("7. Access token found, setting session...");
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });

            if (!sessionError) {
              setPhase("branch");
            } else {
              Alert.alert("Session Error", sessionError.message);
            }
          } else {
            console.log("7. No access token in URL parts:", params);
          }
        }
      }
      } else {
        console.error("No URL was returned from Supabase.");
      }
    } catch (err) {
      console.error("Full Catch Error:", err);
      Alert.alert("Login Error", err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBranchConfirm = () => {
    router.push({ 
      pathname: '/Batch_Screen', 
      params: { 
        branch_id: selectedBranch?.branch_id, 
        branch_name: selectedBranch?.branch_name 
      } 
    });
  };

  useEffect(() => {
    async function fetchBranches() {
      try {
        const apiIp = process.env.EXPO_PUBLIC_IP_ADDRESS;
        const response = await fetch(`http://${apiIp}:8000/branches`);
        if (!response.ok) throw new Error("Failed to fetch branches");
        const data = await response.json();
        setBranches(data.branches);
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
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Coach Login</Text>
          <Text style={styles.subtitle}>Sign in with your Google account to access the MCC Academy system.</Text>
          
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={authLoading}
            style={[
              styles.googleBtn,
              { opacity: authLoading ? 0.7 : 1 }
            ]}
          >
            {authLoading ? (
              <ActivityIndicator color="black" />
            ) : (
              <View style={styles.googleBtnContent}>
                <Ionicons name="logo-google" size={20} color="#EA4335" />
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <Image
            source={require("../images/Logo.png")}
            style={styles.logo}
          />
        </View>
      )}

      {phase === "branch" && (
        <View style={{ marginTop: 30, alignItems: "center", width: '100%' }}>
          <Text style={styles.branchTitle}>Select your branch</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="white" style={{ marginTop: 40 }} />
          ) : (
            <>
              <View style={styles.branchGrid}>
                {branches.map((branch) => (
                  <Pressable
                    key={branch.branch_id}
                    onPress={() => setSelectedBranch(branch)}
                    style={[
                      styles.branchCard,
                      { backgroundColor: selectedBranch?.branch_id === branch.branch_id ? '#ffffff' : '#2C2C2C' }
                    ]}
                  >
                    <Text style={[
                      styles.branchCardText,
                      { color: selectedBranch?.branch_id === branch.branch_id ? '#2C2C2C' : '#ffffff' }
                    ]}>
                      {branch.branch_name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.footer}>
                <TouchableOpacity onPress={() => setPhase("login")} style={styles.footerBtn}>
                  <Ionicons name="arrow-back" size={20} color="white" />
                  <Text style={styles.footerBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleBranchConfirm} 
                  disabled={!selectedBranch} 
                  style={[styles.footerBtn, !selectedBranch && { opacity: 0.4 }]}
                >
                  <Text style={styles.footerBtnText}>Next</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </>
          )}
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
    padding: 20
  },
  contentContainer: { flex: 1, alignItems: "center", justifyContent: "center", width: "100%" },
  title: { color: "white", fontSize: 37, marginBottom: 10 },
  subtitle: { color: "white", fontSize: 14, marginBottom: 30, width: "80%", textAlign: "center", opacity: 0.8 },
  googleBtn: {
    backgroundColor: "white",
    width: "80%",
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  googleBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleBtnText: { color: "black", fontSize: 16, fontWeight: '600' },
  logo: { width: 40, height: 50, resizeMode: "contain", marginTop: 20 },
  branchTitle: { color: "white", fontSize: 26, textAlign: "center", marginBottom: 20 },
  branchGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
  branchCard: {
    padding: 20,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchCardText: { fontSize: 18, fontWeight: '600' },
  footer: { flexDirection: 'row', marginTop: 30, gap: 20 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4d1212',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  footerBtnText: { color: 'white', fontSize: 16 },
});