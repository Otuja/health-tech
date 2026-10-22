import os
import re
import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from users.models import User
from appointments.models import Slot

def detect_clinical_red_flags(symptoms: str, ai_analysis: str = "") -> tuple[bool, str]:
    """
    Evaluates patient symptoms and AI assessment for life-threatening emergencies.
    Includes typo tolerance for common misspellings (e.g., 'serve bleading', 'cant breath').
    Returns (is_emergency: bool, detected_reason: str).
    """
    combined = (symptoms + " " + ai_analysis).lower()

    # 1. Severe Bleeding / Hemorrhage (with typo tolerance: serve, sever, sevear, blead, bleading, bleed, blood)
    bleeding_stems = r'(bleed|blead|blood|blod|hemorrhag|haemorrhag|bled)'
    severity_stems = r'(sever|serve|sevear|heavy|profus|massiv|excess|uncontrol|pour|gush|lot|serious|danger|critical|emergenc|bad|arterial|deep|wound|stab|knife|accident)'
    
    has_bleeding = bool(re.search(bleeding_stems, combined))
    has_severity = bool(re.search(severity_stems, combined))
    
    if has_bleeding and has_severity:
        return True, "Severe Bleeding & Acute Hemorrhage"
        
    direct_bleeding_emergencies = [
        'coughing blood', 'blood in cough', 'blood in phlegm', 'hemoptysis',
        'vomiting blood', 'blood in vomit', 'hematemesis', 'rectal bleeding',
        'blood in stool', 'internal bleeding', 'bleeding out', 'arterial bleeding'
    ]
    if any(k in combined for k in direct_bleeding_emergencies):
        return True, "Acute Bleeding / Hemorrhagic Red Flag"

    # 2. Acute Respiratory Distress
    respiratory_emergencies = [
        'can\'t breathe', 'cant breathe', 'cannot breathe', 'shortness of breath',
        'struggling to breathe', 'hard to breathe', 'gasping', 'choking', 'suffocat',
        'dyspnea', 'asthma attack', 'cyanosis', 'blue lips', 'bluish lips'
    ]
    if any(k in combined for k in respiratory_emergencies):
        return True, "Acute Respiratory Distress"

    # 3. Cardiovascular Red Flags
    cardiac_emergencies = [
        'chest pain', 'chest pressure', 'heart attack', 'crushing chest',
        'cardiac arrest', 'angina', 'tightness in chest', 'left arm pain'
    ]
    if any(k in combined for k in cardiac_emergencies):
        return True, "Cardiovascular Red Flag"

    # 4. Neurological & Stroke
    neuro_emergencies = [
        'stroke', 'slurred speech', 'facial droop', 'facial drooping',
        'one-sided weakness', 'can\'t move arm', 'loss of consciousness',
        'passed out', 'unconscious', 'fainted', 'seizure', 'convuls',
        'worst headache', 'thunderclap headache'
    ]
    if any(k in combined for k in neuro_emergencies):
        return True, "Acute Neurological / Stroke Event"

    # 5. Anaphylaxis, Trauma & Systemic Shock
    trauma_emergencies = [
        'anaphylaxis', 'throat closing', 'swollen tongue', 'overdose',
        'poison', 'gunshot', 'stab', 'head trauma', 'skull fracture'
    ]
    if any(k in combined for k in trauma_emergencies):
        return True, "Trauma / Acute Systemic Emergency"

    # 6. AI Assessment Inspection (if Gemini marked it as EMERGENCY or CRITICAL)
    if re.search(r'(urgency level|classification|triage category)[:\*\s]+(emergency|critical|immediate)', combined):
        return True, "Clinical AI Classified Emergency"

    if any(k in combined for k in ['immediate emergency', 'life-threatening', 'call 112', 'call 911', 'proceed to the nearest emergency']):
        return True, "Emergency Protocol Triggered"

    return False, "Routine / Scheduled"

