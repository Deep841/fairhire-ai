import { Link } from "react-router-dom";
import {
  Sparkles, ShieldCheck, BarChart2, ArrowRight,
  Briefcase, CheckCircle2, Star,
  Upload, Brain, Trophy, ChevronRight, Mail,
} from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    color: "bg-blue-50 text-blue-600",
    title: "AI-Powered Resume Scoring",
    desc: "Gemini AI reads every resume and scores candidates on skills, experience, impact, and semantic fit — in seconds.",
  },
  {
    icon: BarChart2,
    color: "bg-purple-50 text-purple-600",
    title: "Visual Hiring Pipeline",
    desc: "Kanban board tracks every candidate from Applied → Offered. Bulk shortlist, send tests, schedule interviews in one click.",
  },
  {
    icon: ShieldCheck,
    color: "bg-green-50 text-green-600",
    title: "Bias-Free Shortlisting",
    desc: "Structured scoring criteria ensure every candidate is evaluated on merit. No gut-feel, no unconscious bias.",
  },
  {
    icon: Mail,
    color: "bg-amber-50 text-amber-600",
    title: "Automated Notifications",
    desc: "Candidates get instant emails — application received, interview scheduled, offer letter — all auto-sent via Gmail.",
  },
  {
    icon: Briefcase,
    color: "bg-rose-50 text-rose-600",
    title: "One-Click Job Publishing",
    desc: "Post to LinkedIn, Naukri, and X/Twitter simultaneously. Auto-create Google Forms for candidate intake.",
  },
  {
    icon: Sparkles,
    color: "bg-indigo-50 text-indigo-600",
    title: "AI Offer Letter Drafting",
    desc: "Gemini drafts personalised offer letters for each candidate. HR reviews and sends with one click.",
  },
];

const STEPS = [
  {
    num: "01",
    icon: Briefcase,
    title: "Create & Publish Job",
    desc: "Write your JD, publish to LinkedIn / Naukri / X, and get a Google Form for applications — all in under 2 minutes.",
  },
  {
    num: "02",
    icon: Upload,
    title: "Upload Resumes",
    desc: "Drop PDF/DOCX resumes. AI parses, scores, and ranks every candidate against your JD automatically.",
  },
  {
    num: "03",
    icon: Trophy,
    title: "Hire the Best",
    desc: "Review ranked candidates, shortlist, send assessments, schedule interviews, and send offers — all from one dashboard.",
  },
];

const STATS = [
  { value: "10x", label: "Faster screening" },
  { value: "90%", label: "Reduction in manual work" },
  { value: "AI", label: "Gemini-powered scoring" },
  { value: "100%", label: "Bias-free evaluation" },
];

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    role: "HR Manager, TechCorp",
    text: "FairHire AI cut our screening time from 3 days to 3 hours. The AI scores are surprisingly accurate.",
    stars: 5,
  },
  {
    name: "Rahul Mehta",
    role: "Talent Lead, StartupXYZ",
    text: "The pipeline view is exactly what we needed. No more spreadsheets, no more missed follow-ups.",
    stars: 5,
  },
  {
    name: "Anita Verma",
    role: "Recruiter, MNC India",
    text: "Auto-generated offer letters alone save me 30 minutes per hire. Absolutely love this tool.",
    stars: 5,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 rounded-xl p-1.5">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">FairHire AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link to="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              Get started free <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 pt-20 pb-28">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Google Gemini AI
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Hire smarter,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              not harder.
            </span>
          </h1>
          <p className="mt-6 text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
            FairHire AI automates resume screening, candidate ranking, interview scheduling,
            and offer letters — so your HR team focuses on people, not paperwork.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:-translate-y-0.5">
              Start hiring for free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-gray-200 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              See how it works
            </a>
          </div>
          <div className="mt-12 flex items-center justify-center gap-6 flex-wrap">
            {["No credit card required", "Setup in 2 minutes", "Free to use"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-sm text-gray-500">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-blue-600 py-14">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-extrabold text-white">{value}</p>
              <p className="mt-1 text-sm font-medium text-blue-200">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything your HR team needs</h2>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
              From job posting to offer letter — one platform, zero spreadsheets.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <div className={`inline-flex p-3 rounded-xl ${color} mb-4`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Up and running in minutes</h2>
            <p className="mt-4 text-lg text-gray-500">Three steps to your next great hire.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-blue-200 to-indigo-200" />
            {STEPS.map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="relative text-center">
                <div className="inline-flex flex-col items-center">
                  <div className="relative mb-5">
                    <div className="h-20 w-20 rounded-2xl bg-white border-2 border-blue-100 shadow-sm flex items-center justify-center">
                      <Icon className="h-8 w-8 text-blue-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {num.slice(1)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Loved by HR teams</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text, stars }) => (
              <div key={name} className="p-6 rounded-2xl border border-gray-100 bg-slate-50">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-5">"{text}"</p>
                <div>
                  <p className="text-sm font-bold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to transform your hiring?
          </h2>
          <p className="text-blue-100 text-lg mb-10">
            Join HR teams using FairHire AI to hire faster, fairer, and smarter.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-blue-700 text-base font-bold hover:bg-blue-50 shadow-xl transition-all hover:-translate-y-0.5">
            Get started free <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 rounded-xl p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-white">FairHire AI</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} FairHire AI. Built for modern HR teams.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
