import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  ResidentCardSide,
  clearResidentCardSide,
  getResidentCardSignedUrl,
  uploadResidentCardSide,
} from "../lib/residentCards";

type Props = {
  studentId: string;
  frontPath: string | null;
  backPath: string | null;
  onChanged: () => void;
};

export default function ResidentCardSection({
  studentId,
  frontPath,
  backPath,
  onChanged,
}: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [busySide, setBusySide] = useState<ResidentCardSide | null>(null);
  const [captureSide, setCaptureSide] = useState<ResidentCardSide | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [front, back] = await Promise.all([
          getResidentCardSignedUrl(frontPath),
          getResidentCardSignedUrl(backPath),
        ]);
        if (!cancelled) {
          setFrontUrl(front);
          setBackUrl(back);
        }
      } catch {
        if (!cancelled) {
          setFrontUrl(null);
          setBackUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [frontPath, backPath]);

  async function openCapture(side: ResidentCardSide) {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Camera needed", "Allow camera access to photograph the resident card.");
        return;
      }
    }
    setCaptureSide(side);
  }

  async function handleCapture() {
    if (!captureSide || !cameraRef.current) return;
    setCapturing(true);
    setBusySide(captureSide);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) {
        throw new Error("Could not capture photo.");
      }
      await uploadResidentCardSide({
        studentId,
        side: captureSide,
        uri: photo.uri,
      });
      setCaptureSide(null);
      Alert.alert(
        "Saved",
        `${captureSide === "front" ? "Front" : "Back"} of resident card uploaded.`
      );
      onChanged();
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : String(err));
    } finally {
      setCapturing(false);
      setBusySide(null);
    }
  }

  async function handleClear(side: ResidentCardSide) {
    const existing = side === "front" ? frontPath : backPath;
    if (!existing) return;

    Alert.alert("Remove photo?", `Delete the ${side} side of the resident card?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusySide(side);
          try {
            await clearResidentCardSide({ studentId, side, existingPath: existing });
            onChanged();
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : String(err));
          } finally {
            setBusySide(null);
          }
        },
      },
    ]);
  }

  function renderSide(side: ResidentCardSide, path: string | null, url: string | null) {
    const busy = busySide === side;
    return (
      <View style={styles.sideCard}>
        <Text style={styles.sideTitle}>{side === "front" ? "Front" : "Back"}</Text>
        {busy ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: 24 }} />
        ) : url ? (
          <Image source={{ uri: url }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="id-card-outline" size={28} color="#888" />
            <Text style={styles.placeholderText}>Not uploaded</Text>
          </View>
        )}
        <View style={styles.sideActions}>
          <TouchableOpacity
            style={styles.uploadBtn}
            disabled={busySide !== null}
            onPress={() => openCapture(side)}
          >
            <Text style={styles.uploadBtnText}>{path ? "Retake" : "Capture"}</Text>
          </TouchableOpacity>
          {path ? (
            <TouchableOpacity
              style={styles.clearBtn}
              disabled={busySide !== null}
              onPress={() => handleClear(side)}
            >
              <Text style={styles.clearBtnText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.help}>
        Oman resident card — both sides. Use the camera to photograph each side. Photos are private
        to coaches.
      </Text>
      <View style={styles.row}>
        {renderSide("front", frontPath, frontUrl)}
        {renderSide("back", backPath, backUrl)}
      </View>

      <Modal visible={captureSide !== null} animationType="slide" onRequestClose={() => setCaptureSide(null)}>
        <View style={styles.cameraScreen}>
          <CameraView style={styles.camera} facing="back" ref={cameraRef} />
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraTitle}>
              Capture {captureSide === "front" ? "front" : "back"} of card
            </Text>
            <View style={styles.cameraActions}>
              <TouchableOpacity
                style={styles.cameraCancel}
                disabled={capturing}
                onPress={() => setCaptureSide(null)}
              >
                <Text style={styles.cameraCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cameraShutter, capturing && styles.disabled]}
                disabled={capturing}
                onPress={handleCapture}
              >
                {capturing ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.cameraShutterText}>Take photo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  help: { color: "#aaa", fontSize: 13, lineHeight: 18 },
  row: { flexDirection: "row", gap: 10 },
  sideCard: {
    flex: 1,
    backgroundColor: "#1f1f1f",
    borderRadius: 10,
    padding: 10,
  },
  sideTitle: { color: "#fff", fontWeight: "700", marginBottom: 8 },
  preview: {
    width: "100%",
    height: 110,
    borderRadius: 8,
    backgroundColor: "#111",
  },
  placeholder: {
    height: 110,
    borderRadius: 8,
    backgroundColor: "#151515",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  placeholderText: { color: "#777", fontSize: 12 },
  sideActions: { flexDirection: "row", gap: 6, marginTop: 8 },
  uploadBtn: {
    flex: 1,
    backgroundColor: "#116C1B",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#4d1212",
  },
  clearBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  cameraScreen: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    gap: 14,
  },
  cameraTitle: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },
  cameraActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  cameraCancel: {
    backgroundColor: "#4d1212",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cameraCancelText: { color: "#fff", fontWeight: "600" },
  cameraShutter: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cameraShutterText: { color: "#111", fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
