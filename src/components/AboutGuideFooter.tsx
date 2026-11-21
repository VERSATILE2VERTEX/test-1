import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUp,
  Check,
  ClipboardList,
  Copy,
  Flame,
  HeartHandshake,
  Mail,
  PackageCheck,
  Phone,
  PlusCircle,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react';
import { Locale, ViewTab } from '../types';
import { LiquidGlassCard, SPRING_SNAPPY, WaterRippleButton } from './MotionPrimitives';
import { soundEngine } from '../utils/soundEngine';

interface AboutGuideFooterProps {
  locale: Locale;
  reducedMotion?: boolean;
  onNavigate: (tab: ViewTab) => void;
  onOpenAddStock: () => void;
  onReplayIntro: () => void;
}

const CREATOR_EMAIL = 'shirshawrajb@gmail.com';
const CREATOR_PHONE = '01892572942';

export const AboutGuideFooter: React.FC<AboutGuideFooterProps> = ({
  locale,
  reducedMotion = false,
  onNavigate,
  onOpenAddStock,
  onReplayIntro,
}) => {
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | null>(null);
  const [senderName, setSenderName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const sentTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      if (sentTimerRef.current) window.clearTimeout(sentTimerRef.current);
    };
  }, []);

  const handleCopy = async (field: 'email' | 'phone', value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement('textarea');
        area.value = value;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
    } catch {
      // Clipboard fallback ignored if blocked
    }

    if (field === 'email') {
      soundEngine.playChime();
    } else {
      soundEngine.playToggle(true);
    }

    setCopiedField(field);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopiedField(null), 2200);
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      soundEngine.playWasteThud();
      return;
    }
    soundEngine.playChime();
    setFeedbackSent(true);
    setMessageText('');
    setSenderName('');
    if (sentTimerRef.current) window.clearTimeout(sentTimerRef.current);
    sentTimerRef.current = window.setTimeout(() => setFeedbackSent(false), 3800);
  };

  const handleBackToTop = () => {
    soundEngine.playWhoosh();
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const capabilities = [
    {
      num: '01',
      icon: PackageCheck,
      cardClass: 'bg-[#EEF6FF]/90 border-sky-200/80 hover:border-sky-300',
      iconColor: 'text-sky-700',
      title: locale === 'bn' ? 'স্মার্ট ইনভেন্টরি ট্র্যাকিং' : 'Smart Inventory Tracking',
      desc:
        locale === 'bn'
          ? 'স্টক ব্যাচ, পরিমাণ, মেয়াদের সময়সীমা ও মোট মূল্য রিয়েল-টাইমে দেখুন।'
          : 'Monitor stock batches, portions, freshness windows, and total portfolio value in real time.',
      onClick: () => {
        soundEngine.playClick();
        onNavigate('inventory');
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      },
    },
    {
      num: '02',
      icon: HeartHandshake,
      cardClass: 'bg-[#E9F9EE]/90 border-emerald-200/80 hover:border-emerald-300',
      iconColor: 'text-emerald-700',
      title:
        locale === 'bn' ? 'উদ্বৃত্ত ও মেয়াদোত্তীর্ণ উদ্ধার' : 'Surplus & Near-Expiry Rescue',
      desc:
        locale === 'bn'
          ? 'ঝুঁকিপূর্ণ পণ্য দ্রুত চিহ্নিত করে ছাড়ে, স্টাফ মিল বা দানে পাঠিয়ে অর্থ বাঁচান।'
          : 'Identify at-risk items early and divert them into Rescue channels before they spoil, tracking saved portions and value.',
      onClick: () => {
        soundEngine.playClick();
        onNavigate('rescue');
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      },
    },
    {
      num: '03',
      icon: PlusCircle,
      cardClass: 'bg-[#F3EEFE]/90 border-violet-200/80 hover:border-violet-300',
      iconColor: 'text-violet-700',
      title: locale === 'bn' ? 'দ্রুত স্টক এন্ট্রি (+ Add Stock)' : 'Fast Stock Entry (+ Add Stock)',
      desc:
        locale === 'bn'
          ? 'কয়েক সেকেন্ডে নতুন সরবরাহ যোগ করুন এবং তাৎক্ষণিকভাবে সব চার্টে পরিবর্তন দেখুন।'
          : 'Log incoming supplies and batches in seconds with instant updates across all charts and metrics.',
      onClick: () => {
        soundEngine.playClick();
        onOpenAddStock();
      },
    },
    {
      num: '04',
      icon: ClipboardList,
      cardClass: 'bg-[#FEF7E0]/90 border-amber-200/80 hover:border-amber-300',
      iconColor: 'text-amber-700',
      title: locale === 'bn' ? 'অপচয় লগ ও বিশ্লেষণ' : 'Waste Logging & Insights',
      desc:
        locale === 'bn'
          ? 'কারণ ট্যাগ ও ভিজ্যুয়াল গ্রাফের মাধ্যমে অনিবার্য অপচয় লিখে ভবিষ্যৎ ক্ষতি কমান।'
          : 'Record unavoidable waste with clear reason tags and visual trend graphs to reduce future loss.',
      onClick: () => {
        soundEngine.playClick();
        onNavigate('waste');
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      },
    },
  ];

  const year = new Date().getFullYear();

  return (
    <motion.footer
      id="about-khadok-guide"
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="mt-12 pt-4"
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* LEFT: Detailed Platform Overview ("What This Website Is About") */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.32, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
          className="xl:col-span-7 flex"
        >
          <LiquidGlassCard
            variant="panel"
            reducedMotion={reducedMotion}
            className="squircle-28 p-6 sm:p-7 flex flex-col justify-between w-full overflow-hidden border border-[#92E634]/35"
          >
            <div>
              {/* Header & Mission */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/70">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#3F6212]">
                    {locale === 'bn' ? 'প্ল্যাটফর্ম পরিচিতি' : 'About The Platform'}
                  </p>
                  <h2 className="mt-1 font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] text-balance">
                    {locale === 'bn'
                      ? 'এই ওয়েবসাইট কী এবং কীভাবে কাজ করে'
                      : 'What This Website Is About'}
                  </h2>
                </div>

                <WaterRippleButton
                  type="button"
                  soundType="whoosh"
                  reducedMotion={reducedMotion}
                  onClick={() => {
                    soundEngine.playGlassPop();
                    onReplayIntro();
                  }}
                  className="glass-lime-accent px-4 py-2 rounded-full text-xs font-bold text-[#0F172A] cursor-pointer whitespace-nowrap shrink-0 w-fit"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{locale === 'bn' ? 'ইন্ট্রো পুনরায় দেখুন' : 'Replay Intro'}</span>
                </WaterRippleButton>
              </div>

              <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                {locale === 'bn'
                  ? 'রিয়েল-টাইম ইনভেন্টরি বুদ্ধিমত্তা, দ্রুত উদ্বৃত্ত উদ্ধার এবং স্পষ্ট বিশ্লেষণের মাধ্যমে খাদ্য ও পণ্যের অপচয় শূন্যের কোঠায় নামিয়ে আনতে এই প্ল্যাটফর্ম তৈরি করা হয়েছে—যাতে প্রতিটি কিচেন ও টিম প্রতিটি ব্যাচ ট্র্যাক করে মেয়াদ শেষের আগেই মূল্য বাঁচাতে এবং সঠিক সিদ্ধান্ত নিতে পারে।'
                  : 'Built to eliminate food and stock waste through real-time inventory intelligence, rapid surplus rescue, and clear analytics—helping kitchens, stores, and teams track every item, save value before spoilage, and make smarter restocking decisions.'}
              </p>

              {/* 4 Interactive Capability Glass Mini-Cards */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {capabilities.map((cap, idx) => {
                  const Icon = cap.icon;
                  return (
                    <motion.button
                      key={cap.num}
                      type="button"
                      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{
                        duration: 0.26,
                        delay: reducedMotion ? 0 : 0.06 + idx * 0.04,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      whileHover={!reducedMotion ? { y: -3, scale: 1.01 } : undefined}
                      whileTap={!reducedMotion ? { scale: 0.98 } : undefined}
                      onMouseEnter={() => soundEngine.playTick(idx * 35)}
                      onClick={cap.onClick}
                      className={`group text-left rounded-2xl border p-4 transition-colors cursor-pointer shadow-[0_8px_20px_-16px_rgba(15,23,42,0.12)] ${cap.cardClass}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <motion.span
                          whileHover={!reducedMotion ? { rotate: -8, scale: 1.12 } : undefined}
                          transition={SPRING_SNAPPY}
                          className="w-9 h-9 rounded-xl bg-white/95 border border-white flex items-center justify-center shadow-xs"
                        >
                          <Icon className={`w-4 h-4 ${cap.iconColor}`} />
                        </motion.span>
                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                          {cap.num}
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-[#0F172A] leading-snug">
                        {cap.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Subtle Animated Liquid Wave Accent along Bottom Edge */}
            <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Flame className="w-3.5 h-3.5 text-[#3F6212]" />
                <span>
                  {locale === 'bn'
                    ? 'মজুদ, উদ্ধার ও অপচয় — সব ডেটা তাৎক্ষণিকভাবে সিঙ্ক হয়'
                    : 'Inventory, Rescue, Waste & Add Stock — always synced'}
                </span>
              </div>

              <svg
                viewBox="0 0 120 20"
                className="w-24 h-5 overflow-visible shrink-0 hidden sm:block"
                aria-hidden="true"
              >
                <motion.path
                  d="M2 12 C 18 3, 30 18, 48 10 C 64 3, 78 17, 96 8 C 106 4, 114 9, 118 6"
                  fill="none"
                  stroke="#92E634"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  initial={reducedMotion ? false : { pathLength: 0.25, opacity: 0.6 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                />
                <circle cx="118" cy="6" r="2.8" fill="#16A34A" />
              </svg>
            </div>
          </LiquidGlassCard>
        </motion.div>

        {/* RIGHT: Creator & Direct Contact Liquid Glass Card (Vertex) */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.32, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="xl:col-span-5 flex"
        >
          <LiquidGlassCard
            variant="panel"
            reducedMotion={reducedMotion}
            className="squircle-28 p-6 sm:p-7 flex flex-col justify-between w-full overflow-hidden border border-slate-200/90"
          >
            <div>
              {/* Creator Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200/70">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {locale === 'bn' ? 'নির্মাতা ও সরাসরি যোগাযোগ' : 'Creator & Direct Contact'}
                  </p>
                  <div className="mt-1 flex items-center gap-2.5">
                    <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
                      Vertex
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#92E634]/25 border border-[#92E634]/60 text-[11px] font-bold text-[#1A2E05]">
                      <Sparkles className="w-3 h-3" />
                      <span>{locale === 'bn' ? 'সক্রিয়' : 'Direct'}</span>
                    </span>
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileHover={!reducedMotion ? { y: -2, scale: 1.05 } : undefined}
                  whileTap={!reducedMotion ? { scale: 0.94 } : undefined}
                  transition={SPRING_SNAPPY}
                  onClick={handleBackToTop}
                  aria-label="Back to Top"
                  className="glass-pill-cell inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#0F172A] hover:border-[#92E634] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>{locale === 'bn' ? 'উপরে যান' : 'Back to Top'}</span>
                </motion.button>
              </div>

              {/* Direct Email & Phone Rows with One-Click Copy */}
              <div className="mt-4 space-y-2.5">
                {/* Email Row */}
                <div className="rounded-2xl bg-white/85 border border-slate-200/85 p-3 flex items-center justify-between gap-2">
                  <a
                    href={`mailto:${CREATOR_EMAIL}`}
                    onClick={() => soundEngine.playClick()}
                    className="flex items-center gap-2.5 min-w-0 group"
                  >
                    <motion.span
                      whileHover={!reducedMotion ? { rotate: -8, scale: 1.08 } : undefined}
                      className="w-9 h-9 rounded-xl bg-[#EEF6FF] border border-sky-200/80 flex items-center justify-center shrink-0"
                    >
                      <Mail className="w-4 h-4 text-sky-700" />
                    </motion.span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {locale === 'bn' ? 'ইমেইল' : 'Email'}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-[#0F172A] group-hover:text-sky-700 truncate transition-colors">
                        {CREATOR_EMAIL}
                      </p>
                    </div>
                  </a>

                  <motion.button
                    type="button"
                    whileHover={!reducedMotion ? { scale: 1.04 } : undefined}
                    whileTap={!reducedMotion ? { scale: 0.94 } : undefined}
                    onClick={() => handleCopy('email', CREATOR_EMAIL)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                      copiedField === 'email'
                        ? 'bg-[#92E634] text-[#0F172A]'
                        : 'bg-slate-100 hover:bg-[#92E634]/35 text-slate-700'
                    }`}
                  >
                    {copiedField === 'email' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'কপি ইমেইল' : 'Copy Email'}</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Phone Row */}
                <div className="rounded-2xl bg-white/85 border border-slate-200/85 p-3 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${CREATOR_PHONE}`}
                    onClick={() => soundEngine.playClick()}
                    className="flex items-center gap-2.5 min-w-0 group"
                  >
                    <motion.span
                      whileHover={!reducedMotion ? { rotate: 10, scale: 1.08 } : undefined}
                      className="w-9 h-9 rounded-xl bg-[#E9F9EE] border border-emerald-200/80 flex items-center justify-center shrink-0"
                    >
                      <Phone className="w-4 h-4 text-emerald-700" />
                    </motion.span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {locale === 'bn' ? 'সরাসরি ফোন' : 'Phone / Direct Line'}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-[#0F172A] group-hover:text-emerald-700 tabular-nums transition-colors">
                        {CREATOR_PHONE}
                      </p>
                    </div>
                  </a>

                  <motion.button
                    type="button"
                    whileHover={!reducedMotion ? { scale: 1.04 } : undefined}
                    whileTap={!reducedMotion ? { scale: 0.94 } : undefined}
                    onClick={() => handleCopy('phone', CREATOR_PHONE)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                      copiedField === 'phone'
                        ? 'bg-[#92E634] text-[#0F172A]'
                        : 'bg-slate-100 hover:bg-[#92E634]/35 text-slate-700'
                    }`}
                  >
                    {copiedField === 'phone' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'কপি নম্বর' : 'Copy Number'}</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Quick Message / Feedback Mini-Form */}
              <form
                onSubmit={handleSendFeedback}
                className="mt-4 rounded-2xl bg-slate-50/85 border border-slate-200/80 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F172A]">
                    {locale === 'bn' ? 'দ্রুত বার্তা / মতামত পাঠান' : 'Quick Message / Feedback'}
                  </span>
                  <a
                    href={`mailto:${CREATOR_EMAIL}?subject=${encodeURIComponent('KHADOK Inquiry')}`}
                    onClick={() => soundEngine.playTick()}
                    className="text-[11px] font-semibold text-slate-500 hover:text-[#0F172A] underline underline-offset-2"
                  >
                    {locale === 'bn' ? 'ইমেইল অ্যাপে খুলুন' : 'Open Mail App'}
                  </a>
                </div>

                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder={locale === 'bn' ? 'আপনার নাম বা ইমেইল' : 'Your name or email'}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0F172A]"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      locale === 'bn'
                        ? 'মতামত বা জিজ্ঞাসা লিখুন...'
                        : 'Write a quick note or question...'
                    }
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0F172A]"
                  />
                  <motion.button
                    type="submit"
                    whileHover={!reducedMotion ? { scale: 1.04 } : undefined}
                    whileTap={!reducedMotion ? { scale: 0.94 } : undefined}
                    className="glass-lime-accent inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#0F172A] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>{locale === 'bn' ? 'পাঠান' : 'Send'}</span>
                  </motion.button>
                </div>

                <AnimatePresence>
                  {feedbackSent && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[11px] font-bold text-[#15803D] flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {locale === 'bn'
                          ? 'আপনার বার্তা Vertex-এর জন্য সংরক্ষিত হয়েছে!'
                          : 'Note received! You can also reach Vertex directly above.'}
                      </span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </form>
            </div>

            {/* Dynamic Copyright Footer Line */}
            <div className="mt-5 pt-4 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#0F172A]">
                © {year} Vertex. All rights reserved.
              </span>
              <span className="text-[11px] text-slate-400">
                {locale === 'bn' ? 'তৈরি করেছে Vertex' : 'Crafted by Vertex'}
              </span>
            </div>
          </LiquidGlassCard>
        </motion.div>
      </div>
    </motion.footer>
  );
};
