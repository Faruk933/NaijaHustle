"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

const locationNames: Record<string, string> = {
  "central-area": "Central Area, Abuja",
  wuse: "Wuse, Abuja",
  garki: "Garki, Abuja",
  jabi: "Jabi, Abuja",
};

const actions = [
  { title: "Find Work", description: "Look for a job or daily hustle.", icon: "💼" },
  { title: "Eat", description: "Restore hunger and keep moving.", icon: "🍛" },
  { title: "Travel", description: "Move around Abuja.", icon: "🚌" },
  { title: "Explore", description: "Discover places and opportunities.", icon: "🗺️" },
];

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

function formatGameTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${mins.toString().padStart(2, "0")} ${suffix}`;
}

export default function Home() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [state, setState] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlayer() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          setMessage("Enable Anonymous Sign-Ins in Supabase Auth to start the game.");
          setLoading(false);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
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

      if (stateError) {
        setMessage("Could not load your game state.");
      } else {
        setProfile(profileData);
        setState(stateData);
      }

      setLoading(false);
    }

    loadPlayer();
  }, []);

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
    { label: "Cash", value: formatNaira(state.cash_kobo), icon: "₦" },
    { label: "Energy", value: `${state.energy}%`, icon: "⚡" },
    { label: "Hunger", value: `${state.hunger}%`, icon: "🍲" },
    { label: "Health", value: `${state.health}%`, icon: "❤" },
  ];

  return (
    <main className="game-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">ABUJA • DAY {state.game_day}</p>
          <h1>Naija Hustle</h1>
          <p className="hero-copy">Start with little. Work smart. Build your life.</p>
        </div>
        <div className="avatar" aria-label="Player avatar">
          {profile.display_name.slice(0, 2).toUpperCase()}
        </div>
      </section>

      <section className="player-card">
        <div>
          <span className="muted">Your life</span>
          <h2>{profile.display_name}</h2>
          <p>{locationNames[state.location_id] ?? state.location_id}</p>
        </div>
        <span className="badge">Beginner</span>
      </section>

      <section className="stats-grid" aria-label="Player status">
        {stats.map((stat) => (
          <article className="stat" key={stat.label}>
            <span className="stat-icon">{stat.icon}</span>
            <div>
              <span className="muted">{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="muted">WHAT WILL YOU DO?</span>
            <h2>Today&apos;s actions</h2>
          </div>
          <span className="time">{formatGameTime(state.minutes_today)}</span>
        </div>

        <div className="action-list">
          {actions.map((action) => (
            <button className="action-card" key={action.title} type="button" onClick={() => setMessage("Gameplay action coming next.")}>
              <span className="action-icon">{action.icon}</span>
              <span className="action-copy">
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </span>
              <span className="arrow">›</span>
            </button>
          ))}
        </div>
        {message && <p className="game-message">{message}</p>}
      </section>

      <nav className="bottom-nav" aria-label="Game navigation">
        <a className="active" href="#">Home</a>
        <a href="#">Map</a>
        <a href="#">Work</a>
        <a href="#">Life</a>
      </nav>
    </main>
  );
}
