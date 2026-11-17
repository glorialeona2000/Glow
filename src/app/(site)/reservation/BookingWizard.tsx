"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { submitBooking, type BookingActionResult } from "./actions";
import { formatPrice } from "@/lib/money";
import { formatDuration } from "@/lib/time";
import { ArrowLeft, ArrowRight, Check, Clock, InstagramIcon, Sparkle } from "@/components/icons";
import { Turnstile } from "@/components/Turnstile";
import { weddingRows } from "@/lib/quote";

export type WizardService = {
  id: string;
  name: string;
  description: string;
  highlights: string[];
  note: string;
  booking_mode: "appointment" | "request" | "quote";
  price_cents: number | null;
  duration_min: number | null;
  bookable: boolean;
  variants: { id: string; name: string; description: string; price_cents: number; duration_min: number }[];
  options: { id: string; name: string; description: string; price_cents: number; duration_min: number }[];
};
export type WizardCategory = { id: string; slug: string; name: string; tagline: string; image_url: string | null; services: WizardService[] };

type Step = "category" | "service" | "options" | "datetime" | "details" | "review" | "done";
type Slot = { iso: string; label: string };

const TZ = "Europe/Brussels";
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DOW = ["L", "M", "M", "J", "V", "S", "D"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function todayStr() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return p;
}
function monthRange(y: number, m: number) {
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
}
function longDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-BE", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

