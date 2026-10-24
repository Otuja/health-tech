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
from .models import AIConsultationSession, AIConsultationMessage

def detect_clinical_red_flags(symptoms: str, ai_analysis: str = "") -> tuple[bool, str]:
    """
    Evaluates patient symptoms for true life-threatening emergencies.
    Only flags genuine red flags (acute hemorrhage, respiratory arrest, stroke, cardiac infarction).
    Common ailments like standard headache, mild fever, or fatigue are treated as routine home care.
    """
    user_symptoms = symptoms.lower().strip()

    # 1. Severe Bleeding / Hemorrhage
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

    # 4. Neurological & Stroke
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

    # 6. Structured AI Header check
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

def detect_query_intent(query: str) -> str:
    """
    Identifies the underlying intent of the patient's message so the response is
    tailored appropriately (Nutrition, Clinical Triage, Medications, Wellness, or General).
    """
    q = query.lower()

    # 1. Nutrition & Food
    food_terms = [
        'eat', 'eating', 'food', 'diet', 'nutrition', 'eba', 'garri', 'amala', 'fufu', 
        'pounded yam', 'rice', 'beans', 'bread', 'soup', 'egusi', 'ogbono', 'ewedu', 'okra',
        'calorie', 'carb', 'carbohydrate', 'protein', 'sugar', 'glucose', 'fat', 'fasting', 
        'intermittent', 'keto', 'vegetarian', 'vegan', 'cholesterol', 'meal', 'breakfast', 
        'lunch', 'dinner', 'snack', 'drink', 'beverage', 'alcohol', 'beer', 'wine', 'soda'
    ]
    if any(re.search(rf'\b{re.escape(term)}\b', q) for term in food_terms) or 'want to eat' in q or 'can i eat' in q:
        return AIConsultationSession.Category.NUTRITION_DIET

    # 2. Medications & Prescriptions
    med_terms = [
        'drug', 'medication', 'medicine', 'pill', 'tablet', 'capsule', 'dosage', 'dose',
        'paracetamol', 'ibuprofen', 'antibiotic', 'antacid', 'omeprazole', 'metformin',
        'panadol', 'amoxicillin', 'side effect', 'contraindication', 'supplement', 'vitamin'
    ]
    if any(re.search(rf'\b{re.escape(term)}\b', q) for term in med_terms):
        return AIConsultationSession.Category.MEDICATION_INQUIRY

    # 3. Lifestyle & Preventive Wellness
    lifestyle_terms = [
        'sleep', 'insomnia', 'exercise', 'workout', 'gym', 'jogging', 'running', 'stress',
        'anxiety', 'mental health', 'meditation', 'relaxation', 'hydration', 'water intake',
        'blood pressure', 'hypertension', 'weight loss', 'obesity', 'posture'
    ]
    if any(re.search(rf'\b{re.escape(term)}\b', q) for term in lifestyle_terms):
        return AIConsultationSession.Category.LIFESTYLE_WELLNESS

    # 4. Symptoms / Clinical Triage
    symptom_terms = [
        'pain', 'ache', 'hurts', 'fever', 'cough', 'headache', 'migraine', 'vomit', 'nausea',
        'diarrhea', 'rash', 'bleed', 'wound', 'cut', 'dizzy', 'dizziness', 'chest', 'breath',
        'swollen', 'infection', 'burn', 'throat', 'stomach', 'backache', 'cramp'
    ]
    if any(re.search(rf'\b{re.escape(term)}\b', q) for term in symptom_terms):
        return AIConsultationSession.Category.CLINICAL_TRIAGE

    return AIConsultationSession.Category.GENERAL_HEALTH

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

        # 5. Common Symptoms or General Wellness -> General Practice / First Available Clinician
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

