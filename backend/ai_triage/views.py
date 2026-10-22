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
    Evaluates patient symptoms for true life-threatening emergencies.
    Only flags genuine red flags (acute hemorrhage, respiratory arrest, stroke, cardiac infarction).
    Common ailments like standard headache, mild fever, or fatigue are treated as routine home care.
    """
    user_symptoms = symptoms.lower().strip()

    # 1. Severe Bleeding / Hemorrhage (requires bleeding AND explicit acute severity in patient input)
    bleeding_stems = r'(bleed|blead|blood|blod|hemorrhag|haemorrhag|bled)'
    severity_stems = r'(sever|serve|sevear|heavy|profus|massiv|excess|uncontrol|pour|gush|arterial|deep|wound|stab|knife|accident|large|faint|collaps)'
    
    if re.search(bleeding_stems, user_symptoms) and re.search(severity_stems, user_symptoms):
        return True, "Severe Bleeding & Acute Hemorrhage"
        
    direct_bleeding_emergencies = [
        'coughing blood', 'blood in cough', 'blood in phlegm', 'hemoptysis',
        'vomiting blood', 'blood in vomit', 'hematemesis', 'rectal bleeding',
        'bleeding out', 'arterial bleeding'
    ]
    if any(k in user_symptoms for k in direct_bleeding_emergencies):
        return True, "Acute Bleeding / Hemorrhagic Red Flag"

    # Any blood combined with vomiting, coughing, spitting, stool, or urine
    if re.search(r'(vomit|throw up|cough|spit|stool|urine|poop|pee)', user_symptoms) and re.search(r'(blood|bleed|hemorrhag)', user_symptoms):
        return True, "Acute Bleeding / Hemorrhagic Red Flag"

    # 2. Acute Respiratory Distress / Suffocation
    respiratory_emergencies = [
        'can\'t breathe', 'cant breathe', 'cannot breathe', 'unable to breathe',
        'struggling to breathe', 'gasping for air', 'choking', 'suffocat',
        'severe asthma attack', 'blue lips', 'bluish lips'
    ]
    if any(k in user_symptoms for k in respiratory_emergencies):
        return True, "Acute Respiratory Distress"

    # 3. Cardiovascular Red Flags (Infarction / Acute Chest Pain)
    cardiac_emergencies = [
        'heart attack', 'crushing chest', 'cardiac arrest',
        'chest pain radiating to arm', 'chest pressure and left arm'
    ]
    if any(k in user_symptoms for k in cardiac_emergencies):
        return True, "Cardiovascular Red Flag"
    
    # Moderate check: chest pain with shortness of breath or dizziness
    if 'chest pain' in user_symptoms or 'chest pressure' in user_symptoms:
        if any(k in user_symptoms for k in ['severe', 'crushing', 'radiating', 'arm', 'jaw', 'sweat', 'breath', 'dizzy']):
            return True, "Acute Chest Pain / Cardiovascular Event"

    # 4. Neurological & Stroke (Sudden paralysis, facial droop, thunderclap headache)
    neuro_emergencies = [
        'stroke', 'facial droop', 'facial drooping',
        'one-sided weakness', 'can\'t move arm', 'loss of consciousness',
        'passed out', 'unconscious', 'fainted and fell', 'seizure', 'convuls',
        'thunderclap headache', 'worst headache of my life', 'sudden explosive headache'
    ]
    if any(k in user_symptoms for k in neuro_emergencies):
        return True, "Acute Neurological / Stroke Event"

    # 5. Anaphylaxis, Trauma & Systemic Shock
    trauma_emergencies = [
        'anaphylaxis', 'throat closing', 'swollen tongue and throat', 'overdose',
        'swallowed poison', 'gunshot', 'stab wound', 'head trauma unconscious'
    ]
    if any(k in user_symptoms for k in trauma_emergencies):
        return True, "Trauma / Acute Systemic Emergency"

    # 6. Structured AI Header check (ONLY inspects the explicit Urgency Level header line, NOT disclaimers)
    if ai_analysis:
        urgency_match = re.search(
            r'###?\s*(?:\d+\.?\s*)?(?:urgency level|triage category|classification)[^\n\r]*[\r\n]+\s*([^\n\r]+)',
            ai_analysis,
            re.IGNORECASE
        ) or re.search(
            r'(?:urgency level|triage category|classification)\s*[:\-]\s*([^\n\r]+)', 
            ai_analysis, 
            re.IGNORECASE
        )
        if urgency_match:
            header_line = urgency_match.group(1).lower()
            if any(term in header_line for term in ['critical', 'emergency', 'immediate er', 'life-threatening']) and \
               not any(term in header_line for term in ['routine', 'mild', 'home care', 'not an emergency', 'non-emergency']):
                return True, "Clinical AI Classified Emergency"

    return False, "Routine / Scheduled"

def get_triage_routing_metadata(symptoms: str, ai_analysis: str = "") -> dict:
    is_emergency, emergency_reason = detect_clinical_red_flags(symptoms, ai_analysis)
    user_text = symptoms.lower()
    
    doc = None
    specialty = "General Practice"

    try:
        # 1. Coughing Blood / Hemoptysis / Respiratory Diseases -> Dr. Amina Bello (Pulmonology)
        if any(k in user_text for k in ['coughing blood', 'blood in cough', 'blood in phlegm', 'hemoptysis']) or \
           (any(k in user_text for k in ['lung', 'wheez', 'asthma', 'phlegm', 'respiratory']) and not any(k in user_text for k in ['bleed', 'blead', 'wound', 'stab'])):
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

        # 4. If acute emergency -> Dr. Babatunde Adeleke
        elif is_emergency:
            doc = User.objects.filter(role='DOCTOR', specialization__icontains='Emergency').first()
            specialty = "Emergency Medicine & Trauma"

        # 5. Common Symptoms (Headache, Fatigue, Stomach, Cold, Fever, General) -> General Practice / First Available Clinician
        else:
            doc = User.objects.filter(role='DOCTOR', specialization__icontains='General').first() or User.objects.filter(role='DOCTOR').first()
            specialty = getattr(doc, 'specialization', 'General Practice') if doc else 'General Practice'

        # Fallback if preferred specialist not found
        if not doc:
            doc = User.objects.filter(role='DOCTOR').first()

        doc_info = None
        if doc:
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
    except Exception as e:
        print("Triage doctor routing lookup fallback:", e)
        doc_info = None
        
    urgency_level = "CRITICAL / EMERGENCY" if is_emergency else "ROUTINE / SELF-CARE & MONITORING"
    
    return {
        "is_emergency": is_emergency,
        "emergency_reason": emergency_reason,
        "urgency": urgency_level,
        "specialty": specialty,
        "recommended_doctor": doc_info
    }

def run_clinical_heuristics(symptoms: str) -> str:
    """
    Intelligent heuristic clinical triage engine.
    Provides immediate home remedies for common symptoms and clear guidance on when to see a doctor.
    """
    routing = get_triage_routing_metadata(symptoms)
    is_emergency = routing["is_emergency"]
    emergency_reason = routing["emergency_reason"]
    specialty = routing["specialty"]
    doc = routing["recommended_doctor"]
    rec_doctor = f"Dr. {doc['name']} ({doc['specialization']})" if doc else "Consulting Physician"

    lower_sym = symptoms.lower()

    if is_emergency:
        return (
            f"### 1. Clinical Symptom Assessment\n"
            f"**Reported Presentation:** {symptoms}\n\n"
            f"### 2. Triage Urgency Level\n"
            f"🚨 **CRITICAL EMERGENCY (Immediate ER Care Advised)**\n"
            f"- **Primary Flag:** {emergency_reason}\n\n"
            f"### 3. Immediate Action Protocol\n"
            f"- **Call Emergency Services:** Please call emergency responders (112 or 911) immediately or have someone drive you to the nearest emergency room.\n"
            f"- **Paramedic Pass:** Open your digital Emergency Pass in the portal to display blood type, allergies, and emergency contacts to first responders.\n"
            f"- **Do Not Drive Yourself:** Keep calm, sit or lie in a comfortable position, and await medical personnel.\n\n"
            f"### 4. Assigned Clinician Specialty\n"
            f"- **On-Call Specialty:** {specialty} ({rec_doctor})\n\n"
            f"Medical Safety Disclaimer:\n"
            f"This is an automated clinical decision-support triage. Life-threatening signs require in-person emergency evaluation without delay."
        )

    # 1. Headache presentation
    if 'headache' in lower_sym or 'migraine' in lower_sym or 'head hurts' in lower_sym or 'head ache' in lower_sym:
        remedies = (
            "1. **Hydration First:** Drink 500ml (2 tall glasses) of cool water immediately. Mild dehydration is the #1 trigger for tension and daytime headaches.\n"
            "2. **Dark & Quiet Rest:** Rest in a dimly lit, quiet room with your eyes closed for 20-30 minutes. Turn off smartphone and computer screens to reduce eye strain.\n"
            "3. **Temperature Therapy:** Apply a cold pack or damp cool washcloth across your forehead, or place a warm compress at the back of your neck to loosen tight muscles.\n"
            "4. **Over-The-Counter Relief:** Standard over-the-counter pain relievers such as Paracetamol (500mg-1000mg) or Ibuprofen (200mg-400mg with food) can provide safe relief if you have no contraindications or stomach ulcers."
        )
        when_to_see_doctor = (
            "- If the headache persists for **more than 48 to 72 hours** or fails to respond to rest and over-the-counter medication.\n"
            "- If it progressively worsens in intensity or disrupts your daily sleep and work.\n"
            "- If accompanied by persistent nausea, neck stiffness, fever, or visual disturbances (flashing lights or blurriness)."
        )

    # 2. Cold, Cough, Sore Throat, Mild Fever
    elif any(k in lower_sym for k in ['cold', 'cough', 'throat', 'fever', 'flu', 'congestion', 'runny nose']):
        remedies = (
            "1. **Warm Soothing Fluids:** Drink warm water with honey and freshly squeezed lemon, or clear broths to soothe irritated throat mucosa and break up mucus.\n"
            "2. **Steam Inhalation:** Inhale steam from a bowl of hot water or take a warm shower for 10 minutes to open nasal passages.\n"
            "3. **Warm Salt Water Gargle:** Dissolve 1/2 teaspoon of salt in warm water and gargle 3 times daily to reduce throat swelling.\n"
            "4. **Adequate Rest & Sleep:** Prioritize 8+ hours of sleep with your head slightly elevated to prevent post-nasal drip cough."
        )
        when_to_see_doctor = (
            "- If your fever exceeds 38.5°C (101.3°F) or lasts longer than 3 consecutive days.\n"
            "- If coughing produces thick yellow/green phlegm or causes sharp chest discomfort.\n"
            "- If you experience difficulty swallowing fluids or ear pain."
        )

    # 3. Stomach Upset, Nausea, Digestion, Diarrhea
    elif any(k in lower_sym for k in ['stomach', 'nausea', 'vomit', 'diarrhea', 'belly', 'cramp', 'indigestion', 'acid']):
        remedies = (
            "1. **Electrolyte Rehydration:** Take frequent small sips of Oral Rehydration Salts (ORS), coconut water, or diluted apple juice.\n"
            "2. **Gentle BRAT Diet:** When hunger returns, stick to Bananas, Rice, Applesauce, and plain Toast. Avoid dairy, fried food, caffeine, and acidic juices.\n"
            "3. **Peppermint or Ginger Tea:** Natural ginger or peppermint infusions help relax the gastrointestinal tract and quell nausea.\n"
            "4. **Abdominal Comfort:** Apply a warm heating pad to your lower abdomen to ease cramping."
        )
        when_to_see_doctor = (
            "- If you are unable to keep fluids down for over 24 hours.\n"
            "- If stomach pain is sharp, severe, or localized to the lower right side.\n"
            "- If you notice any blood in stool or vomit."
        )

    # 4. Fatigue, Muscle Aches, General Malaise
    else:
        remedies = (
            "1. **Restorative Sleep:** Target 8 hours of uninterrupted rest in a cool, quiet bedroom.\n"
            "2. **Hydration & Electrolytes:** Increase daily water intake to 2.5 liters, and include electrolyte-rich foods (bananas, citrus, leafy greens).\n"
            "3. **Gentle Stretching & Warm Bath:** Take a warm Epsom salt bath to relax tense muscular tissue.\n"
            "4. **Balanced Nutrition:** Eat light, nutrient-dense meals with lean protein and complex carbohydrates."
        )
        when_to_see_doctor = (
            "- If fatigue or discomfort persists for longer than 7 to 10 days without clear explanation.\n"
            "- If accompanied by unexplained weight loss, night sweats, or swollen lymph nodes.\n"
            "- If you notice interference with routine daily activities."
        )

    return (
        f"### 1. Clinical Symptom Assessment\n"
        f"**Reported Presentation:** {symptoms}\n"
        f"Your symptoms appear consistent with a **common, manageable presentation**. In most instances, these symptoms respond favorably to early supportive self-care and proper hydration.\n\n"
        f"### 2. Triage Urgency Level\n"
        f"🌿 **ROUTINE / MILD (Home Care with Self-Monitoring)**\n"
        f"No acute life-threatening red flags detected.\n\n"
        f"### 3. Immediate Home Remedies & Self-Care (Actionable Relief)\n"
        f"{remedies}\n\n"
        f"### 4. When to Visit a Doctor or Clinic\n"
        f"{when_to_see_doctor}\n"
        f"If symptoms persist or worsen over the next 48 to 72 hours, you should schedule a consultation with our clinic for a professional clinical review.\n\n"
        f"### 5. Recommended Clinician & Specialty\n"
        f"- **Recommended Specialty:** {specialty}\n"
        f"- **Assigned Clinician:** {rec_doctor}\n"
        f"You can book a routine telemedicine consultation using the card below.\n\n"
        f"### 6. Key Vitals to Monitor\n"
        f"- Body Temperature (°C / °F)\n"
        f"- Resting Pulse & Blood Pressure\n"
        f"- Daily Fluid Intake (aim for 2–2.5 L)\n\n"
        f"Medical Safety Disclaimer:\n"
        f"HealthTech AI triage provides clinical decision-support and educational guidance. It does not replace an in-person physical examination. If you experience severe chest pain, sudden difficulty breathing, or sudden weakness, seek emergency care immediately."
    )

def call_gemini(api_key: str, prompt: str) -> str:
    """
    Connects to Google Gemini Generative AI to produce personalized clinical triage.
    """
    endpoints_to_try = [
        ("v1beta", "gemini-3.6-flash", 4),
        ("v1beta", "gemini-3.5-flash", 4),
    ]
    
    headers = {"Content-Type": "application/json"}
    body = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "You are HealthTech AI, an empathetic, highly qualified clinical triage assistant. "
                            "Analyze the patient's symptoms with clinical precision and compassionate bedside manner.\n\n"
                            "Structure your response strictly using these Markdown sections:\n\n"
                            "### 1. Clinical Symptom Assessment\n"
                            "A concise summary of the reported symptoms and potential common causes (e.g. tension, dehydration, viral infection, eye strain).\n\n"
                            "### 2. Triage Urgency Level\n"
                            "State clearly one of:\n"
                            "- **ROUTINE / MILD (Home Care with Self-Monitoring)**\n"
                            "- **URGENT (Clinic Visit Recommended within 24-48 Hours)**\n"
                            "- **CRITICAL EMERGENCY (Immediate ER Evaluation Required)**\n\n"
                            "### 3. Immediate Home Remedies & Practical Relief (MANDATORY)\n"
                            "For common and mild symptoms (such as headache, mild fever, fatigue, minor cough, sore throat, upset stomach), provide 3 to 4 actionable, practical home remedies and self-care steps (e.g., hydration guidelines, rest in dark room, cold/warm compress, herbal tea, sleep, OTC options like paracetamol/ibuprofen if appropriate).\n\n"
                            "### 4. When to See a Doctor or Clinic\n"
                            "Give clear guidelines on when the patient should transition from home care to an in-person or telemedicine clinic visit (e.g., 'If symptoms persist beyond 2-3 days, worsen in intensity, or don't improve with rest').\n\n"
                            "### 5. Recommended Clinician Specialty\n"
                            "Specify the appropriate specialist (General Practice, Pulmonology, Cardiology, or Emergency Medicine).\n\n"
                            "### 6. Key Vitals to Monitor\n"
                            "List relevant vitals to track at home (e.g., Temperature, Pulse, Blood Pressure, Fluid Intake).\n\n"
                            "### 7. Medical Safety Disclaimer\n"
                            "Brief reminder that this is an AI triage decision-support tool, not a final diagnostic substitute.\n\n"
                            f"Patient Symptoms: {prompt}"
                        )
                    }
                ]
            }
        ]
    }

    last_err = None
    for version, model, timeout_sec in endpoints_to_try:
        url = f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, json=body, headers=headers, timeout=timeout_sec)
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

        # 2. Resilient Clinical Fallback with Home Remedies
        routing_metadata = get_triage_routing_metadata(symptoms)
        fallback_analysis = run_clinical_heuristics(symptoms)
        return Response({
            "analysis": fallback_analysis,
            "routing": routing_metadata
        }, status=status.HTTP_200_OK)
