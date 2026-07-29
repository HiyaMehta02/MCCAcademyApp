import { supabase } from "./supabase";

export const RESIDENT_CARD_BUCKET = "student-resident-cards";

export type ResidentCardSide = "front" | "back";

function pathColumn(side: ResidentCardSide): "resident_card_front_path" | "resident_card_back_path" {
  return side === "front" ? "resident_card_front_path" : "resident_card_back_path";
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

export async function uploadResidentCardSide(params: {
  studentId: string;
  side: ResidentCardSide;
  uri: string;
}): Promise<string> {
  const ext = params.uri.toLowerCase().includes(".png") ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const objectPath = `${params.studentId}/${params.side}_${Date.now()}.${ext}`;

  const bytes = await uriToArrayBuffer(params.uri);
  const { error: uploadError } = await supabase.storage
    .from(RESIDENT_CARD_BUCKET)
    .upload(objectPath, bytes, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const column = pathColumn(params.side);
  const { error: updateError } = await supabase
    .from("students")
    .update({ [column]: objectPath })
    .eq("student_id", params.studentId);

  if (updateError) throw updateError;
  return objectPath;
}

export async function clearResidentCardSide(params: {
  studentId: string;
  side: ResidentCardSide;
  existingPath?: string | null;
}): Promise<void> {
  if (params.existingPath) {
    await supabase.storage.from(RESIDENT_CARD_BUCKET).remove([params.existingPath]);
  }

  const column = pathColumn(params.side);
  const { error } = await supabase
    .from("students")
    .update({ [column]: null })
    .eq("student_id", params.studentId);

  if (error) throw error;
}

export async function getResidentCardSignedUrl(
  path: string | null | undefined,
  expiresInSeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(RESIDENT_CARD_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data?.signedUrl ?? null;
}