def run_clinical_heuristics(prompt: str, intent: str = "", routing: dict = None) -> str:
    """
    Intelligent heuristic engine that provides conversational, context-aware responses
    across food/nutrition, common symptoms, medications, and clinical red flags.
    """
    if routing is None:
        routing = get_triage_routing_metadata(prompt)
        
    is_emergency = routing["is_emergency"]
    emergency_reason = routing["emergency_reason"]
    specialty = routing["specialty"]
    doc = routing["recommended_doctor"]
    rec_doctor = f"Dr. {doc['name']} ({doc['specialization']})" if doc else "Consulting Physician"

    lower_query = prompt.lower()

    # 1. Emergency Red Flags
    if is_emergency:
        return (
            f"### 🚨 Clinical Red Flag: Urgent Medical Evaluation Required\n\n"
            f"**Reported Presentation:** \"{prompt}\"\n\n"
            f"**Primary Warning:** {emergency_reason}\n\n"
            f"**Immediate Action Protocol:**\n"
            f"- **Emergency Responders:** Call emergency services (112 or 911) immediately or have someone transport you to the nearest emergency room.\n"
            f"- **Emergency Vitals Pass:** Open your digital Emergency Pass in the HealthTech portal so first responders can review your blood type, chronic conditions, and emergency contacts.\n"
            f"- **Do Not Drive Yourself:** Sit or lie down in a safe, comfortable position and await medical assistance.\n\n"
            f"**Assigned On-Call Specialist:** {rec_doctor} ({specialty})\n\n"
            f"*Safety Notice: HealthTech AI provides educational and clinical decision-support. Suspected emergencies require immediate in-person evaluation.*"
        )

    # 2. Nutrition & Dietary Health (e.g. Eba, Garri, Amala, Rice, Healthy Eating)
    if intent == AIConsultationSession.Category.NUTRITION_DIET or any(w in lower_query for w in ['eba', 'garri', 'fufu', 'amala', 'eat', 'diet', 'nutrition', 'rice', 'meal']):
        is_eba = 'eba' in lower_query or 'garri' in lower_query
        food_name = "Eba" if is_eba else "your requested meal"

        return (
            f"Hello! I am HealthTech AI, your clinical wellness and nutrition consultant.\n\n"
            f"### 🍲 Nutritional & Medical Assessment: {food_name}\n\n"
            f"Yes, **{food_name} can certainly be part of a healthy, balanced lifestyle**, provided you practice mindful portion control and pair it with nutrient-dense foods.\n\n"
            f"#### 1. What You Need to Know (Nutritional Profile)\n"
            f"- **Carbohydrate Density:** {food_name} is a dense source of complex carbohydrates. It provides fast, sustained energy for your daily activities.\n"
            f"- **Glycemic Impact:** Because cassava-based staples are easily broken down into glucose, eating a very large portion on its own can trigger a rapid blood sugar spike, followed by a sluggish feeling.\n"
            f"- **Fermentation Benefits:** Traditional properly fermented garri contains resistant starch, which supports gut microbiome health.\n\n"
            f"#### 2. Clinical Recommendations for a Healthier Meal\n"
            f"- **Portion Control (The Tennis Ball Rule):** Aim for a portion roughly the size of your clenched fist or a tennis ball rather than a double mound.\n"
            f"- **Power Your Soup with Greens:** Pair your {food_name} with fiber-rich vegetable soups like *efo riro*, *okra*, *bitterleaf*, or *spinach*. Dietary fiber slows glucose absorption and keeps you satisfied longer.\n"
            f"- **Include Lean Protein:** Add fish (mackerel, titus, salmon), skinless chicken, or boiled eggs to promote muscle repair and metabolic balance.\n"
            f"- **Moderate Palm Oil & Sodium:** Use moderate amounts of cooking oil and salt to protect your cardiovascular and blood pressure health.\n"
            f"- **Post-Meal Walk:** Taking a relaxed 10–15 minute walk after your meal helps your muscles utilize circulating glucose and aids digestion.\n\n"
            f"#### 3. Medical Considerations\n"
            f"- If you have **Type 2 Diabetes** or **Pre-diabetes**, monitoring portion size is essential.\n"
            f"- If you suffer from **Acid Reflux (GERD)**, avoid lying down immediately after eating heavy swallow foods.\n\n"
            f"Do you have any specific health goals, such as managing blood pressure, weight, or blood sugar? Feel free to ask, and I'll personalize this further!"
        )

    # 3. Medications & Supplements
    if intent == AIConsultationSession.Category.MEDICATION_INQUIRY:
        return (
            f"### 💊 Medication & Pharmacotherapy Guidance\n\n"
            f"**Your Inquiry:** \"{prompt}\"\n\n"
            f"#### Clinical Safety Overview\n"
            f"- **Strict Adherence:** Always take prescription medications strictly as directed by your physician or pharmacist regarding dosage, timing, and meal relation.\n"
            f"- **Food & Drug Interactions:** Certain medications (like antibiotics or blood pressure medications) interact with dairy, grapefruit, or alcohol. Always drink plenty of water.\n"
            f"- **Missed Dose Protocol:** Never take a double dose to make up for a missed tablet. Take the scheduled dose when remembered unless it is nearly time for your next dose.\n\n"
            f"If you are experiencing unexpected side effects (dizziness, nausea, skin rash), please connect with our clinic for a medication review."
        )

    # 4. Lifestyle, Sleep & Wellness
    if intent == AIConsultationSession.Category.LIFESTYLE_WELLNESS:
        return (
            f"### 🌿 Lifestyle & Preventive Health Guidance\n\n"
            f"**Your Goal:** \"{prompt}\"\n\n"
            f"#### Evidence-Based Clinical Recommendations\n"
            f"- **Circadian Sleep Hygiene:** Maintain a consistent sleep schedule (7–8 hours). Reduce blue-light exposure from screens 45 minutes before sleep.\n"
            f"- **Optimal Hydration:** Aim for 2 to 2.5 liters of clean water daily. Proper hydration supports kidney filtration, cognitive clarity, and vascular health.\n"
            f"- **Physical Movement:** Combine 150 minutes of moderate cardiovascular activity per week with light strength exercises.\n"
            f"- **Stress Regulation:** Practice slow diaphragmatic breathing (4 seconds in, 6 seconds out) to stimulate the parasympathetic nervous system."
        )

    # 5. Common Symptoms (Headache, Flu, Cough, Upset Stomach)
    if 'headache' in lower_query or 'migraine' in lower_query:
        return (
            f"### 🩺 Clinical Assessment: Headache & Discomfort\n\n"
            f"**Presentation:** \"{prompt}\"\n\n"
            f"Your presentation is consistent with a common tension or dehydration-related headache.\n\n"
            f"#### Actionable Home Relief\n"
            f"1. **Hydrate Immediately:** Drink 500ml of cool water. Dehydration is the most frequent trigger for daytime headaches.\n"
            f"2. **Dark, Quiet Rest:** Rest with your eyes closed in a dimly lit, quiet room for 20 minutes to reduce sensory strain.\n"
            f"3. **Cool Compress:** Apply a cool cloth across your forehead or temples to soothe dilated blood vessels.\n"
            f"4. **Safe OTC Options:** Paracetamol (500mg-1000mg) or Ibuprofen (with food) can provide temporary relief if you have no medical contraindications.\n\n"
            f"#### When to See a Doctor\n"
            f"- If the headache persists beyond 48 hours or progressively worsens.\n"
            f"- If accompanied by a stiff neck, high fever, or sudden changes in vision.\n\n"
            f"**Recommended Clinician:** {rec_doctor} ({specialty})"
        )

    # 6. General Health Default
    return (
        f"### 🩺 HealthTech Clinical Consultation\n\n"
        f"**Subject:** \"{prompt}\"\n\n"
        f"Thank you for reaching out to HealthTech AI. Here is an overview of what you should keep in mind:\n\n"
        f"#### Clinical Guidance\n"
        f"- Maintain adequate hydration (2–2.5 L daily) and prioritize balanced nutrition.\n"
        f"- Monitor your symptoms or wellness goals over the next 48 to 72 hours.\n"
        f"- If you feel persistent discomfort, fatigue, or illness, scheduling an encounter with a verified physician provides definitive peace of mind.\n\n"
        f"**Assigned Clinician:** {rec_doctor} ({specialty})\n\n"
        f"*HealthTech AI provides medical decision-support and educational guidance in compliance with NDPR data protection regulations.*"
    )

