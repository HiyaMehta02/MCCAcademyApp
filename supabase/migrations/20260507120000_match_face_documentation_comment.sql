-- Documents how match_threshold is interpreted (cosine similarity, not dlib Euclidean distance).
-- Safe to re-apply: replaces the function comment only.
COMMENT ON FUNCTION public.match_face(vector, double precision) IS 'Face match: uses pgvector cosine distance (<=>). Row similarity = 1 - (face_embedding <=> query_embedding). Rows are kept only if that value exceeds match_threshold (cosine similarity scale, not dlib Euclidean face_distance). Tune threshold with labeled same/different pairs; Python often still uses 0.6 here as a starting point.';
