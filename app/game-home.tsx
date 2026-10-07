"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import WorkPanel from "./work-panel";

type PlayerState = {
  location_id: string;
  cash_kobo: number;
  bank_kobo: number;
  energy: number;
  hunger: number;
  health: number;
  happiness: number;
  reputation: number;
  game_day: number;
  minutes_today: number;
};

type PlayerProfile = {
  display_name: string;
  avatar_key: string;
};

type GameJob = {
  id: string;
  name: string;
  category: string;
  energy_cost: number;
  minutes_cost: number;
  min_pay_kobo: number;
  max_pay_kobo: number;
  required_reputation: number;
};

const locationNames: Record<string, string> = {
  "central-area": "Central Area, Abuja",
  wuse: "Wuse, Abuja",
  garki: "Garki, Abuja",
  jabi: "Jabi, Abuja",
};

const actions = [
  ["Find Work", "Look for a job or daily hustle.", "💼"],
  ["Eat", "Restore hunger and keep moving.", "🍛"],
  ["Travel", "Move around Abuja.", "🚌"],
  ["Explore", "Discover places and opportunities.", "🗺️"],
];

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return displayHour + ":" + mins.toString().padStart(2, "0") + " " + suffix;
}

export default function GameHome() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [state, setState] = useState<PlayerState | null>(null);
  const [jobs, setJobs] = useState<GameJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWork, setShowWork] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      let { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          setMessage("Enable Anonymous Sign-Ins in Supabase Auth to start the game.");
          setLoading(false);
          return;
        }
        ({ data: { session } } = await supabase.auth.getSession());
      }

      const user = session?.user;
      if (!user) {
        setMessage("Could not create a game session.");
        setLoading(false);
        return;
      }

      const [{ data: profileData }, { data: stateData, error: stateError }] =
        await Promise.all([
          supabase.from("player_profiles").select("display_name, avatar_key").eq("user_id", user.id).single(),
          supabase.from("player_state").select("*").eq("user_id", user.id).single(),
        ]);

      if (stateError || !stateData) {
        setMessage("Could not load your game state.");
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setState(stateData);

      const { data: jobData } = await supabase
        .from("game_jobs")
        .select("id, name, category, energy_cost, minutes_cost, min_pay_kobo, max_pay_kobo, required_reputation")
        .eq("location_id", stateData.location_id)
        .eq("is_active", true)
        .order("name");

      setJobs(jobData ?? []);
      setLoading(false);
    }

    load();
  }, []);

  function applyJobResult(result: Record<string, unknown>) {
    setState((current) =>
      current
        ? {
            ...current,
            cash_kobo: Number(result.cash_kobo),
            energy: Number(result.energy),
            hunger: Number(result.hunger),
            game_day: Number(result.game_day),
            minutes_today: Number(result.minutes_today),
          }
        : current,
    );

    setMessage(
      "You completed " + String(result.job_name) +
      " and earned " + formatNaira(Number(result.pay_kobo)) + ".",
    );
  }

  if (loading) {
    return <main className="game-shell"><div className="loading">Loading your life...</div></main>;
  }

  if (!state || !profile) {
    return (
      <main className="game-shell">
        <section className="player-card">
          <div>
            <span className="muted">Naija Hustle</span>
            <h2>Game setup needed</h2>
            <p>{message}</p>
          </div>
        </section>
      </main>
    );
  }

  const stats = [
    ["Cash", formatNaira(state.cash_kobo), "₦"],
    ["Energy", state.energy + "%", "⚡"],
    ["Hunger", state.hunger + "%", "🍲"],
    ["Health", state.health + "%", "❤"],
  ];

  return (
    <main className="game-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">ABUJA • DAY {state.game_day}</p>
          <h1>Naija Hustle</h1>
          <p className="hero-copy">Start with little. Work smart. Build your life.</p>
        </div>
        <div className="avatar">{profile.display_name.slice(0, 2).toUpperCase()}</div>
      </section>

      <section className="player-card">
        <div>
          <span className="muted">Your life</span>
          <h2>{profile.display_name}</h2>
          <p>{locationNames[state.location_id] ?? state.location_id}</p>
        </div>
        <span className="badge">Beginner</span>
      </section>

      <section className="stats-grid">
        {stats.map(([label, value, icon]) => (
          <article className="stat" key={label}>
            <span className="stat-icon">{icon}</span>
            <div><span className="muted">{label}</span><strong>{value}</strong></div>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="muted">WHAT WILL YOU DO?</span>
            <h2>Today&apos;s actions</h2>
          </div>
          <span className="time">{formatTime(state.minutes_today)}</span>
        </div>

        <div className="action-list">
          {actions.map(([title, description, icon]) => (
            <button
              className="action-card"
              key={title}
              type="button"
              onClick={() => {
                if (title === "Find Work") {
                  setShowWork((value) => !value);
                  setMessage("");
                } else {
                  setMessage("That action is coming next.");
                }
              }}
            >
              <span className="action-icon">{icon}</span>
              <span className="action-copy"><strong>{title}</strong><span>{description}</span></span>
              <span className="arrow">›</span>
            </button>
          ))}
        </div>

        {showWork && (
          <div className="work-panel">
            <div className="work-panel-heading">
              <div>
                <span className="muted">AVAILABLE HERE</span>
                <h3>Jobs in {locationNames[state.location_id] ?? state.location_id}</h3>
              </div>
              <button className="close-button" type="button" onClick={() => setShowWork(false)}>Close</button>
            </div>
            <WorkPanel jobs={jobs} state={state} onComplete={applyJobResult} formatNaira={formatNaira} />
          </div>
        )}

        {message && <p className="game-message">{message}</p>}
      </section>

      <nav className="bottom-nav">
        <a className="active" href="#">Home</a>
        <a href="#">Map</a>
        <a href="#" onClick={() => setShowWork(true)}>Work</a>
        <a href="#">Life</a>
      </nav>
    </main>
  );
}
