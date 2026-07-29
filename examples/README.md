# MCCC student import — CSV template

Share **`mccc_student_import_template.csv`** with whoever prepares the academy spreadsheet. They should match this layout before import.

## Required columns (every row must have values)

| Column | Example | Notes |
|--------|---------|--------|
| `first_name` | Ali | Student first name |
| `last_name` | Al-Habsi | Student last name |
| `branch_name` | Wadi Kabir | Use `Wadi Kabir` or `Azaiba` (Muscat maps to Wadi Kabir) |
| `batch_name` | Weekday Morning | Batch/class (created if new) |

**Alternative:** use `full_name` instead of `first_name` + `last_name` (e.g. `Ali Al-Habsi`).

## Optional columns

| Column | Example | Notes |
|--------|---------|--------|
| `parent_phone` | 96891234567 | Helps match existing students |
| `gender` | M, F, boy, girl | Defaults to boy if blank |
| `dob` | 2015-03-12 or 14/06/2016 | Date of birth |
| `clothes_size` | 32 | Kit / clothes size (optional) |

## Rules for the person reformatting the file

1. **Row 1 = column headers** (exact names above work best; other names can be mapped in the app).
2. **One student per row.**
3. Use the **same spelling** for branch and batch names on every row (e.g. always `Wadi Kabir`, not mixed with `Muscat`).
4. **Comma-separated** values. Use quotes if a name contains a comma: `"Al-Habsi, Jr."`.
5. Do **not** include payment, attendance, or face columns in v1 — those are handled in the app later.

## Not imported in v1

- Payments / invoices  
- Attendance history  
- Face photos / embeddings  

## Sample file

See: [`mccc_student_import_template.csv`](./mccc_student_import_template.csv)

```csv
first_name,last_name,branch_name,batch_name,parent_phone,gender,dob,clothes_size
Ali,Al-Habsi,Wadi Kabir,Weekday Morning,96891234567,M,2015-03-12,32
Sara,Al-Balushi,Wadi Kabir,Weekday Morning,96892345678,F,2014-06-14,30
...
```

## In the app

1. Admin → **Menu → Import data**
2. Paste CSV → **Load pasted CSV**
3. Confirm column mapping → **Dry run** → **Commit import**
