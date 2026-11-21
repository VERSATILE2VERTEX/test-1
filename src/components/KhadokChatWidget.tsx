import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from 'motion/react';
import { Check, Copy, Minus, RotateCcw, Send, Sparkles, Square, X } from 'lucide-react';
import { InventoryItem, Locale } from '../types';
import { soundEngine } from '../utils/soundEngine';

export interface KitchenChatContext {
  locale: Locale;
  outletName: string;
  forecastMultiplier: number;
  totalStockValueBdt: number;
  rescuedValueBdt: number;
  lossValueBdt: number;
  urgentItems: Array<{
    name: string;
    quantity: number;
    unit: string;
    hoursLeft: number;
    valueBdt: number;
  }>;
  allInventory: Array<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
    hoursLeft: number;
    minThreshold: number;
    valueBdt: number;
  }>;
  topDishes: Array<{
    name: string;
    targetPortions: number;
    sellingPriceBdt: number;
  }>;
  recentWasteLogs: Array<{
    item: string;
    disposition: string;
    quantity: number;
    unit: string;
    valueBdt: number;
  }>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface KhadokChatWidgetProps {
  locale: Locale;
  inventory: InventoryItem[];
  kitchenContext: KitchenChatContext;
  reducedMotion?: boolean;
  hidden?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type EyeMood = 'idle' | 'curious' | 'thinking' | 'happy';

// Clean inline markdown formatter for AI responses (bold & bullets without raw asterisks)
function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-[#0F172A]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const FormattedMessageContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 break-words pr-5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        const bulletMatch = trimmed.match(/^([*\-•]|\d+\.)\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#16A34A] shrink-0" />
              <span>{renderInlineBold(bulletMatch[2])}</span>
            </div>
          );
        }
        return <p key={idx}>{renderInlineBold(trimmed)}</p>;
      })}
    </div>
  );
};