def call_gemini_multiturn(api_key: str, history: list, new_prompt: str, intent: str, patient_name: str = "") -> str:
    """
    Connects to Google Gemini Generative AI with conversational context and adaptive persona.
    """
    endpoints = [
        ("v1beta", "gemini-3.5-flash-lite", 15),
        ("v1beta", "gemini-3.5-flash", 15),
        ("v1beta", "gemini-3.8-flash", 15),
    ]

    system_instruction = (
        "You are HealthTech Clinical AI, an empathetic, highly qualified medical and wellness assistant on a licensed telehealth platform. "
        "Your mission is to provide intelligent, modern, compassionate, and medically sound advice to patients.\n\n"
        "CORE CLINICAL CAPABILITIES & GUIDELINES:\n"
        "1. ADAPTIVE TONE & CONVERSATION:\n"
        "   - Do NOT respond with rigid boilerplate or robotically force every message into an emergency triage schema.\n"
        "   - If a patient asks about FOOD, DIET, OR NUTRITION (e.g., eating eba, garri, amala, rice, fasting, keto, diabetic diet):\n"
        "     Give a warm, detailed, culturally competent nutritional breakdown (explain carbohydrates, glycemic index, digestion, portion size using relatable visuals like a tennis ball, healthy pairings with vegetable soups like efo riro/okra and lean proteins, and specific health alerts for diabetes/hypertension). Celebrate healthy food culture while offering medically actionable advice!\n"
        "   - If a patient describes SYMPTOMS (headache, cough, rash, fatigue):\n"
        "     Provide an empathetic clinical assessment, probable causes to discuss with a physician, practical home remedies, red flags to monitor, and when to seek clinic evaluation.\n"
        "   - If a patient describes an ACUTE EMERGENCY (severe bleeding, chest pain radiating to arm, stroke signs, unable to breathe):\n"
        "     Clearly state that this is an emergency requiring immediate ER care (call 112/911) and tell them to open their digital Emergency Pass.\n"
        "   - If a patient asks about LIFESTYLE, SLEEP, EXERCISE, or MEDICATIONS:\n"
        "     Give evidence-based lifestyle medicine guidance and safe medication precautions.\n\n"
        "2. FORMATTING:\n"
        "   - Use clean Markdown headers (###, ####), bullet points, bold key terms, and concise paragraphs.\n"
        "   - Include a concise 1-sentence medical safety disclaimer at the end.\n\n"
        f"Patient Name: {patient_name or 'Patient'}"
    )

    contents = []
    
    # Add recent history (up to last 6 messages)
    for msg in history[-6:]:
        role = "user" if msg.get("sender") == "user" else "model"
        text = msg.get("content", "").strip()
        if text:
            contents.append({
                "role": role,
                "parts": [{"text": text}]
            })

    # Add current prompt
    contents.append({
        "role": "user",
        "parts": [{"text": new_prompt}]
    })

    body = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 1024
        }
    }

    headers = {"Content-Type": "application/json"}
    last_err = None

    for version, model, timeout_sec in endpoints:
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
                last_err = f"{model} returned {resp.status_code}: {resp.text[:150]}"
        except Exception as e:
            last_err = f"{model} error: {str(e)}"
            continue

    if last_err:
        print("Gemini API notice:", last_err)
    return ""

