import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
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
import { supabase } from "../../lib/supabase";
import {
  CANONICAL_IMPORT_FIELDS,
  applyMapping,
  guessMapping,
} from "../../lib/csvParse";
import {
  ImportMapping,
  ImportRunResult,
  MappingTemplate,
  deleteMappingTemplate,
  loadMappingTemplates,
  runCsvImport,
  saveMappingTemplate,
} from "../../lib/importApi";
import { loadCsvFromText } from "../../lib/loadCsvContent";

const PREVIEW_ROWS = 10;

function MappingPickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                onSelect(null);
                onClose();
              }}
            >
              <Text style={styles.modalOptionText}>— Skip —</Text>
            </TouchableOpacity>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  selected === option && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selected === option && styles.modalOptionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ImportDataScreen() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [pickerField, setPickerField] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportRunResult | null>(null);
  const [csvPaste, setCsvPaste] = useState("");

  const mappedRecords = useMemo(
    () => applyMapping(headers, rows, mapping),
    [headers, rows, mapping]
  );

  const previewRows = useMemo(() => rows.slice(0, PREVIEW_ROWS), [rows]);

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    const [{ data: adminData }, savedTemplates] = await Promise.all([
      supabase.rpc("is_current_user_admin"),
      loadMappingTemplates(),
    ]);
    setIsAdmin(Boolean(adminData));
    setTemplates(savedTemplates);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  function applyLoadedCsv(filenameValue: string, table: { headers: string[]; rows: string[][] }) {
    setFilename(filenameValue);
    setHeaders(table.headers);
    setRows(table.rows);
    setMapping(guessMapping(table.headers));
    setResult(null);
  }

  function handleLoadPaste() {
    try {
      const loaded = loadCsvFromText(csvPaste);
      applyLoadedCsv(loaded.filename, loaded.table);
    } catch (err: unknown) {
      Alert.alert("Invalid CSV", err instanceof Error ? err.message : "Could not parse pasted CSV.");
    }
  }

  async function handleSaveTemplate() {
    try {
      await saveMappingTemplate(templateName, mapping);
      setTemplates(await loadMappingTemplates());
      Alert.alert("Saved", `Mapping template "${templateName.trim()}" saved.`);
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not save template.");
    }
  }

  function applyTemplate(template: MappingTemplate) {
    setMapping(template.mapping);
    setTemplateName(template.name);
  }

  async function handleDeleteTemplate(name: string) {
    await deleteMappingTemplate(name);
    setTemplates(await loadMappingTemplates());
  }

  async function handleImport(dryRun: boolean) {
    if (mappedRecords.length === 0) {
      Alert.alert("Nothing to import", "Upload a CSV and map the required columns first.");
      return;
    }

    setBusy(true);
    try {
      const runResult = await runCsvImport({
        records: mappedRecords,
        dryRun,
        filename: filename ?? undefined,
      });
      setResult(runResult);
      if (!dryRun) {
        Alert.alert(
          "Import complete",
          `${runResult.success_count} succeeded, ${runResult.error_count} failed.`
        );
      }
    } catch (err: unknown) {
      Alert.alert("Import failed", err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator size="large" color="#116C1B" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.title}>Admin access required</Text>
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text style={styles.footerBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const counts = result?.created ?? result?.would_create;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoGroup}>
            <Image source={require("../../images/Logo.png")} style={styles.logoImage} />
            <View style={styles.logoContainer}>
              <Text style={styles.logoTopText}>IMPORT DATA</Text>
              <Text style={styles.scopeSubtext}>CSV bulk import</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Paste CSV</Text>
        <Text style={styles.helpText}>
          Copy your spreadsheet export and paste below. Prefer Google Sheets? Use Sheet sync from the menu.
        </Text>
        <TouchableOpacity
          style={styles.sheetLink}
          onPress={() => router.push("/Sheet_Sync" as never)}
        >
          <Ionicons name="logo-google" size={18} color="#fff" />
          <Text style={styles.sheetLinkText}>Open Google Sheet sync</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.pasteInput}
          multiline
          textAlignVertical="top"
          placeholder="Paste CSV content here (header row required)..."
          placeholderTextColor="#888"
          value={csvPaste}
          onChangeText={setCsvPaste}
        />
        <TouchableOpacity
          style={[styles.pickBtn, styles.pasteBtn, !csvPaste.trim() && styles.btnDisabled]}
          disabled={!csvPaste.trim()}
          onPress={handleLoadPaste}
        >
          <Ionicons name="clipboard-outline" size={22} color="#116C1B" />
          <Text style={styles.pickBtnText}>Load pasted CSV</Text>
        </TouchableOpacity>

        {headers.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Column mapping</Text>
            {CANONICAL_IMPORT_FIELDS.map((field) => (
              <View key={field.key} style={styles.mappingRow}>
                <View style={styles.mappingLabelCol}>
                  <Text style={styles.mappingLabel}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </Text>
                  {field.hint ? <Text style={styles.mappingHint}>{field.hint}</Text> : null}
                </View>
                <TouchableOpacity
                  style={styles.mappingPicker}
                  onPress={() => setPickerField(field.key)}
                >
                  <Text style={styles.mappingPickerText} numberOfLines={1}>
                    {mapping[field.key] ?? "— Skip —"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.templateRow}>
              <TextInput
                style={styles.templateInput}
                placeholder="Template name"
                placeholderTextColor="#888"
                value={templateName}
                onChangeText={setTemplateName}
              />
              <TouchableOpacity style={styles.templateSaveBtn} onPress={handleSaveTemplate}>
                <Text style={styles.templateSaveText}>Save mapping</Text>
              </TouchableOpacity>
            </View>

            {templates.length > 0 ? (
              <View style={styles.templateList}>
                {templates.map((template) => (
                  <View key={template.name} style={styles.templateChipRow}>
                    <TouchableOpacity
                      style={styles.templateChip}
                      onPress={() => applyTemplate(template)}
                    >
                      <Text style={styles.templateChipText}>{template.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteTemplate(template.name)}>
                      <Ionicons name="close-circle" size={20} color="#aaa" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Preview (first {PREVIEW_ROWS} rows)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewTable}>
              <View>
                <View style={styles.previewHeaderRow}>
                  {headers.map((header) => (
                    <Text key={header} style={styles.previewHeaderCell}>
                      {header}
                    </Text>
                  ))}
                </View>
                {previewRows.map((row, rowIndex) => (
                  <View key={`row-${rowIndex}`} style={styles.previewDataRow}>
                    {headers.map((header, colIndex) => (
                      <Text key={`${rowIndex}-${header}`} style={styles.previewDataCell}>
                        {row[colIndex] ?? ""}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.metaText}>{mappedRecords.length} data rows ready</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.dryRunBtn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => handleImport(true)}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>Dry run</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.commitBtn, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => {
                  Alert.alert(
                    "Commit import",
                    `Import ${mappedRecords.length} rows into Supabase?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Import", style: "destructive", onPress: () => handleImport(false) },
                    ]
                  );
                }}
              >
                <Text style={styles.actionBtnText}>Commit import</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {result.dry_run ? "Dry run results" : "Import results"}
            </Text>
            <Text style={styles.resultSummary}>
              {result.success_count} ok · {result.error_count} errors · {result.total_rows} rows
            </Text>
            {counts ? (
              <Text style={styles.resultSummary}>
                Branches {counts.branches} · Batches {counts.batches} · Students {counts.students}{" "}
                · Enrollments {counts.enrollments}
              </Text>
            ) : null}
            {result.row_results.slice(0, 20).map((row) => (
              <View key={`result-${row.row}`} style={styles.resultRow}>
                <Text style={styles.resultRowTitle}>
                  Row {row.row}: {row.status === "ok" ? row.action : row.error}
                </Text>
                {row.details?.student_name ? (
                  <Text style={styles.resultRowMeta}>{String(row.details.student_name)}</Text>
                ) : null}
              </View>
            ))}
            {result.row_results.length > 20 ? (
              <Text style={styles.resultMore}>
                + {result.row_results.length - 20} more rows in response
              </Text>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity style={styles.footerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-undo-sharp" size={20} color="white" />
          <Text style={styles.footerBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>

      <MappingPickerModal
        visible={pickerField !== null}
        title={`Map ${pickerField ?? ""}`}
        options={headers}
        selected={pickerField ? mapping[pickerField] ?? null : null}
        onSelect={(value) => {
          if (!pickerField) return;
          setMapping((prev) => ({ ...prev, [pickerField]: value }));
        }}
        onClose={() => setPickerField(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#181818" },
  scrollContent: { paddingHorizontal: 40, paddingBottom: 40, paddingTop: 8 },
  centerFill: {
    flex: 1,
    backgroundColor: "#181818",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  header: { flexDirection: "row", alignItems: "center", marginVertical: 20, paddingLeft: 48 },
  logoContainer: { borderLeftWidth: 3, borderLeftColor: "#BD1F14", paddingLeft: 10, marginLeft: 10 },
  logoGroup: { flexDirection: "row", alignItems: "center", flex: 1 },
  logoImage: { height: 72, width: 54, resizeMode: "contain" },
  logoTopText: { color: "white", fontSize: 34, fontWeight: "300", letterSpacing: 1 },
  scopeSubtext: { color: "#aaa", fontSize: 14, marginTop: 4 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  pickBtnText: { color: "#116C1B", fontSize: 16, fontWeight: "700", flex: 1 },
  pasteBtn: { marginBottom: 16 },
  pasteInput: {
    minHeight: 120,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#111",
    fontSize: 13,
    fontFamily: "monospace",
    marginBottom: 10,
  },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 10, marginTop: 8 },
  helpText: { color: "#aaa", fontSize: 13, lineHeight: 20, marginBottom: 10 },
  sheetLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  sheetLinkText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  mappingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  mappingLabelCol: { width: 150 },
  mappingLabel: { color: "#fff", fontSize: 14, fontWeight: "600" },
  mappingHint: { color: "#888", fontSize: 11, marginTop: 2 },
  mappingPicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mappingPickerText: { color: "#111", fontSize: 14, flex: 1, marginRight: 8 },
  templateRow: { flexDirection: "row", gap: 10, marginVertical: 12 },
  templateInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111",
  },
  templateSaveBtn: {
    backgroundColor: "#4d1212",
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  templateSaveText: { color: "#fff", fontWeight: "600" },
  templateList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  templateChipRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  templateChip: {
    backgroundColor: "#2C2C2C",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  templateChipText: { color: "#fff", fontSize: 13 },
  previewTable: {
    backgroundColor: "#00703c",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  previewHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ffffff44" },
  previewHeaderCell: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    width: 120,
    padding: 6,
  },
  previewDataRow: { flexDirection: "row" },
  previewDataCell: { color: "#fff", fontSize: 12, width: 120, padding: 6 },
  metaText: { color: "#aaa", marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  dryRunBtn: { backgroundColor: "#333" },
  commitBtn: { backgroundColor: "#116C1B" },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resultCard: {
    backgroundColor: "#1f1f1f",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  resultTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 6 },
  resultSummary: { color: "#aaa", fontSize: 13, marginBottom: 4 },
  resultRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#333", paddingVertical: 8 },
  resultRowTitle: { color: "#fff", fontSize: 13 },
  resultRowMeta: { color: "#888", fontSize: 12, marginTop: 2 },
  resultMore: { color: "#888", fontSize: 12, marginTop: 8 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#4d1212",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
    marginTop: 8,
  },
  footerBtnText: { color: "white", fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#111" },
  modalOption: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  modalOptionSelected: { backgroundColor: "#116C1B22" },
  modalOptionText: { color: "#111", fontSize: 15 },
  modalOptionTextSelected: { color: "#116C1B", fontWeight: "700" },
});