def get_triage_routing_metadata(symptoms: str, ai_analysis: str = "") -> dict:
    is_emergency, emergency_reason = detect_clinical_red_flags(symptoms, ai_analysis)
    user_text = symptoms.lower()
    combined_text = (symptoms + " " + ai_analysis).lower()
    
    doc = None
    specialty = "General Practice"

    # 1. Coughing Blood / Hemoptysis / Respiratory Diseases -> Dr. Amina Bello (Pulmonology)
    if any(k in user_text for k in ['coughing blood', 'blood in cough', 'blood in phlegm', 'hemoptysis']) or \
       (any(k in user_text for k in ['lung', 'cough', 'wheez', 'asthma', 'phlegm', 'respiratory']) and not any(k in user_text for k in ['bleed', 'blead', 'wound', 'stab'])):
        doc = User.objects.filter(role='DOCTOR', specialization__icontains='Pulmonolog').first()
        specialty = "Pulmonology & Respiratory Medicine"

    # 2. Bleeding / Hemorrhage / Acute Trauma / Wounds -> Dr. Babatunde Adeleke (Emergency Medicine & Trauma)
    elif any(k in user_text for k in ['bleed', 'blead', 'hemorrhag', 'haemorrhag', 'wound', 'cut', 'trauma', 'accident', 'stab', 'injury', 'gush', 'pour']):
        doc = User.objects.filter(role='DOCTOR', specialization__icontains='Emergency').first()
        specialty = "Emergency Medicine & Trauma"

    # 3. Chest Pain / Cardiovascular -> Dr. Sarah Connor (Cardiology)
    elif any(k in user_text for k in ['chest', 'heart', 'palpitat', 'blood pressure', 'angina', 'cardiac']):
        doc = User.objects.filter(role='DOCTOR', specialization__icontains='Cardiolog').first()
        specialty = "Cardiology"

    # 4. Any other acute emergency -> Dr. Babatunde Adeleke (Emergency Medicine & Trauma)
    elif is_emergency:
        doc = User.objects.filter(role='DOCTOR', specialization__icontains='Emergency').first()
        specialty = "Emergency Medicine & Trauma"

    # 5. Non-emergency analysis cues (if mentioned in AI analysis)
    elif any(k in combined_text for k in ['pulmonolog', 'respiratory']):
        doc = User.objects.filter(role='DOCTOR', specialization__icontains='Pulmonolog').first()
        specialty = "Pulmonology & Respiratory Medicine"
    elif any(k in combined_text for k in ['cardiolog', 'heart']):
        doc = User.objects.filter(role='DOCTOR', specialization__icontains='Cardiolog').first()
        specialty = "Cardiology"
    else:
        doc = User.objects.filter(role='DOCTOR').first()
        specialty = getattr(doc, 'specialization', 'General Practice') if doc else 'General Practice'

    # Fallback if preferred specialist not seeded
    if not doc:
        doc = User.objects.filter(role='DOCTOR').first()

    doc_info = None
    if doc:
        # Find next available unbooked slot
        next_slot = Slot.objects.filter(
            doctor=doc,
            is_booked=False
        ).order_by('start_time').first()
        
        doc_info = {
            "id": doc.id,
            "username": doc.username,
            "name": doc.get_full_name() or doc.username,
            "specialization": getattr(doc, 'specialization', specialty),
            "available_slot_id": next_slot.id if next_slot else None,
            "slot_start_time": next_slot.start_time.isoformat() if next_slot else None,
            "slot_display_time": next_slot.start_time.strftime('%a, %b %d at %I:%M %p') if next_slot else None
        }
        
    urgency_level = "CRITICAL / EMERGENCY" if is_emergency else "ROUTINE CLINICAL EVALUATION"
    
    return {
        "is_emergency": is_emergency,
        "emergency_reason": emergency_reason,
        "urgency": urgency_level,
        "specialty": specialty,
        "recommended_doctor": doc_info
    }