class SymptomAnalyzeView(APIView):
    """
    Preserved for backward compatibility with existing clients and unit tests.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        symptoms = request.data.get('symptoms', '').strip()
        if not symptoms:
            return Response({"error": "Symptoms are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        gemini_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
        intent = detect_query_intent(symptoms)
        routing_metadata = get_triage_routing_metadata(symptoms)

        patient_name = request.user.get_full_name() or request.user.username
        analysis = ""

        if gemini_key:
            try:
                analysis = call_gemini_multiturn(gemini_key, [], symptoms, intent, patient_name)
            except Exception as e:
                print("Gemini API call failed:", e)

        if not analysis:
            analysis = run_clinical_heuristics(symptoms, intent, routing_metadata)

        routing_metadata = get_triage_routing_metadata(symptoms, analysis)
        return Response({
            "analysis": analysis,
            "routing": routing_metadata,
            "intent": intent
        }, status=status.HTTP_200_OK)


class AIConsultationChatView(APIView):
    """
    Modern conversational AI Consultation endpoint.
    Maintains multi-turn context, saves messages under NDPR compliance,
    and returns rich clinical, dietary, or triage insights.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_message = request.data.get('message', '').strip()
        session_id = request.data.get('session_id')

        if not user_message:
            return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Retrieve or Create Session (Strictly scoped to authenticated user)
        session = None
        if session_id:
            session = AIConsultationSession.objects.filter(id=session_id, patient=request.user).first()

        intent = detect_query_intent(user_message)
        routing_metadata = get_triage_routing_metadata(user_message)
        is_emergency = routing_metadata["is_emergency"]
        emergency_reason = routing_metadata.get("emergency_reason", "")

        if not session:
            # Generate smart initial title from query
            title_candidate = user_message[:45].strip()
            if len(user_message) > 45:
                title_candidate += "..."
            
            session = AIConsultationSession.objects.create(
                patient=request.user,
                title=title_candidate.capitalize(),
                category=intent,
                urgency=AIConsultationSession.Urgency.EMERGENCY if is_emergency else AIConsultationSession.Urgency.ROUTINE,
                is_emergency=is_emergency,
                emergency_reason=emergency_reason,
                recommended_specialty=routing_metadata.get("specialty", "General Practice")
            )
        else:
            # Update session urgency if escalated
            if is_emergency and not session.is_emergency:
                session.is_emergency = True
                session.emergency_reason = emergency_reason
                session.urgency = AIConsultationSession.Urgency.EMERGENCY
                session.save(update_fields=['is_emergency', 'emergency_reason', 'urgency', 'updated_at'])

        # 2. Save Patient Message
        AIConsultationMessage.objects.create(
            session=session,
            sender='user',
            content=user_message,
            routing_data={}
        )

        # 3. Build Conversation History for Context
        recent_messages = list(session.messages.order_by('created_at').values('sender', 'content')[:10])

        # 4. Generate AI Consultation Response
        gemini_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
        patient_name = request.user.get_full_name() or request.user.username
        ai_response = ""

        if gemini_key:
            try:
                ai_response = call_gemini_multiturn(
                    gemini_key, 
                    recent_messages, 
                    user_message, 
                    intent, 
                    patient_name
                )
            except Exception as e:
                print("Gemini consultation error:", e)

        if not ai_response:
            ai_response = run_clinical_heuristics(user_message, intent, routing_metadata)

        # Re-check routing with generated analysis
        routing_metadata = get_triage_routing_metadata(user_message, ai_response)

        # 5. Save AI Message
        AIConsultationMessage.objects.create(
            session=session,
            sender='ai',
            content=ai_response,
            routing_data=routing_metadata
        )

        # Touch session updated_at
        session.save()

        return Response({
            "session_id": str(session.id),
            "session_title": session.title,
            "category": session.category,
            "urgency": session.urgency,
            "is_emergency": session.is_emergency,
            "analysis": ai_response,
            "routing": routing_metadata
        }, status=status.HTTP_200_OK)


