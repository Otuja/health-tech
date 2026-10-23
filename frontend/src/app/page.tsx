"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  HeartPulse, 
  ShieldCheck, 
  Calendar, 
  Stethoscope, 
  Activity, 
  ArrowRight,
  CheckCircle2,
  Lock,
  QrCode,
  Bot,
  FileText,
  Clock,
  Sparkles,
  PhoneCall,
  ChevronRight,
  Award,
  Users
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white overflow-x-hidden w-full">
      {/* TOP NOTIFICATION BAR */}
      <div className="bg-emerald-950 text-emerald-200 text-[11px] sm:text-xs py-2 px-3 sm:px-4 text-center font-medium border-b border-emerald-900/60 flex items-center justify-center gap-1.5 sm:gap-2 leading-tight">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
        <span>NDPR Certified Healthcare Cloud • 24/7 First Responder & Paramedic Emergency Pass Integration</span>
      </div>

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-xl text-slate-900 tracking-tight flex items-center">
                Health<span className="text-emerald-600">Tech</span>
              </span>
              <span className="block text-[10px] uppercase font-bold tracking-widest text-emerald-700 -mt-1">
                Life & Vital Care
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#services" className="hover:text-emerald-600 transition-colors">Specialties</a>
            <a href="#emergency" className="hover:text-emerald-600 transition-colors flex items-center gap-1.5">
              <span>Emergency QR Pass</span>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">24/7</span>
            </a>
            <a href="#ehr" className="hover:text-emerald-600 transition-colors">Patient EHR</a>
            <a href="#triage" className="hover:text-emerald-600 transition-colors">AI Health Triage</a>
            <a href="#doctors" className="hover:text-emerald-600 transition-colors">Our Clinicians</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link 
              href="/login" 
              className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-emerald-700 px-2.5 sm:px-3.5 py-1.5 sm:py-2 transition-colors rounded-xl hover:bg-emerald-50"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="bg-emerald-600 text-white text-xs sm:text-sm font-semibold py-2 sm:py-2.5 px-3.5 sm:px-5 rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1 sm:gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 pb-14 sm:pb-24 overflow-hidden bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Next-Generation Unified Clinical Telemedicine</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-slate-950 tracking-tight leading-[1.15] sm:leading-[1.1]">
                Empowering Life Through <span className="text-emerald-600 underline decoration-emerald-300 decoration-wavy decoration-2">Compassionate</span> Digital Healthcare.
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-xl leading-relaxed">
                Connect directly with certified specialists, manage your unified Electronic Health Records (EHR), and protect your loved ones with an instant first-responder Emergency QR vitals pass.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link 
                  href="/login" 
                  className="bg-emerald-600 text-white text-xs sm:text-sm font-bold py-3 sm:py-3.5 px-6 sm:px-8 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 hover:scale-[1.02] text-center"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Doctor Appointment</span>
                </Link>

                <Link 
                  href="/register" 
                  className="bg-white text-slate-800 border border-slate-300 text-xs sm:text-sm font-bold py-3 sm:py-3.5 px-6 sm:px-7 rounded-2xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2 text-center"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Upload EHR & Records</span>
                </Link>
              </div>

              {/* Clinical Trust & Compliance Badges */}
              <div className="pt-6 sm:pt-8 border-t border-slate-200/90 grid grid-cols-3 gap-2 sm:gap-4 text-left max-w-lg">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-heading">100%</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">NDPR Data Privacy</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 font-heading">&lt; 3 Sec</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">Emergency QR Scan</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-heading">24/7</div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">Telehealth Coverage</div>
                </div>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[4/3] lg:aspect-[1/1] bg-emerald-900">
                <Image 
                  src="/images/hero_doctor_green.jpg" 
                  alt="Professional Consultant Cardiologist with Tablet" 
                  fill
                  className="object-cover"
                  priority
                />
                
                {/* Floating Vitals Badge */}
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                      <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">Dr. Sarah Connor, MD</p>
                      <p className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold truncate">Consultant Cardiologist • Active</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 animate-ping flex-shrink-0 ml-2" />
                </div>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
            </div>

          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES SECTION */}
      <section id="services" className="py-14 sm:py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Complete Healthcare Platform
            </span>
            <h2 className="text-2xl sm:text-4xl font-heading font-extrabold text-slate-900 tracking-tight mt-3">
              Designed For Life, Built For Healthcare Precision
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              From appointment scheduling and electronic medical records to instant first-responder triage, HealthTech unifies your medical journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Feature 1: Clinical Telehealth */}
            <div className="bg-slate-50 hover:bg-emerald-50/40 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/90 transition-all hover:shadow-lg hover:border-emerald-200 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 mb-6 group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-950 font-heading">
                  Verified Specialist Appointments
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
                  Book direct consultations with licensed cardiologists, pulmonologists, and trauma physicians. Real-time slot locking guarantees zero double-bookings.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 flex items-center text-xs font-bold text-emerald-700 gap-1.5">
                <Link href="/login" className="flex items-center gap-1 hover:gap-2 transition-all">
                  <span>Browse Specialist Availability</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Feature 2: Patient EHR & Uploads */}
            <div className="bg-slate-50 hover:bg-emerald-50/40 p-8 rounded-3xl border border-slate-200/90 transition-all hover:shadow-lg hover:border-emerald-200 flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20 mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-950 font-heading">
                  Patient Health Records & EHR
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
                  Centralize your blood panels, laboratory tests, chest X-rays, and prescription history. Fully encrypted and accessible only by you and your authorized physicians.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 flex items-center text-xs font-bold text-emerald-700 gap-1.5">
                <Link href="/login" className="flex items-center gap-1 hover:gap-2 transition-all">
                  <span>Upload & View Medical History</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Feature 3: Emergency QR Pass */}
            <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white p-8 rounded-3xl border border-emerald-900/80 shadow-xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
              <div>
                <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 mb-6 group-hover:scale-110 transition-transform">
                  <QrCode className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white font-heading">
                  Paramedic Emergency Pass
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2.5 leading-relaxed">
                  In critical accidents or medical trauma, first responders can scan your physical QR code or wristband to immediately view blood group, severe allergies, and tap to call contacts.
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex items-center text-xs font-bold text-emerald-400 gap-1.5">
                <Link href="/emergency/8539b970-0c48-4fcb-a682-80183d63bffd" target="_blank" className="flex items-center gap-1 hover:gap-2 transition-all">
                  <span>View Live Paramedic Demo</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* EMERGENCY & FIRST RESPONDER SHOWCASE */}
      <section id="emergency" className="py-16 sm:py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-12 items-center">
            
            {/* Left Image Column */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 aspect-[16/10]">
                <Image 
                  src="/images/emergency_hero_green.jpg" 
                  alt="Paramedics using Emergency Pass" 
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-slate-900/90 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-red-400 block">Critical Emergency Action</span>
                    <span className="font-semibold text-slate-200 text-[11px] sm:text-xs">NDPR Section 2.1 Vital Interests Exemption</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex-shrink-0 ml-2">Live Rescue</span>
                </div>
              </div>
            </div>

            {/* Right Text Column */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3.5 py-1 rounded-full border border-emerald-800">
                Lifesaving Emergency Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
                When Seconds Count, Information Saves Lives.
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Hospital emergency departments and paramedics waste critical minutes identifying blood groups and medication allergies. With HealthTech, every registered citizen possesses a personal medical pass accessible without password barriers in life-threatening scenarios.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Instant blood group & genotype display for blood transfusion prep.",
                  "High-priority severe allergy warnings (Penicillin, NSAIDs, Latex).",
                  "One-touch instant phone dialing for registered spouses & guardians.",
                  "Accessible on any smartphone camera without app installation."
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link
                  href="/emergency/8539b970-0c48-4fcb-a682-80183d63bffd"
                  target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Test Scan Paramedic View</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PATIENT EHR & CLINICAL CARE SECTION */}
      <section id="ehr" className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-12 items-center">
            
            {/* Left Text */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                Patient Electronic Health Record (EHR)
              </span>
              <h2 className="text-2xl sm:text-4xl font-heading font-extrabold text-slate-950 tracking-tight">
                Your Complete Medical Biography in One Secure Vault.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                No more lost paper files, forgotten prescriptions, or repeating blood tests across different clinics. Easily upload lab sheets, diagnostic imaging reports, and vaccination certificates.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-sm">Laboratory Results</h4>
                  <p className="text-xs text-slate-500 mt-1">Full Blood Count, lipid profiles, HbA1c, and metabolic screenings.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-sm">Radiology Scans</h4>
                  <p className="text-xs text-slate-500 mt-1">Ultrasounds, chest X-rays, MRI scans, and cardiac echocardiograms.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-sm">Hospital Summaries</h4>
                  <p className="text-xs text-slate-500 mt-1">Discharge notes, operative summaries, and past diagnoses.</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-sm">Digital Prescriptions</h4>
                  <p className="text-xs text-slate-500 mt-1">Dosage schedules and clinical instructions directly from doctors.</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <span>Access Your Health Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Image */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[16/10] bg-emerald-900">
                <Image 
                  src="/images/doctor_consult_green.jpg" 
                  alt="Doctor consulting with patient in modern green clinic" 
                  fill
                  className="object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* MEET OUR CLINICIANS */}
      <section id="doctors" className="py-14 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full border border-emerald-200">
                Accredited Medical Faculty
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight mt-2">
                Certified Doctors Ready To Care For You
              </h2>
            </div>
            <Link 
              href="/login" 
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>View All 12+ Medical Specialties</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            
            {/* Doctor 1 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    SC
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Dr. Sarah Connor, MD</h3>
                    <span className="text-xs font-semibold text-emerald-700">Consultant Cardiologist</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Specializing in hypertension management, arrhythmia, and preventive cardiovascular wellness.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Next Available: Tomorrow at 10:00 AM</span>
                </div>
              </div>
              <Link
                href="/login"
                className="mt-6 w-full py-2.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-bold rounded-xl transition-all text-center block"
              >
                Book Appointment
              </Link>
            </div>

            {/* Doctor 2 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                    BA
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Dr. Babatunde Adeleke</h3>
                    <span className="text-xs font-semibold text-blue-700">Emergency & Trauma Medicine</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Head of Acute Medical Services at LUTH with 14+ years managing acute medical triage.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Next Available: Daily Emergency On-Call</span>
                </div>
              </div>
              <Link
                href="/login"
                className="mt-6 w-full py-2.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-bold rounded-xl transition-all text-center block"
              >
                Book Appointment
              </Link>
            </div>

            {/* Doctor 3 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                    AB
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Dr. Amina Bello</h3>
                    <span className="text-xs font-semibold text-purple-700">Consultant Pulmonologist</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Specialist in asthma therapy, chronic respiratory conditions, and post-viral recovery care.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Next Available: Thursday at 2:30 PM</span>
                </div>
              </div>
              <Link
                href="/login"
                className="mt-6 w-full py-2.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-bold rounded-xl transition-all text-center block"
              >
                Book Appointment
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-white py-10 sm:py-14 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="font-heading font-extrabold text-lg text-white">HealthTech</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Nigeria&apos;s NDPR-compliant intelligent digital health ecosystem. Connecting patients, clinicians, and first responders to save lives.
            </p>
            <div className="text-[11px] text-emerald-400 font-semibold">
              Emergency Dispatch & Clinical Helpdesk: +234 800-HEALTHTECH
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Portals</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Patient Portal</Link></li>
              <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Doctor Clinician Portal</Link></li>
              <li><Link href="/emergency/8539b970-0c48-4fcb-a682-80183d63bffd" target="_blank" className="hover:text-emerald-400 transition-colors">Paramedic Scan Demo</Link></li>
              <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Hospital Admin</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Compliance & Privacy</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><span className="hover:text-emerald-400">NDPR Section 2.1 Compliant</span></li>
              <li><span className="hover:text-emerald-400">AES-256 Medical Encryption</span></li>
              <li><span className="hover:text-emerald-400">Audit Logging & Access Trails</span></li>
              <li><span className="hover:text-emerald-400">WHO IHR Certification</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-slate-900 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} HealthTech Platform Inc. Built with green life & vitality.
        </div>
      </footer>
    </div>
  );
}
