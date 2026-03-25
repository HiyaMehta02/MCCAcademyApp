from fastapi import FastAPI, UploadFile, File, Form
import face_recognition
import numpy as np
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import shutil 

load_dotenv()
app = FastAPI()

supabase: Client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY"))

@app.post("/enroll")
async def enroll_player(
    first_name: str = Form(...), 
    last_name: str = Form(...), 
    branch_id: str = Form(...),
    file: UploadFile = File(...)
):
    # 1. Process the Image
    with open("debug_photo.jpg", "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    file.file.seek(0) 

    image = face_recognition.load_image_file(file.file)
    face_encodings = face_recognition.face_encodings(image)
    
    if len(face_encodings) == 0:
        return {"error": "No face found. Check debug_photo.jpg!"}
        
    embedding = face_encodings[0].tolist()

    student_response = supabase.table("students").insert({
        "first_name": first_name,
        "last_name": last_name,
        "branch_id": branch_id
    }).execute()

    if not student_response.data:
        return {"error": "Failed to create student record."}

    new_student_id = student_response.data[0]["student_id"]

    supabase.table("student_auth").insert({
        "student_id": new_student_id,
        "face_embedding": embedding
    }).execute()
    
    return {"message": f"Successfully enrolled {first_name} {last_name}"}

@app.post("/check-attendance")
async def check_attendance(batch_id: str = Form(...), file: UploadFile = File(...)):
    image = face_recognition.load_image_file(file.file)
    face_encodings = face_recognition.face_encodings(image)
    
    if len(face_encodings) == 0:
        return {"error": "No face found in the photo."}
        
    embedding = face_encodings[0].tolist()

    response = supabase.rpc("match_face", {
        "query_embedding": embedding, 
        "match_threshold": 0.6
    }).execute()
    
    if not response.data or len(response.data) == 0:
        return {"error": "Face not recognized."}
        
    match = response.data[0] 
    
    supabase.table("attendance").insert({
            "student_id": match["student_id"],
            "batch_id": batch_id,
            "status": "Present"
        }).execute()
    
    return {"message": "Attendance logged successfully."}

@app.get("/branches")
async def get_branches():
    # Make sure 'branch_id' is inside the select quotes!
    response = supabase.table("branches").select("branch_id, branch_name").execute()
    
    # Add a print here to verify it's working in your Python terminal
    print(f"Sending to App: {response.data}") 
    
    return {"branches": response.data}

@app.get("/batches/{branch_id}")
async def get_batches(branch_id: str):
    # This 'nested select' pulls the schedule rows inside the batch object
    response = supabase.table("batches") \
        .select("batch_id, batch_name, batch_schedule(day_of_week, start_time, end_time)") \
        .eq("branch_id", branch_id) \
        .execute()
    
    return {"batches": response.data}

@app.get("/students/{batch_id}")
async def get_students_by_batch(batch_id: str):
    # We join batch_members with students. 
    response = supabase.table("batch_members") \
        .select("student_id, students(first_name, last_name, status, parent_phone)") \
        .eq("batch_id", batch_id) \
        .execute()
    
    if hasattr(response, 'error') and response.error:
        print(f"Error: {response.error}")
        return {"students": [], "error": str(response.error)}

    return {"students": response.data}