class AIConsultationSessionListView(APIView):
    """
    Lists all saved consultation sessions for the authenticated patient (NDPR data access).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = AIConsultationSession.objects.filter(patient=request.user)
        results = []
        for s in sessions:
            last_msg = s.messages.order_by('-created_at').first()
            results.append({
                "id": str(s.id),
                "title": s.title,
                "category": s.category,
                "urgency": s.urgency,
                "is_emergency": s.is_emergency,
                "emergency_reason": s.emergency_reason,
                "message_count": s.messages.count(),
                "preview": last_msg.content[:90] + "..." if last_msg else "",
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request):
        """
        Creates a fresh new consultation session.
        """
        title = request.data.get('title', 'New Health Consultation').strip()
        session = AIConsultationSession.objects.create(
            patient=request.user,
            title=title
        )
        return Response({
            "id": str(session.id),
            "title": session.title,
            "created_at": session.created_at.isoformat()
        }, status=status.HTTP_201_CREATED)


class AIConsultationSessionDetailView(APIView):
    """
    Retrieves, updates, or deletes a specific consultation session (NDPR Right to Erasure).
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, session_id, user):
        return AIConsultationSession.objects.filter(id=session_id, patient=user).first()

    def get(self, request, session_id):
        session = self.get_object(session_id, request.user)
        if not session:
            return Response({"error": "Consultation session not found."}, status=status.HTTP_404_NOT_FOUND)

        messages = session.messages.order_by('created_at')
        msg_list = []
        for m in messages:
            msg_list.append({
                "id": m.id,
                "role": m.sender,
                "text": m.content,
                "routing": m.routing_data if m.routing_data else None,
                "created_at": m.created_at.isoformat()
            })

        return Response({
            "id": str(session.id),
            "title": session.title,
            "category": session.category,
            "urgency": session.urgency,
            "is_emergency": session.is_emergency,
            "emergency_reason": session.emergency_reason,
            "ndpr_compliant": session.ndpr_compliant,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
            "messages": msg_list
        }, status=status.HTTP_200_OK)

    def delete(self, request, session_id):
        """
        Complies with NDPR / GDPR Right to Erasure. Permanently removes conversation.
        """
        session = self.get_object(session_id, request.user)
        if not session:
            return Response({"error": "Consultation session not found."}, status=status.HTTP_404_NOT_FOUND)

        session.delete()
        return Response({"message": "Consultation history successfully erased under NDPR privacy regulations."}, status=status.HTTP_200_OK)


