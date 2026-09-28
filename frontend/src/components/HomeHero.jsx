import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, GraduationCap, Play, Stethoscope } from 'lucide-react';

export function HomeHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="container landing-hero-grid">
        <div className="landing-hero-copy">
          <div className="landing-hero-eyebrow">
            <span aria-hidden="true" />
            MRCEM (UK) EXAM PREPARATION
          </div>
          <h1 id="landing-hero-title">
            A clear path to <em>your MRCEM.</em>
          </h1>
          <p className="landing-hero-description">
            Build your foundations. Put your knowledge into practice. Take your next step in
            emergency medicine with guidance from Dr Abdul Hamed.
          </p>
          <ul className="landing-hero-benefits" aria-label="Your learning experience">
            <li>
              <Check size={15} aria-hidden="true" />
              Expert guidance
            </li>
            <li>
              <Check size={15} aria-hidden="true" />
              Focused learning
            </li>
            <li>
              <Check size={15} aria-hidden="true" />
              Exam practice
            </li>
          </ul>
          <div className="landing-hero-actions">
            <Link className="btn landing-hero-primary" to="/courses">
              Explore courses
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <a className="landing-hero-video" href="#watch-video">
              <span>
                <Play size={15} fill="currentColor" aria-hidden="true" />
              </span>
              Watch introduction
            </a>
          </div>
          <div className="landing-hero-note">
            <GraduationCap size={24} aria-hidden="true" />
            <p>
              For doctors with a goal.<span>Learn at your pace. Move forward with purpose.</span>
            </p>
          </div>
        </div>
        <figure className="landing-hero-figure">
          <div className="landing-hero-artwork">
            <img
              src="/images/dr-abdul-hamed-mrcem.jpg"
              alt="Dr Abdul Hamed — Critical and Emergency Medicine, MRCEM exam preparation"
              width="1254"
              height="1254"
              fetchPriority="high"
              decoding="async"
            />
            <div className="landing-hero-experience">
              <strong>4+</strong>
              <span>
                YEARS OF
                <br />
                TEACHING
              </span>
            </div>
          </div>
          <figcaption>
            <span className="landing-hero-mentor-icon">
              <Stethoscope size={24} aria-hidden="true" />
            </span>
            <div>
              <span>LEARN WITH YOUR MENTOR</span>
              <strong>Dr Abdul Hamed</strong>
            </div>
            <a href="#our-mentor" aria-label="Meet Dr Abdul Hamed">
              <ArrowUpRight size={23} aria-hidden="true" />
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
