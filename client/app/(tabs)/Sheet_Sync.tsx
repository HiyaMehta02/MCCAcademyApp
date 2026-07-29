import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  CANONICAL_IMPORT_FIELDS,
  applyMapping,
  guessMapping,
} from "../../lib/csvParse";
import { fetchGoogleSheetCsv } from "../../lib/googleSheetImport";
import {
  ImportMapping,
  ImportRunResult,
  runCsvImport,
} from "../../lib/importApi";
import { supabase } from "../../lib/supabase";

const PREVIEW_ROWS = 8;

export default function SheetSyncScreen() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportRunResult | null>(null);

  const mappedRecords = useMemo(
    () => applyMapping(headers, rows, mapping),
    [headers, rows, mapping]
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("is_current_user_admin");
      setIsAdmin(Boolean(data));
      setLoading(false);
    })();
  }, []);

  const fetchSheet = useCallback(async () => {
    setBusy(true);
    setResult(null);
    try {
      const downloaded = await fetchGoogleSheetCsv(sheetUrl);
      setFilename(downloaded.filename);
      setHeaders(downloaded.table.headers);
      setRows(downloaded.table.rows);
      setMapping(guessMapping(downloaded.table.headers));
      Alert.alert(
        "Sheet loaded",
        `${downloaded.table.rows.length} data rows · ${downloaded.table.headers.length} columns`
      );
    } catch (err) {
      Alert.alert("Could not load sheet", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [sheetUrl]);

  async function runImport(dryRun: boolean) {
    if (mappedRecords.length === 0) {
      Alert.alert("Nothing to import", "Load a Google Sheet first.");
      return;
    }
    const missingRequired = CANONICAL_IMPORT_FIELDS.filter(
      (f) => f.required && !mapping[f.key]
    );
    if (missingRequired.length > 0) {
      Alert.alert(
        "Mapping incomplete",
        `Map required fields: ${missingRequired.map((f) => f.label).join(", ")}`
      );
      return;
    }

    setBusy(true);
    try {
      const run = await runCsvImport({
        records: mappedRecords,
        dryRun,
        filename: filename ?? "google-sheet.csv",
      });
      setResult(run);
      Alert.alert(
        dryRun ? "Dry run complete" : "Import complete",
        `${run.success_count} ok · ${run.error_count} errors · ${run.total_rows} rows`
      );
    } catch (err) {
      Alert.alert("Import failed", err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#116C1B" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Admin access required</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Google Sheet sync</Text>
          <Text style={styles.subtitle}>Fetch roster from a shared sheet</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Paste sheet link</Text>
          <Text style={styles.help}>
            Share the Google Sheet as “Anyone with the link can view”, then paste the link here.
            The app downloads CSV and imports students the same way as CSV upload.
          </Text>
          <TextInput
            style={[styles.input, styles.urlInput]}
            value={sheetUrl}
            onChangeText={setSheetUrl}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            disabled={busy}
            onPress={fetchSheet}
          >
            <Text style={styles.primaryBtnText}>
              {busy ? "Loading…" : "Fetch from Google Sheet"}
            </Text>
          </TouchableOpacity>
        </View>

        {headers.length > 0 ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>2. Map columns</Text>
              <Text style={styles.help}>
                File: {filename} · {rows.length} rows
              </Text>
              {CANONICAL_IMPORT_FIELDS.map((field) => (
                <View key={field.key} style={styles.mapRow}>
                  <Text style={styles.mapLabel}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[styles.mapChip, !mapping[field.key] && styles.mapChipActive]}
                      onPress={() => setMapping((m) => ({ ...m, [field.key]: null }))}
                    >
                      <Text style={styles.mapChipText}>Skip</Text>
                    </TouchableOpacity>
                    {headers.map((header) => {
                      const selected = mapping[field.key] === header;
                      return (
                        <TouchableOpacity
                          key={`${field.key}-${header}`}
                          style={[styles.mapChip, selected && styles.mapChipActive]}
                          onPress={() =>
                            setMapping((m) => ({ ...m, [field.key]: header }))
                          }
                        >
                          <Text
                            style={[styles.mapChipText, selected && styles.mapChipTextActive]}
                          >
                            {header}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>3. Preview</Text>
              {rows.slice(0, PREVIEW_ROWS).map((row, index) => (
                <Text key={`preview-${index}`} style={styles.previewLine} numberOfLines={1}>
                  {row.filter(Boolean).join(" · ")}
                </Text>
              ))}
              {rows.length > PREVIEW_ROWS ? (
                <Text style={styles.help}>…and {rows.length - PREVIEW_ROWS} more rows</Text>
              ) : null}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.secondaryBtn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => runImport(true)}
              >
                <Text style={styles.secondaryBtnText}>Dry run</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() =>
                  Alert.alert(
                    "Commit import?",
                    `Import ${mappedRecords.length} rows into the live database?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Import", onPress: () => void runImport(false) },
                    ]
                  )
                }
              >
                <Text style={styles.primaryBtnText}>Commit import</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {result ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Last result {result.dry_run ? "(dry run)" : "(committed)"}
            </Text>
            <Text style={styles.help}>
              {result.success_count} ok · {result.error_count} errors · {result.total_rows} rows
            </Text>
            {result.row_results
              .filter((r) => r.status === "error")
              .slice(0, 8)
              .map((r) => (
                <Text key={`err-${r.row}`} style={styles.errorLine}>
                  Row {r.row}: {r.error}
                </Text>
              ))}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push("/Import_Data" as never)}
        >
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={styles.linkText}>Or paste / import a CSV file instead</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1c1c1c" },
  center: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4d1212",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: { color: "white", fontSize: 15 },
  titleBlock: { flex: 1 },
  title: { color: "white", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#aaa", fontSize: 13, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#2a2a2a",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 8 },
  help: { color: "#aaa", fontSize: 13, lineHeight: 18, marginBottom: 10 },
  input: {
    backgroundColor: "#1c1c1c",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
  },
  urlInput: { minHeight: 48 },
  primaryBtn: {
    backgroundColor: "#116C1B",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    flex: 1,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: "#3a3a3a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    flex: 1,
  },
  secondaryBtnText: { color: "#fff", fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  mapRow: { marginBottom: 12 },
  mapLabel: { color: "#ddd", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  mapChip: {
    backgroundColor: "#1c1c1c",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  mapChipActive: { backgroundColor: "#fff" },
  mapChipText: { color: "#fff", fontSize: 12 },
  mapChipTextActive: { color: "#111", fontWeight: "700" },
  previewLine: { color: "#ccc", fontSize: 12, marginBottom: 4 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 14 },
  errorLine: { color: "#ff8a80", fontSize: 12, marginBottom: 4 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  linkText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