export function BookingWizard({
  categories,
  initialServiceId,
  initialCategorySlug,
  texts,
  depositCents,
  turnstileSiteKey,
}: {
  categories: WizardCategory[];
  initialServiceId?: string;
  initialCategorySlug?: string;
  texts: { deposit: string; cancellation: string; address: string; requestDone: string; instagram: string };
  depositCents: number;
  turnstileSiteKey: string | null;
}) {
  const [initial] = useState(() => {
    for (const c of categories) {
      const s = c.services.find((x) => x.id === initialServiceId && x.bookable);
      if (s) {
        const st: Step = s.booking_mode !== "appointment" ? "details" : s.variants.length || s.options.length ? "options" : "datetime";
        return { cat: c.id, svc: s.id as string | null, step: st };
      }
    }
    const c = categories.find((x) => x.slug === initialCategorySlug);
    return { cat: c?.id ?? null, svc: null as string | null, step: (c ? "service" : "category") as Step };
  });

  const [categoryId, setCategoryId] = useState<string | null>(initial.cat);
  const [serviceId, setServiceId] = useState<string | null>(initial.svc);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", comment: "", preferredSchedule: "", website: "" });
  const [wedding, setWedding] = useState({ date: "", place: "", readyTime: "", people: 1, trial: null as boolean | null, touchUps: null as boolean | null });
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<BookingActionResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const topRef = useRef<HTMLDivElement>(null);

  const category = categories.find((c) => c.id === categoryId) ?? null;
  const service = category?.services.find((s) => s.id === serviceId) ?? null;
  const variant = service?.variants.find((v) => v.id === variantId) ?? null;
  const options = service?.options.filter((o) => optionIds.includes(o.id)) ?? [];
  const isRequest = !!service && service.booking_mode !== "appointment"; // pas de créneau à choisir
  const isQuote = service?.booking_mode === "quote"; // devis mariage
  const isTraining = service?.booking_mode === "request"; // formation
  const needsOptions = !!service && !isRequest && (service.variants.length > 0 || service.options.length > 0);

  const totalDuration = service && !isRequest ? (variant ? variant.duration_min : service.duration_min ?? 0) + options.reduce((a, o) => a + o.duration_min, 0) : null;
  const totalPrice = service ? (isRequest ? service.price_cents : (variant ? variant.price_cents : service.price_cents ?? 0) + options.reduce((a, o) => a + o.price_cents, 0)) : null;

  const steps: Step[] = useMemo(() => {
    const s: Step[] = ["category", "service"];
    if (needsOptions) s.push("options");
    if (!isRequest) s.push("datetime");
    s.push("details", "review");
    return s;
  }, [needsOptions, isRequest]);

  // Préselection depuis la page Prestations : on démarre directement à la bonne étape
  const [step, setStep] = useState<Step>(initial.step);

  const go = useCallback((s: Step) => {
    setError(null);
    setStep(s);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const next = () => {
    const i = steps.indexOf(step);
    if (i >= 0 && i < steps.length - 1) go(steps[i + 1]);
  };
  const back = () => {
    const i = steps.indexOf(step);
    if (i > 0) go(steps[i - 1]);
  };

  // ---------- Disponibilités ----------
  const now = todayStr();
  const [ym, setYm] = useState(() => ({ y: Number(now.slice(0, 4)), m: Number(now.slice(5, 7)) - 1 }));
  const [avail, setAvail] = useState<{ key: string; days: Record<string, Slot[]>; window?: { first: string; last: string } } | null>(null);
  const [reload, setReload] = useState(0);
  const selKey = `${serviceId}|${variantId}|${[...optionIds].sort().join(",")}`;
  const monthKey = `${selKey}|${monthRange(ym.y, ym.m).from}|${reload}`;
  const loadingSlots = step === "datetime" && avail?.key !== monthKey;

  // Date et créneau sont liés à la sélection : ils s'effacent si la prestation ou les options changent
  const [pick, setPick] = useState<{ key: string; date: string | null; slot: Slot | null }>({ key: "", date: null, slot: null });
  const date = pick.key === selKey ? pick.date : null;
  const slot = pick.key === selKey ? pick.slot : null;
  const setDate = (d: string) => setPick({ key: selKey, date: d, slot: null });
  const setSlot = (sl: Slot) => setPick({ key: selKey, date, slot: sl });

  useEffect(() => {
    if (step !== "datetime" || !serviceId || isRequest) return;
    const { from, to } = monthRange(ym.y, ym.m);
    const key = monthKey;
    if (avail?.key === key) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ service: serviceId, from, to });
    if (variantId) qs.set("variant", variantId);
    if (optionIds.length) qs.set("options", optionIds.join(","));
    fetch(`/api/availability?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setAvail({ key, days: {} });
        } else setAvail({ key, days: data.days, window: data.window });
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError("Impossible de charger les disponibilités. Vérifiez votre connexion.");
          setAvail({ key, days: {} });
        }
      });
    return () => ctrl.abort();
  }, [step, serviceId, variantId, optionIds, ym, monthKey, isRequest, avail?.key]);

  const days = avail?.key.startsWith(selKey) ? avail.days : {};
  const firstDayWithSlots = Object.keys(days).sort()[0];

  const submit = () => {
    if (!service) return;
    setError(null);
    startTransition(async () => {
      const res = await submitBooking({
        serviceId: service.id,
        variantId: variant?.id ?? null,
        optionIds,
        startsAt: isRequest ? null : slot?.iso ?? null,
        ...form,
        consent,
        wedding: isQuote ? { ...wedding, trial: !!wedding.trial, touchUps: !!wedding.touchUps } : null,
        elapsedMs: Date.now() - startedAt.current,
        turnstileToken,
      });
      if (res.ok) {
        setResult(res);
        go("done");
      } else {
        if (res.code === "slot_taken") {
          setPick({ key: "", date: null, slot: null });
          setReload((r) => r + 1);
          go("datetime");
        }
        setError(res.error);
      }
    });
  };

  const detailsValid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    /^\+?[0-9 ().\-/]{8,}$/.test(form.phone.trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    (!isTraining || form.preferredSchedule.trim().length > 0) &&
    (!isQuote || (wedding.date >= todayStr() && wedding.place.trim().length >= 2 && wedding.trial !== null && wedding.touchUps !== null));

  const stepIndex = steps.indexOf(step);
  const stepLabels: Record<Step, string> = {
    category: "Catégorie",
    service: "Prestation",
    options: "Options",
    datetime: "Date & heure",
    details: isQuote ? "Votre demande" : "Coordonnées",
    review: "Confirmation",
    done: "",
  };

  // ---------- Rendu ----------
  return (
    <div ref={topRef} className="mx-auto max-w-3xl scroll-mt-20 px-5 pt-8 pb-40 md:px-8 md:pt-14">
      {step !== "done" && (
        <>
          <div className="text-center">
            <p className="eyebrow text-champagne">Réservation en ligne</p>
            <h1 className="display mt-3 text-3xl md:text-5xl">Prendre rendez-vous</h1>
          </div>
          <ol className="mt-8 flex items-center gap-1.5" aria-label="Étapes">
            {steps.map((s, i) => (
              <li key={s} className="flex-1">
                <span className={`block h-[2px] transition-colors duration-500 ${i <= stepIndex ? "bg-ink" : "bg-ink/10"}`} />
                <span className={`mt-2 hidden text-[0.6rem] tracking-[0.18em] uppercase sm:block ${i === stepIndex ? "text-ink" : "text-mute"}`}>
                  {stepLabels[s]}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-mute sm:hidden">
            Étape {stepIndex + 1} sur {steps.length} · {stepLabels[step]}
          </p>
        </>
      )}

      {error && (
        <div role="alert" className="mt-6 border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div key={step} className="step-in mt-8">
        {/* 1. Catégorie */}
        {step === "category" && (
          <div>
            <h2 className="display text-2xl">Quel univers vous fait envie ?</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 md:gap-5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c.id);
                    setServiceId(null);
                    setVariantId(null);
                    setOptionIds([]);
                    go("service");
                  }}
                  className={`group text-left ${categoryId === c.id ? "opacity-100" : ""}`}
                >
                  <div className="arch relative aspect-[4/5] bg-sand">
                    {c.image_url && <Image src={c.image_url} alt="" fill sizes="(min-width:768px) 360px, 45vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" />}
                  </div>
                  <p className="eyebrow mt-3 text-[0.6rem] text-mute">{c.tagline}</p>
                  <p className="display mt-1 text-xl">{c.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. Prestation */}
        {step === "service" && category && (
          <div>
            <h2 className="display text-2xl">{category.name}</h2>
            <p className="mt-2 text-sm text-taupe">Choisissez votre prestation.</p>
            <ul className="mt-6 space-y-3">
              {category.services.map((s) => {
                const fromPrice = s.variants.length ? Math.min(...s.variants.map((v) => v.price_cents)) : s.price_cents;
                const dur = s.variants.length ? Math.min(...s.variants.map((v) => v.duration_min)) : s.duration_min;
                const selected = s.id === serviceId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={!s.bookable}
                      onClick={() => {
                        setServiceId(s.id);
                        setVariantId(s.variants.length === 1 ? s.variants[0].id : null);
                        setOptionIds([]);
                        setError(null);
                        const st: Step = s.booking_mode !== "appointment" ? "details" : s.variants.length || s.options.length ? "options" : "datetime";
                        go(st);
                      }}
                      className={`w-full border bg-white p-5 text-left transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected ? "border-ink" : "border-stone hover:border-ink/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="display text-lg leading-snug">{s.name}</p>
                        <p className="shrink-0 text-right text-sm">
                          {!s.bookable ? (
                            <span className="text-mute">Bientôt</span>
                          ) : s.booking_mode === "quote" ? (
                            <span>Sur devis</span>
                          ) : s.booking_mode === "request" ? (
                            <span>{s.price_cents != null ? formatPrice(s.price_cents) : "Sur demande"}</span>
                          ) : (
                            <>
                              {s.variants.length > 1 && <span className="text-xs text-mute">dès </span>}
                              {formatPrice(fromPrice)}
                            </>
                          )}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-taupe">{s.description}</p>
                      {s.highlights.length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs leading-relaxed text-taupe">
                          {s.highlights.map((h) => (
                            <li key={h} className="flex gap-2">
                              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-champagne" /> {h}
                            </li>
                          ))}
                        </ul>
                      )}
                      {s.note && <p className="mt-3 text-xs italic leading-relaxed text-taupe">{s.note}</p>}
                      {s.bookable && s.booking_mode === "appointment" && dur != null && (
                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-mute">
                          <Clock className="size-3.5" />
                          {s.variants.length > 1 ? "dès " : ""}
                          {formatDuration(dur)}
                        </p>
                      )}
                      {s.booking_mode === "request" && (
                        <p className="mt-3 text-xs tracking-[0.16em] uppercase text-champagne">Planification personnalisée</p>
                      )}
                      {s.booking_mode === "quote" && (
                        <p className="mt-3 text-xs tracking-[0.16em] uppercase text-champagne">Demande de devis · Déplacement possible</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* 3. Options */}
        {step === "options" && service && (
          <div>
            <h2 className="display text-2xl">{service.name}</h2>
            {service.variants.length > 0 && (
              <fieldset className="mt-6">
                <legend className="label">Votre formule</legend>
                <div className="space-y-3">
                  {service.variants.map((v) => (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-start gap-4 border bg-white p-4 transition-colors ${variantId === v.id ? "border-ink" : "border-stone"}`}
                    >
                      <input type="radio" name="variant" className="mt-1 accent-ink" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                      <span className="flex-1">
                        <span className="flex justify-between gap-4">
                          <span className="font-medium">{v.name}</span>
                          <span>{formatPrice(v.price_cents)}</span>
                        </span>
                        {v.description && <span className="mt-1 block text-sm text-taupe">{v.description}</span>}
                        <span className="mt-1 block text-xs text-mute">{formatDuration(v.duration_min)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {service.options.length > 0 && (
              <fieldset className="mt-8">
                <legend className="label">Options (facultatif)</legend>
                <div className="space-y-3">
                  {service.options.map((o) => {
                    const on = optionIds.includes(o.id);
                    return (
                      <label key={o.id} className={`flex cursor-pointer items-start gap-4 border bg-white p-4 transition-colors ${on ? "border-ink" : "border-stone"}`}>
                        <input
                          type="checkbox"
                          className="mt-1 accent-ink"
                          checked={on}
                          onChange={() => setOptionIds((ids) => (on ? ids.filter((x) => x !== o.id) : [...ids, o.id]))}
                        />
                        <span className="flex-1">
                          <span className="flex justify-between gap-4">
                            <span className="font-medium">{o.name}</span>
                            <span>+{formatPrice(o.price_cents)}</span>
                          </span>
                          {o.description && <span className="mt-1 block text-sm text-taupe">{o.description}</span>}
                          {o.duration_min > 0 && <span className="mt-1 block text-xs text-mute">+{formatDuration(o.duration_min)}</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {/* 4–5. Date & heure */}
        {step === "datetime" && service && (
          <div>
            <h2 className="display text-2xl">Choisissez une date</h2>
            <div className="mt-6 border border-stone bg-white p-4 md:p-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Mois précédent"
                  className="flex size-11 items-center justify-center disabled:opacity-25"
                  disabled={`${ym.y}-${pad(ym.m + 1)}` <= now.slice(0, 7)}
                  onClick={() => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}
                >
                  <ArrowLeft />
                </button>
                <p className="display text-lg capitalize">
                  {MONTHS[ym.m]} {ym.y}
                </p>
                <button
                  type="button"
                  aria-label="Mois suivant"
                  className="flex size-11 items-center justify-center disabled:opacity-25"
                  disabled={!!avail?.window && `${ym.y}-${pad(ym.m + 1)}` >= avail.window.last.slice(0, 7)}
                  onClick={() => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}
                >
                  <ArrowRight />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-7 text-center text-[0.65rem] tracking-[0.15em] text-mute">
                {DOW.map((d, i) => (
                  <span key={i} className="py-2">
                    {d}
                  </span>
                ))}
              </div>
              <div className={`grid grid-cols-7 gap-1 transition-opacity ${loadingSlots ? "opacity-40" : ""}`} aria-busy={loadingSlots}>
                {(() => {
                  const first = new Date(Date.UTC(ym.y, ym.m, 1)).getUTCDay();
                  const offset = (first + 6) % 7;
                  const count = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate();
                  const cells = [];
                  for (let i = 0; i < offset; i++) cells.push(<span key={`e${i}`} />);
                  for (let d = 1; d <= count; d++) {
                    const ds = `${ym.y}-${pad(ym.m + 1)}-${pad(d)}`;
                    const has = !!days[ds]?.length;
                    const sel = ds === date;
                    cells.push(
                      <button
                        key={ds}
                        type="button"
                        disabled={!has}
                        aria-pressed={sel}
                        aria-label={`${longDate(ds)}${has ? "" : " — complet ou fermé"}`}
                        onClick={() => {
                          setDate(ds);
                          requestAnimationFrame(() => document.getElementById("creneaux")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
                        }}
                        className={`relative aspect-square text-sm transition-colors duration-300 ${
                          sel ? "bg-ink text-ivory" : has ? "hover:bg-sand" : "text-ink/20"
                        } ${ds === now && !sel ? "underline underline-offset-4" : ""}`}
                      >
                        {d}
                        {has && !sel && <span className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-champagne" />}
                      </button>,
                    );
                  }
                  return cells;
                })()}
              </div>
              {!loadingSlots && !Object.keys(days).length && avail && (
                <p className="mt-4 text-center text-sm text-taupe">Aucune disponibilité ce mois-ci. Essayez le mois suivant.</p>
              )}
              {!date && firstDayWithSlots && (
                <p className="mt-4 text-center text-xs text-mute">Prochaine disponibilité : {longDate(firstDayWithSlots)}</p>
              )}
            </div>

            {date && (
              <div id="creneaux" className="mt-8 scroll-mt-24">
                <h3 className="display text-xl first-letter:uppercase">{longDate(date)}</h3>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {(days[date] ?? []).map((s) => (
                    <button
                      key={s.iso}
                      type="button"
                      aria-pressed={slot?.iso === s.iso}
                      onClick={() => setSlot(s)}
                      className={`min-h-12 border text-sm transition-colors duration-300 ${
                        slot?.iso === s.iso ? "border-ink bg-ink text-ivory" : "border-stone bg-white hover:border-ink"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Coordonnées */}
        {step === "details" && service && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (detailsValid) next();
            }}
            className="space-y-5"
            id="details-form"
          >
            {isQuote && (
              <div className="mb-10 space-y-6">
                <div className="border-b border-ink/10 pb-6 text-center">
                  <Sparkle className="mx-auto size-3 text-champagne" />
                  <h2 className="display mt-4 text-3xl">Votre mariage</h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-taupe">
                    Quelques informations pour préparer un devis sur mesure. Je me déplace sur le lieu de vos préparatifs.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="w-date">Date du mariage *</label>
                    <input id="w-date" type="date" required min={todayStr()} className="field" value={wedding.date} onChange={(e) => setWedding({ ...wedding, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="w-time">Prête pour (heure)</label>
                    <input id="w-time" type="time" step={900} className="field" value={wedding.readyTime} onChange={(e) => setWedding({ ...wedding, readyTime: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="w-place">Lieu des préparatifs *</label>
                  <input id="w-place" className="field" required maxLength={200} placeholder="Ville, domaine ou adresse" value={wedding.place} onChange={(e) => setWedding({ ...wedding, place: e.target.value })} />
                </div>
                <div>
                  <span className="label" id="w-people">Personnes à maquiller (mariée incluse) *</span>
                  <div className="flex items-center gap-0 border border-stone bg-white" role="group" aria-labelledby="w-people">
                    <button type="button" aria-label="Moins" className="flex size-12 items-center justify-center text-xl disabled:opacity-30" disabled={wedding.people <= 1} onClick={() => setWedding({ ...wedding, people: wedding.people - 1 })}>−</button>
                    <span className="flex-1 text-center" aria-live="polite">
                      <span className="display text-xl">{wedding.people}</span>
                      <span className="ml-2 text-xs text-mute">{wedding.people === 1 ? "la mariée" : "personnes"}</span>
                    </span>
                    <button type="button" aria-label="Plus" className="flex size-12 items-center justify-center text-xl disabled:opacity-30" disabled={wedding.people >= 30} onClick={() => setWedding({ ...wedding, people: wedding.people + 1 })}>+</button>
                  </div>
                </div>
                <Choice
                  label="Souhaitez-vous un essai maquillage avant le jour J ? *"
                  value={wedding.trial}
                  onChange={(v) => setWedding({ ...wedding, trial: v })}
                />
                <Choice
                  label="Souhaitez-vous que je reste pour les retouches en soirée ? *"
                  value={wedding.touchUps}
                  onChange={(v) => setWedding({ ...wedding, touchUps: v })}
                />
              </div>
            )}
            <h2 className="display text-2xl">Vos coordonnées</h2>
            <p className="text-sm text-taupe">Aucun compte à créer. Ces informations servent uniquement à {isQuote ? "vous envoyer votre devis" : "gérer votre rendez-vous"}.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Prénom" autoComplete="given-name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
              <Field label="Nom" autoComplete="family-name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
              <Field label="Téléphone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required placeholder="+32 …" />
              <Field label="E-mail" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            </div>
            {isTraining && (
              <div>
                <label className="label" htmlFor="pref">
                  Vos disponibilités et objectifs *
                </label>
                <textarea
                  id="pref"
                  className="field min-h-28"
                  maxLength={800}
                  required
                  placeholder="Ex. : en semaine après 17 h, ou le samedi matin. Débutante, je souhaite apprendre…"
                  value={form.preferredSchedule}
                  onChange={(e) => setForm({ ...form, preferredSchedule: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="label" htmlFor="comment">
                {isQuote ? "Vos envies, votre style, vos inspirations (facultatif)" : "Commentaire (facultatif)"}
              </label>
              <textarea
                id="comment"
                className="field min-h-24"
                maxLength={800}
                placeholder={service.booking_mode === "appointment" && category?.slug === "make-up" ? "Ex. : type d’événement, tenue, inspiration…" : ""}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </div>
            {/* Champ piège pour les robots : invisible pour les humains */}
            <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
              <label>
                Site web
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </label>
            </div>
          </form>
        )}

        {/* 7. Récapitulatif */}
        {step === "review" && service && (
          <div>
            <h2 className="display text-2xl">Récapitulatif</h2>
            <Summary
              rows={[
                ["Prestation", variant ? `${service.name} — ${variant.name}` : service.name],
                ...(options.length ? [["Options", options.map((o) => o.name).join(", ")] as [string, string]] : []),
                ...(!isRequest && date && slot ? ([["Date", longDate(date)], ["Heure", slot.label]] as [string, string][]) : []),
                ...(totalDuration ? [["Durée", formatDuration(totalDuration)] as [string, string]] : []),
                ...(isQuote ? [["Tarif", "Sur devis"] as [string, string]] : []),
                ...(isQuote ? weddingRows({ ...wedding, trial: !!wedding.trial, touchUps: !!wedding.touchUps }) : []),
                ...(totalPrice != null ? [["Prix total", formatPrice(totalPrice)] as [string, string]] : []),
                ...(!isRequest && depositCents ? [["Acompte", formatPrice(depositCents)] as [string, string]] : []),
                ...(isTraining ? [["Vos disponibilités", form.preferredSchedule] as [string, string]] : []),
                ["Coordonnées", `${form.firstName} ${form.lastName}\n${form.phone}\n${form.email}`],
                ...(form.comment ? [[isQuote ? "Vos envies" : "Commentaire", form.comment] as [string, string]] : []),
                ...(!isQuote ? [["Adresse", texts.address] as [string, string]] : []),
              ]}
            />
            <div className="mt-6 space-y-3 text-sm leading-relaxed text-taupe">
              {isQuote ? (
                <p>Je vous réponds personnellement avec un devis sur mesure (maquillage, essai, déplacement et retouches selon vos souhaits).</p>
              ) : isRequest ? (
                <p>Votre demande sera étudiée personnellement : je vous recontacte pour construire votre planning de séances.</p>
              ) : (
                <>
                  <p>
                    <strong className="font-medium text-ink">Votre rendez-vous sera confirmé après validation.</strong> Le créneau vous est réservé en attendant.
                  </p>
                  {texts.deposit && <p>{texts.deposit}</p>}
                  <p>{texts.cancellation}</p>
                </>
              )}
            </div>
            <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" className="mt-1 size-4 accent-ink" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                J’accepte les conditions de réservation et le traitement de mes données pour la gestion de mon rendez-vous, conformément à la{" "}
                <Link href="/confidentialite" target="_blank" className="underline underline-offset-2">
                  politique de confidentialité
                </Link>
                .
              </span>
            </label>
            {turnstileSiteKey && (
              <div className="mt-6">
                <Turnstile siteKey={turnstileSiteKey} onToken={setTurnstileToken} />
              </div>
            )}
          </div>
        )}

        {/* 8. Confirmation */}
        {step === "done" && result && service && (
          <div className="text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-champagne text-champagne">
              <Check className="size-7" />
            </div>
            <p className="eyebrow mt-6 text-champagne">Référence {result.ref}</p>
            <h1 className="display mt-3 text-3xl md:text-4xl">{isQuote ? "Demande de devis envoyée" : isRequest ? "Demande envoyée" : "Demande de rendez-vous envoyée"}</h1>
            <p className="mx-auto mt-5 max-w-lg leading-relaxed text-taupe">
              {isQuote ? "Merci et toutes mes félicitations ! J’étudie votre demande et vous envoie très vite un devis personnalisé par e-mail." : texts.requestDone}
            </p>
            <div className="mt-8 text-left">
              <Summary
                rows={[
                  ["Statut", isQuote ? "Devis en préparation" : "En attente de validation"],
                  ["Prestation", variant ? `${service.name} — ${variant.name}` : service.name],
                  ...(options.length ? [["Options", options.map((o) => o.name).join(", ")] as [string, string]] : []),
                  ...(!isRequest && date && slot ? ([["Date", longDate(date)], ["Heure", slot.label]] as [string, string][]) : []),
                  ...(totalDuration ? [["Durée", formatDuration(totalDuration)] as [string, string]] : []),
                  ...(totalPrice != null ? [["Prix total", formatPrice(totalPrice)] as [string, string]] : []),
                  ...(!isRequest && depositCents ? [["Acompte", formatPrice(depositCents)] as [string, string]] : []),
                  ...(isQuote ? weddingRows({ ...wedding, trial: !!wedding.trial, touchUps: !!wedding.touchUps }) : [["Adresse", texts.address] as [string, string]]),
                ]}
              />
            </div>
            <p className="mt-6 text-sm text-taupe">
              {result.emailStatus === "sent"
                ? `Un e-mail récapitulatif vient de vous être envoyé à ${form.email}.`
                : "Votre demande est bien enregistrée, mais l’e-mail récapitulatif n’a pas pu être envoyé. Pensez à noter votre référence ; vous serez contactée dès la validation."}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/" className="btn btn-primary">
                Retour à l’accueil
              </Link>
              <a href={`https://instagram.com/${texts.instagram}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                <InstagramIcon className="size-4" /> @{texts.instagram}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Barre d'action fixe, accessible au pouce */}
      {step !== "done" && step !== "category" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/95 px-4 pt-3 pb-safe backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button type="button" onClick={back} className="btn btn-outline min-h-12 shrink-0 px-4" aria-label="Étape précédente">
              <ArrowLeft />
            </button>
            <div className="min-w-0 flex-1 text-xs leading-tight">
              {service ? (
                <>
                  <p className="truncate font-medium text-ink">{service.name}</p>
                  <p className="mt-0.5 truncate text-mute">
                    {[
                      totalPrice != null && !(needsOptions && service.variants.length && !variant) ? formatPrice(totalPrice) : null,
                      totalDuration && !(needsOptions && service.variants.length && !variant) ? formatDuration(totalDuration) : null,
                      slot ? `${date ? longDate(date).split(" ").slice(0, 3).join(" ") : ""} · ${slot.label}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </>
              ) : (
                <p className="text-mute">Choisissez une prestation</p>
              )}
            </div>
            {step === "options" && (
              <button type="button" className="btn btn-primary min-h-12 shrink-0 px-5" disabled={!!service?.variants.length && !variant} onClick={next}>
                Continuer
              </button>
            )}
            {step === "datetime" && (
              <button type="button" className="btn btn-primary min-h-12 shrink-0 px-5" disabled={!slot} onClick={next}>
                Continuer
              </button>
            )}
            {step === "details" && (
              <button type="submit" form="details-form" className="btn btn-primary min-h-12 shrink-0 px-5" disabled={!detailsValid}>
                Continuer
              </button>
            )}
            {step === "review" && (
              <button
                type="button"
                className="btn btn-primary min-h-12 shrink-0 px-5"
                disabled={!consent || pending || (!!turnstileSiteKey && !turnstileToken)}
                onClick={submit}
              >
                {pending ? "Envoi…" : isQuote ? "Demander mon devis" : isRequest ? "Envoyer" : "Confirmer"}
              </button>
            )}
          </div>
        </div>
      )}
      {step === "category" && (
        <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-mute">
          <Sparkle className="size-2.5 text-champagne" /> Réservation en quelques étapes, sans création de compte
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = `f-${label.toLowerCase().replace(/[^a-z]/g, "")}`;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
        {rest.required ? " *" : ""}
      </label>
      <input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} maxLength={120} {...rest} />
    </div>
  );
}

function Choice({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`min-h-12 border text-sm tracking-[0.12em] uppercase transition-colors duration-300 ${
              value === v ? "border-ink bg-ink text-ivory" : "border-stone bg-white hover:border-ink"
            }`}
          >
            {v ? "Oui" : "Non"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Summary({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-6 divide-y divide-ink/10 border-y border-ink/10 bg-white px-5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-4 py-3.5">
          <dt className="w-[38%] shrink-0 text-[0.65rem] tracking-[0.18em] uppercase text-mute">{k}</dt>
          <dd className="min-w-0 flex-1 text-sm break-words whitespace-pre-line first-letter:uppercase">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
