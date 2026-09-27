import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';

export function HomeHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="container landing-hero-copy">
        <p className="landing-hero-eyebrow">CRITICAL &amp; EMERGENCY MEDICINE</p>
        <h1 id="landing-hero-title">MRCEM Exam Preparation</h1>
        <p className="landing-hero-description">
          Study emergency medicine with focused courses, practice questions, and timed exams. Learn
          with Dr Abdul Hamed and prepare at your own pace.
        </p>
        <div className="landing-hero-actions">
          <Link className="btn btn-dark btn-lg" to="/courses">
            Explore courses <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <a className="btn btn-outline btn-lg" href="#watch-video">
            <Play size={16} aria-hidden="true" /> Watch introduction
          </a>
        </div>
      </div>
    </section>
  );
}