# -------------------------------------------------------------
# DYNAMIC AI DAILY CLINICAL HEALTH TIPS ENGINE
# -------------------------------------------------------------

_DAILY_TIPS_CACHE = {}

AI_ROTATING_CLINICAL_TIPS = [
    {
        "id": "rot-1",
        "category": "Hydration",
        "title": "The 250ml Morning Rehydration Rule",
        "summary": "Drink a tall glass of water within 15 minutes of waking.",
        "details": "Overnight respiration and perspiration lead to subclinical dehydration. Drinking 250–300ml of water upon waking immediately reduces morning blood viscosity, stimulates glomerular filtration, and counters early cognitive fatigue.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Hydrate Now",
        "aiPrompt": "How does morning hydration affect resting heart rate and blood viscosity?"
    },
    {
        "id": "rot-2",
        "category": "Heart",
        "title": "The 10-Minute Post-Meal Ambulatory Protocol",
        "summary": "Take a light 10-minute walk right after lunch or dinner.",
        "details": "Light walking after meals stimulates GLUT4 glucose transporters in skeletal muscle without requiring excess insulin, attenuating postprandial glycemic spikes by up to 30% and supporting cardiovascular health.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Track Vitals",
        "aiPrompt": "Explain how post-meal walking manages glycemic response and cardiovascular risk."
    },
    {
        "id": "rot-3",
        "category": "Sleep",
        "title": "Circadian Sleep Cycle Alignment (The 90-Min Rule)",
        "summary": "Time your sleep in multiples of 90 minutes for effortless waking.",
        "details": "Adult sleep alternates between NREM and REM stages in ~90-minute ultradian cycles. Setting your alarm at cycle boundaries (e.g. 7.5 hours rather than 8 hours) prevents waking from deep slow-wave sleep, eliminating morning sleep inertia.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Sleep Hygiene",
        "aiPrompt": "What are the stages of sleep and how do I optimize my circadian rhythm?"
    },
    {
        "id": "rot-4",
        "category": "Ergonomics",
        "title": "The 20-20-20 Digital Vision Reset",
        "summary": "Every 20 minutes, look at an object 20 feet away for 20 seconds.",
        "details": "Screen usage reduces normal human blink frequency by 50% and locks ciliary ocular muscles. The 20-20-20 protocol restores the corneal tear film and relieves digital eye fatigue and cervical tension.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Rest Eyes",
        "aiPrompt": "How can I prevent computer vision syndrome and neck muscle strain?"
    },
    {
        "id": "rot-5",
        "category": "Mental",
        "title": "The Dual-Inhale Physiological Sigh",
        "summary": "Two quick nasal inhales followed by a long exhale resets acute stress.",
        "details": "Developed by neurophysiologists, this pattern pops open collapsed pulmonary alveoli and stimulates the vagus nerve, reducing autonomic arousal, lowering acute cortisol, and slowing pulse within 60 seconds.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Breathwork",
        "aiPrompt": "How does the physiological sigh regulate the parasympathetic nervous system?"
    },
    {
        "id": "rot-6",
        "category": "Nutrition",
        "title": "Metabolic Food Sequencing (Fiber First)",
        "summary": "Eat vegetables and proteins before refined carbohydrates.",
        "details": "Consuming dietary fiber and protein prior to carbohydrates coats the small intestine, slowing gastric emptying. This dampens insulin surges and prevents mid-afternoon energy crashes.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Nutrition Insights",
        "aiPrompt": "What is the science behind food sequencing for metabolic control?"
    },
    {
        "id": "rot-7",
        "category": "Heart",
        "title": "Potassium-to-Sodium Vascular Balance",
        "summary": "Incorporate dietary potassium to balance daily sodium intake.",
        "details": "Potassium promotes renal sodium excretion and relaxes vascular smooth muscle. Adequate daily intake from bananas, avocados, and leafy spinach helps maintain optimal blood pressure.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "BP Guidelines",
        "aiPrompt": "What role does dietary potassium play in managing hypertension?"
    },
    {
        "id": "rot-8",
        "category": "Immunity",
        "title": "Morning Sunlight & Suprachiasmatic Sync",
        "summary": "Get 10–15 minutes of outdoor light exposure within 1 hour of waking.",
        "details": "Natural lux stimulates retinal ganglion cells, synchronizing cortisol for daytime alertness while programming melatonin release 14–16 hours later for restorative deep sleep.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Immunity Boost",
        "aiPrompt": "How does morning sunlight exposure regulate endocrine and immune health?"
    },
    {
        "id": "rot-9",
        "category": "Ergonomics",
        "title": "The 45-Minute Spinal Decompression",
        "summary": "Stand and stretch your spine backward for 30 seconds every 45 minutes.",
        "details": "Prolonged sitting increases intradiscal lumbar pressure by 40%. A brief thoracic extension and pelvic tilt rehydrates spinal discs and prevents chronic back spasm.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Spinal Reset",
        "aiPrompt": "What are the best desk stretches to relieve lower back and lumbar stiffness?"
    },
    {
        "id": "rot-10",
        "category": "Nutrition",
        "title": "The Caffeine Cut-off Buffer",
        "summary": "Stop consuming caffeine at least 8 hours before your target bedtime.",
        "details": "Caffeine has a biological half-life of 5 to 7 hours. Even if you fall asleep, residual caffeine blocks adenosine receptors, truncating restorative Stage 3 slow-wave sleep.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Caffeine Guide",
        "aiPrompt": "How does caffeine metabolism affect slow-wave restorative sleep?"
    },
    {
        "id": "rot-11",
        "category": "Hydration",
        "title": "Electrolyte Balance in Tropical Climates",
        "summary": "Pair heavy water consumption with natural mineral electrolytes.",
        "details": "In warm conditions, pure water intake without electrolytes can dilute blood sodium. A pinch of mineral salt or coconut water supports cellular hydration and prevents muscle cramps.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Hydration Tips",
        "aiPrompt": "Why do electrolytes matter for physical stamina and cellular hydration?"
    },
    {
        "id": "rot-12",
        "category": "Mental",
        "title": "The 5-Minute Brain Dump Before Sleep",
        "summary": "Write down unfinished tasks on paper 30 minutes before sleep.",
        "details": "Cognitive studies demonstrate that externalizing tomorrow's tasks significantly reduces cognitive rumination and reduces sleep latency by up to 37%.",
        "clinicianVerified": "HealthTech Gemini AI Clinical Engine",
        "actionText": "Mental Focus",
        "aiPrompt": "How does expressive writing decrease presleep cognitive arousal?"
    }
]