// Expressive Cursor-Tracking Bot Eyes (60fps GPU-composited MotionValues + Springs)
const CursorTrackingEyes: React.FC<{
  size?: 'lg' | 'sm';
  mood: EyeMood;
  reducedMotion?: boolean;
}> = ({ size = 'lg', mood, reducedMotion = false }) => {
  const headRef = useRef<HTMLDivElement>(null);
  const lastMoveTimeRef = useRef<number>(Date.now());
  const [isBlinking, setIsBlinking] = useState(false);

  const maxOffsetX = size === 'lg' ? 4.2 : 2.8;
  const maxOffsetY = size === 'lg' ? 3.4 : 2.2;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const eyeX = useSpring(rawX, { stiffness: 320, damping: 24, mass: 0.55 });
  const eyeY = useSpring(rawY, { stiffness: 320, damping: 24, mass: 0.55 });

  useEffect(() => {
    if (reducedMotion) {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      lastMoveTimeRef.current = Date.now();
      if (!headRef.current || mood === 'thinking') return;

      const rect = headRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < 1) {
        rawX.set(0);
        rawY.set(0);
        return;
      }

      const angle = Math.atan2(dy, dx);
      const strength = Math.min(1, dist / 200);
      rawX.set(Math.cos(angle) * maxOffsetX * strength);
      rawY.set(Math.sin(angle) * maxOffsetY * strength);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [maxOffsetX, maxOffsetY, mood, rawX, rawY, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || mood !== 'thinking') return;
    let step = 0;
    const sequence = [
      { x: -maxOffsetX * 0.75, y: -maxOffsetY * 0.65 },
      { x: maxOffsetX * 0.75, y: -maxOffsetY * 0.5 },
      { x: 0, y: -maxOffsetY * 0.75 },
    ];
    rawX.set(sequence[0].x);
    rawY.set(sequence[0].y);

    const id = window.setInterval(() => {
      step = (step + 1) % sequence.length;
      rawX.set(sequence[step].x);
      rawY.set(sequence[step].y);
    }, 460);

    return () => window.clearInterval(id);
  }, [maxOffsetX, maxOffsetY, mood, rawX, rawY, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || mood !== 'idle') return;
    const idleSpots = [
      { x: -maxOffsetX * 0.55, y: -maxOffsetY * 0.35 },
      { x: maxOffsetX * 0.5, y: maxOffsetY * 0.2 },
      { x: 0, y: 0 },
      { x: maxOffsetX * 0.35, y: -maxOffsetY * 0.45 },
    ];
    let idx = 0;

    const id = window.setInterval(() => {
      if (Date.now() - lastMoveTimeRef.current > 2600) {
        const spot = idleSpots[idx % idleSpots.length];
        idx += 1;
        rawX.set(spot.x);
        rawY.set(spot.y);
      }
    }, 2300);

    return () => window.clearInterval(id);
  }, [maxOffsetX, maxOffsetY, mood, rawX, rawY, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    let timeoutId: number;
    let releaseId: number;

    const scheduleBlink = () => {
      const delay = 2800 + Math.random() * 2600;
      timeoutId = window.setTimeout(() => {
        setIsBlinking(true);
        releaseId = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 145);
      }, delay);
    };

    scheduleBlink();
    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(releaseId);
    };
  }, [reducedMotion]);

  const headClasses = size === 'lg' ? 'w-12 h-10 rounded-[16px]' : 'w-10 h-8 rounded-[13px]';
  const socketClasses = size === 'lg' ? 'w-[16px] h-[18px] rounded-full' : 'w-[13px] h-[15px] rounded-full';
  const pupilClasses = size === 'lg' ? 'w-[9px] h-[9px] rounded-full' : 'w-[7px] h-[7px] rounded-full';

  const socketScaleY = isBlinking ? 0.07 : mood === 'happy' ? 0.72 : mood === 'curious' ? 1.08 : 1;
  const socketScaleX = mood === 'curious' ? 1.08 : 1;

  return (
    <div
      ref={headRef}
      className={`relative ${headClasses} bg-[#141517] border border-white/25 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.22),0_8px_18px_-6px_rgba(15,23,42,0.4)] flex items-center justify-center gap-1.5 shrink-0`}
    >
      <span
        aria-hidden="true"
        className={`absolute -top-1 right-2 rounded-full bg-[#92E634] shadow-[0_0_8px_#92E634] transition-transform duration-200 ${
          size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5'
        } ${mood === 'thinking' ? 'scale-125' : ''}`}
      />

      {[0, 1].map((eyeIdx) => (
        <motion.div
          key={eyeIdx}
          animate={{ scaleY: socketScaleY, scaleX: socketScaleX }}
          transition={{ duration: isBlinking ? 0.08 : 0.18, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'center center' }}
          className={`relative ${socketClasses} bg-white shadow-[inset_0_1.5px_3px_rgba(15,23,42,0.18)] flex items-center justify-center overflow-hidden`}
        >
          <motion.div
            style={reducedMotion ? undefined : { x: eyeX, y: eyeY }}
            className={`relative ${pupilClasses} bg-[#0F172A] ring-[1.5px] ring-[#92E634]/75 flex items-center justify-center`}
          >
            <span
              className={`absolute top-[1.5px] left-[1.5px] rounded-full bg-white ${
                size === 'lg' ? 'w-[3px] h-[3px]' : 'w-[2.5px] h-[2.5px]'
              }`}
            />
            <span className="absolute bottom-[1.5px] right-[1.5px] w-[1.5px] h-[1.5px] rounded-full bg-sky-200/90" />
          </motion.div>

          {mood === 'happy' && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-1 inset-x-0 h-1.5 bg-[#92E634]/55 rounded-t-full"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
};

// Stable scroll container subcomponent for chat messages
const ChatMessageScrollArea: React.FC<{
  messages: ChatMessage[];
  isStreaming: boolean;
  copiedId: string | null;
  reducedMotion: boolean;
  onCopy: (id: string, content: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}> = ({ messages, isStreaming, copiedId, reducedMotion, onCopy, messagesEndRef }) => {
  return (
    <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 py-4 space-y-3 bg-white/82 backdrop-blur-xl overscroll-contain">
      <div className="space-y-3">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isEmptyStreaming = !isUser && isStreaming && msg.content.length === 0;

          return (
            <motion.div
              key={msg.id}
              initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {isUser ? (
                <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-[#141517] text-white text-xs sm:text-[13px] font-medium leading-relaxed shadow-[0_10px_24px_-12px_rgba(15,23,42,0.45)] border border-[#92E634]/30">
                  {msg.content}
                </div>
              ) : (
                <div
                  className={`group relative max-w-[90%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-xs sm:text-[13px] leading-relaxed ${
                    msg.isError
                      ? 'bg-amber-50/95 border border-amber-200 text-amber-900'
                      : 'glass-hero-blue text-[#0F172A]'
                  }`}
                >
                  {isEmptyStreaming ? (
                    <div className="flex items-center gap-1.5 py-1 px-1">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          animate={
                            reducedMotion
                              ? undefined
                              : { y: [0, -5, 0], opacity: [0.45, 1, 0.45] }
                          }
                          transition={{
                            duration: 0.75,
                            repeat: Infinity,
                            delay: dot * 0.14,
                            ease: 'easeInOut',
                          }}
                          className="w-2 h-2 rounded-full bg-[#16A34A]"
                        />
                      ))}
                    </div>
                  ) : (
                    <FormattedMessageContent content={msg.content} />
                  )}

                  {msg.content && !msg.isError && (
                    <motion.button
                      type="button"
                      whileTap={!reducedMotion ? { scale: 0.85 } : undefined}
                      onClick={() => onCopy(msg.id, msg.content)}
                      aria-label="Copy response"
                      className="absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-[#0F172A] hover:bg-white/75 opacity-75 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-[#16A34A]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </motion.button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

export const KhadokChatWidget: React.FC<KhadokChatWidgetProps> = ({
  locale,
  inventory,
  kitchenContext,
  reducedMotion = false,
  hidden = false,
  isOpen: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpenState = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange]
  );

  const [isHovered, setIsHovered] = useState(false);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [happyBurst, setHappyBurst] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendPlaneKey, setSendPlaneKey] = useState(0);
  const [launcherRippleKey, setLauncherRippleKey] = useState(0);

  const welcomeMessage = useMemo<ChatMessage>(
    () => ({
      id: 'welcome',
      role: 'assistant',
      content:
        locale === 'bn'
          ? `হ্যালো! আমি খাদক AI। আপনার **${kitchenContext.outletName}** কিচেনের মজুদ, অপচয় রোধ এবং আজকের চাহিদা পূর্বাভাস নিয়ে যেকোনো প্রশ্ন করুন।`
          : `Hi! I'm **KHADOK AI**. Ask me anything about expiring batches, prep targets for **${kitchenContext.outletName}**, or how to rescue surplus stock today.`,
    }),
    [locale, kitchenContext.outletName]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);

  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === 'welcome' ? [welcomeMessage] : prev
    );
  }, [welcomeMessage]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const happyTimeoutRef = useRef<number | null>(null);

  const triggerHappyEyes = useCallback(() => {
    if (happyTimeoutRef.current) window.clearTimeout(happyTimeoutRef.current);
    setHappyBurst(true);
    happyTimeoutRef.current = window.setTimeout(() => {
      setHappyBurst(false);
    }, 680);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (happyTimeoutRef.current) window.clearTimeout(happyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [messages, isOpen, isStreaming, reducedMotion]);

  useEffect(() => {
    if (isOpen) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 200);
      return () => window.clearTimeout(t);
    }
  }, [isOpen]);

  const eyeMood: EyeMood = isStreaming
    ? 'thinking'
    : happyBurst
    ? 'happy'
    : isHovered
    ? 'curious'
    : 'idle';

  const quickPrompts = useMemo(
    () =>
      locale === 'bn'
        ? [
            '২৪ ঘণ্টায় কী কী মেয়াদোত্তীর্ণ হবে?',
            'আজকের রান্নার প্রস্তুতি পরিকল্পনা দাও',
            'উদ্বৃত্ত খাবার কীভাবে সংরক্ষণ করব?',
          ]
        : [
            'What expires in 24h?',
            'Prep plan for today',
            'How to rescue surplus stock?',
          ],
    [locale]
  );

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const prompt = (textOverride ?? input).trim();
      if (!prompt || isStreaming) return;

      soundEngine.playClick();
      setSendPlaneKey((k) => k + 1);
      triggerHappyEyes();

      if (!textOverride) {
        setInput('');
      }

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: prompt,
      };
      const assistantId = `a-${Date.now() + 1}`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
      };

      const historyPayload = [...messages.filter((m) => !m.isError), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setIsStreaming(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messages: historyPayload,
            context: kitchenContext,
          }),
        });

        if (!res.ok) {
          const errJson = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errJson.error || `Request failed (${res.status})`);
        }

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream') && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullText = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const payloadStr = trimmed.slice(5).trim();
              if (!payloadStr) continue;

              const parsed = JSON.parse(payloadStr) as {
                text?: string;
                done?: boolean;
                error?: string;
              };
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                fullText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
                );
              }
            }
          }

          if (!fullText.trim()) {
            throw new Error('Empty response received from assistant.');
          }
        } else {
          const data = (await res.json()) as { text?: string; error?: string };
          if (data.error) throw new Error(data.error);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: data.text ?? '' } : m))
          );
        }

        soundEngine.playChime();
        triggerHappyEyes();
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        const msg =
          err instanceof Error
            ? err.message
            : locale === 'bn'
            ? 'উত্তর তৈরি করতে সমস্যা হয়েছে।'
            : 'Unable to reach KHADOK AI right now.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: msg, isError: true } : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [input, isStreaming, kitchenContext, locale, messages, triggerHappyEyes]
  );

  const handleOpenToggle = (next: boolean) => {
    soundEngine.playToggle(next);
    if (next) {
      setLauncherRippleKey((k) => k + 1);
      triggerHappyEyes();
    }
    setOpenState(next);
  };

  const handleStopStreaming = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    soundEngine.playClick();
  };

  const handleResetChat = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    soundEngine.playTick(80);
    setMessages([welcomeMessage]);
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      soundEngine.playTick(140);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1600);
    } catch {
      // Clipboard blocked cleanly ignored
    }
  };

  if (hidden) return null;

  const urgentCount = inventory.filter((i) => i.hoursUntilExpiry <= 24 && i.quantity > 0).length;

  return (
    <AnimatePresence mode="wait">
      {!isOpen ? (
        /* Floating Liquid Glass Launcher Pill (clears bottom MagnificationDock on mobile) */
        <motion.button
          key="chat-launcher"
          type="button"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.85, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, scale: 0.88, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          whileHover={!reducedMotion ? { y: -3, scale: 1.03 } : undefined}
          whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
          onMouseEnter={() => {
            setIsHovered(true);
            soundEngine.playTick(100);
          }}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => handleOpenToggle(true)}
          aria-label={locale === 'bn' ? 'খাদক AI চ্যাট খুলুন' : 'Open KHADOK AI Assistant'}
          className="btn-sheen glass-panel squircle-24 fixed bottom-21 right-3 md:bottom-5 md:right-5 z-45 group flex items-center gap-2.5 sm:gap-3 pl-2 pr-3 sm:pl-2.5 sm:pr-4 py-2 sm:py-2.5 shadow-[0_20px_42px_-12px_rgba(15,23,42,0.24)] border border-white cursor-pointer"
        >
          {launcherRippleKey > 0 && !reducedMotion && (
            <motion.span
              key={launcherRippleKey}
              initial={{ scale: 0.5, opacity: 0.6 }}
              animate={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[#92E634]"
            />
          )}

          <CursorTrackingEyes size="lg" mood={eyeMood} reducedMotion={reducedMotion} />

          <div className="text-left pr-0.5 hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-base font-bold text-[#0F172A] leading-none tracking-wide">
                {locale === 'bn' ? 'খাদক AI' : 'KHADOK AI'}
              </span>
              <span className="w-2 h-2 rounded-full bg-[#92E634] shadow-[0_0_6px_#92E634]" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-none">
              {urgentCount > 0
                ? locale === 'bn'
                  ? `${urgentCount}টি জরুরি ব্যাচ`
                  : `${urgentCount} urgent alerts`
                : locale === 'bn'
                ? 'কিচেন সহায়ক'
                : 'Kitchen Copilot'}
            </p>
          </div>
        </motion.button>
      ) : (
        /* Responsive Liquid Glass Collage Chat Drawer */
        <motion.section
          key="chat-drawer"
          role="dialog"
          aria-label={locale === 'bn' ? 'খাদক AI চ্যাট' : 'KHADOK AI Assistant'}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.92, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, scale: 0.92, y: 14 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'bottom right' }}
          className="glass-panel squircle-28 fixed inset-x-3 bottom-3 top-14 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[410px] sm:h-[min(580px,calc(100vh-3.5rem))] z-50 flex flex-col overflow-hidden shadow-[0_28px_60px_-16px_rgba(15,23,42,0.32)] border border-white"
        >
          {/* Dark Charcoal Header Cap with Live Cursor-Tracking Eyes */}
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative bg-[#141517] text-white px-4 py-3.5 flex items-center justify-between gap-3 border-b border-white/10 shrink-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CursorTrackingEyes size="sm" mood={eyeMood} reducedMotion={reducedMotion} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold tracking-wide text-white leading-none">
                    {locale === 'bn' ? 'খাদক AI সহায়ক' : 'KHADOK AI'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#92E634]/20 border border-[#92E634]/45 text-[10px] font-bold text-[#92E634] leading-none">
                    {isStreaming
                      ? locale === 'bn'
                        ? 'ভাবছে...'
                        : 'Thinking'
                      : locale === 'bn'
                      ? 'সক্রিয়'
                      : 'Live'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-1">
                  {kitchenContext.outletName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { rotate: -90, scale: 1.08 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                transition={{ duration: 0.18 }}
                onClick={handleResetChat}
                title={locale === 'bn' ? 'চ্যাট রিসেট' : 'Clear chat'}
                aria-label={locale === 'bn' ? 'চ্যাট রিসেট' : 'Clear chat'}
                className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { scale: 1.08 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                onClick={() => handleOpenToggle(false)}
                title={locale === 'bn' ? 'ছোট করুন' : 'Minimize'}
                aria-label={locale === 'bn' ? 'ছোট করুন' : 'Minimize'}
                className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { rotate: 90, scale: 1.08 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                transition={{ duration: 0.16 }}
                onClick={() => handleOpenToggle(false)}
                title={locale === 'bn' ? 'বন্ধ করুন' : 'Close'}
                aria-label={locale === 'bn' ? 'বন্ধ করুন' : 'Close'}
                className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Frosted Message List with Hydrated Scroll Buoyancy */}
          <ChatMessageScrollArea
            messages={messages}
            isStreaming={isStreaming}
            copiedId={copiedId}
            reducedMotion={reducedMotion}
            onCopy={handleCopy}
            messagesEndRef={messagesEndRef}
          />

          {/* Quick-Prompt Chips */}
          <div className="px-3.5 py-2 bg-white/85 border-t border-slate-200/70 flex items-center gap-1.5 overflow-x-auto shrink-0">
            {quickPrompts.map((q) => (
              <motion.button
                key={q}
                type="button"
                disabled={isStreaming}
                whileHover={!reducedMotion ? { scale: 1.03 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
                onClick={() => sendMessage(q)}
                className="btn-sheen inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 hover:bg-[#92E634]/30 border border-slate-200/90 text-[11px] font-semibold text-[#0F172A] whitespace-nowrap shrink-0 disabled:opacity-45 transition-colors cursor-pointer"
              >
                <Sparkles className="w-2.5 h-2.5 text-[#16A34A]" />
                <span>{q}</span>
              </motion.button>
            ))}
          </div>

          {/* Input Form + Launching Send / Stop Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 bg-white/92 border-t border-slate-200/70 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                locale === 'bn'
                  ? 'মজুদ বা পূর্বাভাস সম্পর্কে জিজ্ঞাসা করুন...'
                  : 'Ask about stock, prep, or rescue...'
              }
              className="flex-1 min-w-0 px-3.5 py-2 text-xs sm:text-sm bg-slate-100/85 border border-slate-200/90 rounded-full text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0F172A] transition-colors"
            />
            {isStreaming ? (
              <motion.button
                type="button"
                whileHover={!reducedMotion ? { scale: 1.06 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                onClick={handleStopStreaming}
                aria-label={locale === 'bn' ? 'থামান' : 'Stop generating'}
                className="w-9 h-9 rounded-full bg-[#141517] text-[#92E634] flex items-center justify-center cursor-pointer shrink-0 shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={!input.trim()}
                whileHover={!reducedMotion ? { scale: 1.06 } : undefined}
                whileTap={!reducedMotion ? { scale: 0.9 } : undefined}
                transition={{ duration: 0.15 }}
                aria-label={locale === 'bn' ? 'পাঠান' : 'Send message'}
                className="btn-sheen glass-lime-accent w-9 h-9 rounded-full flex items-center justify-center text-[#0F172A] disabled:opacity-40 cursor-pointer shrink-0"
              >
                <motion.span
                  key={sendPlaneKey}
                  initial={
                    sendPlaneKey > 0 && !reducedMotion ? { x: -4, y: 4, scale: 0.8 } : false
                  }
                  animate={{ x: 0, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex"
                >
                  <Send className="w-4 h-4" />
                </motion.span>
              </motion.button>
            )}
          </form>
        </motion.section>
      )}
    </AnimatePresence>
  );
};