def run_clinical_heuristics(symptoms: str) -> str:
    """Instant high-fidelity clinical triage analysis and specialty routing fallback."""
    routing = get_triage_routing_metadata(symptoms)
    is_emergency = routing["is_emergency"]
    emergency_reason = routing["emergency_reason"]
    specialty = routing["specialty"]
    doc = routing["recommended_doctor"]
    rec_doctor = f"Dr. {doc['name']} ({doc['specialization']})" if doc else "Physician Specialist"

    urgency_label = "EMERGENCY / IMMEDIATE EVALUATION REQUIRED" if is_emergency else "ROUTINE / SCHEDULED CLINICAL REVIEW"
    
    action_text = (
        f"🚨 **URGENT EMERGENCY ALERT:** {emergency_reason.upper()} DETECTED.\n"
        "Immediate emergency care is strongly advised. Please call emergency services (112 / 911) or proceed to the nearest emergency trauma center immediately."
        if is_emergency else
        f"We recommend scheduling a clinical consultation with {rec_doctor} via your patient portal."
    )

    analysis = (
        f"### Clinical Triage Assessment\n\n"
        f"**Patient Presentation:** {symptoms}\n\n"
        f"**Classification & Urgency:**\n"
        f"- **Triage Category:** {urgency_label}\n"
        f"- **Condition Indicator:** {emergency_reason}\n"
        f"- **Recommended Specialty:** {specialty}\n"
        f"- **Assigned Clinician:** {rec_doctor}\n\n"
        f"**Clinical Guidance:**\n"
        f"{action_text}\n\n"
        f"**Key Vitals to Monitor:**\n"
        f"- Resting Heart Rate & Pulse\n"
        f"- Blood Pressure (Systolic / Diastolic)\n"
        f"- Body Temperature (°C / °F)\n"
        f"- Oxygen Saturation (SpO2) if available\n\n"
        f"Medical Safety Disclaimer:\n"
        f"HealthTech AI triage is a clinical decision-support tool. It does not provide a definitive medical diagnosis. In case of sudden chest pain, difficulty breathing, severe bleeding, or coughing blood, call emergency services (112 / 911) immediately."
    )
    return analysis

def call_gemini(api_key: str, prompt: str) -> str:
    endpoints_to_try = [
        ("v1beta", "gemini-flash-lite-latest"),
        ("v1", "gemini-3.5-flash"),
        ("v1beta", "gemini-3.5-flash"),
        ("v1beta", "gemini-flash-latest")
    ]
    
    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "You are HealthTech AI, a professional medical symptom triage assistant. "
                            "Analyze the patient's symptoms thoroughly with clinical precision. Format with clean, structured Markdown:\n\n"
                            "### 1. Clinical Symptom Summary\n"
                            "### 2. Urgency Level (EMERGENCY / URGENT WITHIN 24H / ROUTINE)\n"
                            "### 3. Potential Clinical Explanations (differential guidance, non-definitive)\n"
                            "### 4. Recommended Medical Specialist (e.g. Pulmonologist, Cardiologist, Emergency Medicine, General Practitioner)\n"
                            "### 5. Essential Vitals to Track (e.g. BP, pulse, temp, SpO2)\n"
                            "### 6. Medical Safety Disclaimer\n\n"
                            f"Patient Symptoms: {prompt}"
                        )
                    }
                ]
            }
        ]
    }

    last_err = None
    for version, model in endpoints_to_try:
        url = f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, json=body, headers=headers, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
            else:
                last_err = resp.text
        except Exception as e:
            last_err = str(e)
            continue

    if last_err:
        raise Exception(f"Gemini API request notice: {last_err}")
    return ""

class SymptomAnalyzeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        symptoms = request.data.get('symptoms', '').strip()
        if not symptoms:
            return Response({"error": "Symptoms are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        gemini_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
        routing_metadata = get_triage_routing_metadata(symptoms)

        # 1. Primary: Google Gemini Cloud Engine
        if gemini_key:
            try:
                analysis = call_gemini(gemini_key, symptoms)
                if analysis:
                    routing_metadata = get_triage_routing_metadata(symptoms, analysis)
                    return Response({
                        "analysis": analysis,
                        "routing": routing_metadata
                    }, status=status.HTTP_200_OK)
            except Exception as e:
                print("Gemini API fallback notice:", e)

        # 2. Resilient Clinical Fallback
        routing_metadata = get_triage_routing_metadata(symptoms)
        fallback_analysis = run_clinical_heuristics(symptoms)
        return Response({
            "analysis": fallback_analysis,
            "routing": routing_metadata
        }, status=status.HTTP_200_OK)