def generate_gemini_smart_tips(api_key: str) -> list:
    """
    Queries Google Gemini to dynamically generate 8 fresh clinical health & wellness tips.
    """
    import json
    endpoints = [
        ("v1beta", "gemini-2.5-flash-lite", 12),
        ("v1beta", "gemini-2.5-flash", 12),
    ]

    prompt = (
        "Generate exactly 8 fresh, diverse, scientifically sound daily health and wellness tips for patients. "
        "Cover varied categories: 'Heart', 'Hydration', 'Sleep', 'Nutrition', 'Ergonomics', 'Mental', 'Immunity'. "
        "Return ONLY a valid JSON array of objects with these keys: "
        "'id' (string, e.g. 'ai-tip-1'), 'category' (one of the categories), 'title' (punchy, 4-8 words), "
        "'summary' (1 crisp sentence), 'details' (2-3 sentences explaining the medical/biological rationale in clear language), "
        "'clinicianVerified' ('HealthTech Gemini AI Clinical Engine'), 'actionText' (2-3 words button text), 'aiPrompt' (a clinical question). "
        "Do NOT return markdown backticks or explanations. Return pure JSON array."
    )

    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}
    }
    headers = {"Content-Type": "application/json"}

    for version, model, timeout_sec in endpoints:
        url = f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, json=body, headers=headers, timeout=timeout_sec)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = data.get("candidates", [])[0]["content"]["parts"][0].get("text", "")
                cleaned = raw_text.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                elif cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
                parsed = json.loads(cleaned)
                if isinstance(parsed, list) and len(parsed) >= 4:
                    return parsed
        except Exception as e:
            print(f"[SmartTips] Gemini {model} error: {e}")
            continue
    return []

