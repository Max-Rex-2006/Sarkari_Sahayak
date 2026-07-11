from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

with open("schemes.json", "r", encoding="utf-8") as f:
    SCHEMES_DB = json.load(f)

class UserAnswers(BaseModel):
    state: str
    income_annual: int
    caste_category: Literal["general", "obc", "sc", "st"]
    is_student: bool
    owns_pucca_house: bool
    has_ration_card: bool
    # New fields for your schemes
    age: int = 0
    gender: str = "male"
    is_rural: bool = False
    is_bpl: bool = False
    is_widow: bool = False
    is_farmer: bool = False
    is_married: bool = False
    is_government_employee: bool = False
    is_government_taxpayer: bool = False
    owns_cultivable_land: bool = False
    has_completed_ekyc: bool = False
    has_other_pension: bool = False
    has_other_scholarship: bool = False
    has_valid_nfsa_card: bool = False
    in_secc_2011: bool = False
    awaas_plus_listed: bool = False
    marks_percentage: float = 0.0
    marks_percentage_class_7: float = 0.0
    application_stage_class: int = 0
    school_type: str = ""

def evaluate_rule(rule: dict, answers: dict) -> bool:
    # Handle OR grouped rules
    if "logical_operator" in rule:
        if rule["logical_operator"] == "OR":
            return any(evaluate_rule(r, answers) for r in rule["conditions"])
        if rule["logical_operator"] == "AND":
            return all(evaluate_rule(r, answers) for r in rule["conditions"])
        return False

    field    = rule["field"]
    operator = rule["operator"]
    value    = rule["value"]
    user_val = answers.get(field)

    if user_val is None:
        return False
    if operator == "lte": return user_val <= value
    if operator == "gte": return user_val >= value
    if operator == "eq":  return user_val == value
    if operator == "lt":  return user_val < value
    if operator == "gt":  return user_val > value
    if operator == "in":  return user_val in value
    return False

@app.get("/")
def read_root():
    return {"message": "Sarkari Sahayak API is live!"}

@app.post("/check-eligibility")
def check_eligibility(answers: UserAnswers):
    answers_dict = answers.model_dump()
    matched = []

    for scheme in SCHEMES_DB["schemes"]:
        all_passed = all(
            evaluate_rule(rule, answers_dict)
            for rule in scheme["eligibility_rules"]
        )
        if all_passed:
            matched.append({
                "id":          scheme["id"],
                "name":        scheme["name"],
                "name_hi":     scheme.get("name_hi", ""),
                "description": scheme["description"],
                "documents":   scheme["documents"],
                "apply_at":    scheme["apply_at"]
            })

    return {
        "qualifying_schemes": matched,
        "total_found": len(matched)
    }



import os
from pathlib import Path
from dotenv import load_dotenv

# 1. Force Python to find the .env file in the exact same folder as this main.py file
current_dir = Path(__file__).resolve().parent
env_path = current_dir / ".env"
load_dotenv(dotenv_path=env_path)

# 2. Check if the key actually loaded before importing the Google SDK
if not os.getenv("GEMINI_API_KEY"):
    raise RuntimeError(f"Could not find GEMINI_API_KEY. Checked path: {env_path}")

# 3. Now it is safe to import and initialize
from google import genai
# FIX: Added the missing types import
from google.genai import types

client = genai.Client()

# Example script generation on startup
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents="Write an application for PM Awas Yojana for Ramesh Kumar",
    config=types.GenerateContentConfig(
        system_instruction="You are a helpful assistant that writes formal Hindi letters.",
        max_output_tokens=1000,
    ),
)

print(response.text)

# Your FastAPI endpoint
@app.get("/test-gemini")
def test_gemini():
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Reply with exactly: Sarkari Sahayak Gemini connection successful.",
        config=types.GenerateContentConfig(
            system_instruction="You are a helpful assistant.",
            max_output_tokens=1000,
        ),
    )
    return {"reply": response.text}
