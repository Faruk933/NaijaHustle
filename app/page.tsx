const stats = [
  { label: "Cash", value: "₦2,500", icon: "₦" },
  { label: "Energy", value: "82%", icon: "⚡" },
  { label: "Hunger", value: "64%", icon: "🍲" },
  { label: "Health", value: "100%", icon: "❤" },
];

const actions = [
  { title: "Find Work", description: "Look for a job or daily hustle.", icon: "💼" },
  { title: "Eat", description: "Restore hunger and keep moving.", icon: "🍛" },
  { title: "Travel", description: "Move around Abuja.", icon: "🚌" },
  { title: "Explore", description: "Discover places and opportunities.", icon: "🗺️" },
];

export default function Home() {
  return (
    <main className="game-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">ABUJA • DAY 1</p>
          <h1>Naija Hustle</h1>
          <p className="hero-copy">
            Start with little. Work smart. Build your life.
          </p>
        </div>
        <div className="avatar" aria-label="Player avatar">FH</div>
      </section>

      <section className="player-card">
        <div>
          <span className="muted">Your life</span>
          <h2>New Beginning</h2>
          <p>Central Area, Abuja</p>
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
          <span className="time">08:15 AM</span>
        </div>

        <div className="action-list">
          {actions.map((action) => (
            <button className="action-card" key={action.title} type="button">
              <span className="action-icon">{action.icon}</span>
              <span className="action-copy">
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </span>
              <span className="arrow">›</span>
            </button>
          ))}
        </div>
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