def get_ai_daily_tips(force_refresh: bool = False, category: str = "") -> list:
    """
    Returns dynamic AI clinical tips. Caches daily; generates fresh via Gemini on refresh or date change.
    """
    import random
    from datetime import datetime
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    cache_key = f"{today_str}_{category}"

    if not force_refresh and cache_key in _DAILY_TIPS_CACHE:
        return _DAILY_TIPS_CACHE[cache_key]

    gemini_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
    ai_tips = []

    if gemini_key:
        try:
            ai_tips = generate_gemini_smart_tips(gemini_key)
        except Exception as e:
            print("[SmartTips] Generation failed:", e)

    if not ai_tips:
        # Seeded daily rotation so every new day automatically delivers a fresh set
        day_seed = int(today_str.replace("-", ""))
        rng = random.Random(day_seed if not force_refresh else None)
        shuffled = AI_ROTATING_CLINICAL_TIPS.copy()
        rng.shuffle(shuffled)
        ai_tips = shuffled[:8]

    if category and category.lower() != "all":
        filtered = [t for t in ai_tips if t.get("category", "").lower() == category.lower()]
        if filtered:
            ai_tips = filtered

    _DAILY_TIPS_CACHE[cache_key] = ai_tips
    return ai_tips


class SmartHealthTipsView(APIView):
    """
    Public API delivering dynamic, changing AI-generated daily clinical tips.
    Supports ?refresh=1 for generating new tips on demand.
    """
    permission_classes = []

    def get(self, request):
        import datetime
        refresh = request.query_params.get('refresh', '').lower() in ['1', 'true', 'yes']
        category = request.query_params.get('category', '').strip()
        tips = get_ai_daily_tips(force_refresh=refresh, category=category)
        return Response({
            "date": datetime.datetime.utcnow().strftime("%Y-%m-%d"),
            "count": len(tips),
            "source": "HealthTech Gemini AI Clinical Engine",
            "tips": tips
        }, status=status.HTTP_200_OK)
