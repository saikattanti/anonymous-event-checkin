import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="landing-container">
      <div className="landing-hero">
        
        <div className="hero-badge">
          <span className="hero-badge-icon">✨</span> NEW — PRIVATE CHECK-INS ARE LIVE
        </div>

        <h1>
          Private event check-ins <br />
          that actually <span className="gradient-text">work</span>
        </h1>
        
        <p>
          Unifies anonymous ticketing, zero-knowledge proofs, and public headcount
          in one calm workspace — so your attendees stop worrying and start engaging.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/app" className="cta-button">
            Launch Check-in App <span>→</span>
          </Link>
          <a href="https://github.com/midnight-ntwrk" target="_blank" rel="noopener noreferrer" className="cta-ghost">
            View Documentation
          </a>
        </div>

        <div className="hero-footer">
          Powered by Midnight Network · Zero-Knowledge Proofs · Decentralized
        </div>
      </div>
    </div>
  );
}
