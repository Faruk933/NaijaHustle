"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

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

type PlayerState = {
  energy: number;
  reputation: number;
};

type Props = {
  jobs: GameJob[];
  state: PlayerState;
  onComplete: (result: Record<string, unknown>) => void;
  formatNaira: (kobo: number) => string;
};

export default function WorkPanel({ jobs, state, onComplete, formatNaira }: Props) {
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function work(job: GameJob) {
    setWorking(job.id);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Your game session expired. Please reload the game.");
      setWorking(null);
      return;
    }
    const { data, error: invokeError } = await supabase.functions.invoke("perform-job", {
      body: { job_id: job.id },
      headers: { Authorization: "Bearer " + session.access_token },
    });

    if (invokeError || data?.error) {
      setError(invokeError?.message || data?.error || "Could not complete that job.");
      setWorking(null);
      return;
    }

    onComplete(data.result);
    setWorking(null);
  }

  if (!jobs.length) {
    return <p className="empty-state">No jobs are available here yet.</p>;
  }

  return (
    <div className="job-list">
      {error && <p className="game-message">{error}</p>}
      {jobs.map((job) => {
        const canWork =
          state.energy >= job.energy_cost &&
          state.reputation >= job.required_reputation;

        return (
          <article className="job-card" key={job.id}>
            <div className="job-copy">
              <span className="job-category">{job.category}</span>
              <h3>{job.name}</h3>
              <p>{job.minutes_cost} min • {job.energy_cost} energy</p>
            </div>
            <div className="job-action">
              <strong>{formatNaira(job.min_pay_kobo)}–{formatNaira(job.max_pay_kobo)}</strong>
              <button
                type="button"
                disabled={!canWork || working !== null}
                onClick={() => work(job)}
              >
                {working === job.id ? "Working..." : canWork ? "Work" : "Locked"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
