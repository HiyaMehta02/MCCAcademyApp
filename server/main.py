from fastapi import FastAPI, UploadFile, File
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
async def enroll_player(name: str, file: UploadFile = File(...)):
    
    with open("debug_photo.jpg", "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file.file.seek(0) 

    image = face_recognition.load_image_file(file.file)
    face_encodings = face_recognition.face_encodings(image)
    
    if len(face_encodings) == 0:
        return {"error": "No face found in the photo. Please check debug_photo.jpg on your computer!"}
        
    embedding = face_encodings[0].tolist()

    db_response = supabase.table("players").insert({
        "name": name, 
        "face_embedding": embedding
    }).execute()
    
    return {"message": f"Successfully enrolled {name}"}

@app.post("/check-attendance")
async def check_attendance(file: UploadFile = File(...)):
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
        return {"error": "Face not recognized. Are you enrolled?"}
        
    match = response.data[0]
    
    supabase.table("attendance_logs").insert({
            "player_id": match["id"]
        }).execute()
    
    return {"message": f"Attendance logged for {match['name']}"}

@app.get("/branches")
async def get_branches():
    print("Fetching branches from Supabase...")   
    response = supabase.table("branches").select("name").execute()
    return {"branches": response.data}