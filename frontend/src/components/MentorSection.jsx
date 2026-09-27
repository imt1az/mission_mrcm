import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  GraduationCap,
  Play,
  Quote,
  Stethoscope,
  Youtube,
} from 'lucide-react';

const portrait = '/images/dr-abdul-hamed-mrcem.jpg';
const videoUrl = 'https://youtu.be/UJjp2ocB1ZI';

export function MentorSection() {
  return (
    <section className="mentor-section" id="our-mentor" aria-labelledby="mentor-title">
      <div className="container mentor-grid">
        <div className="mentor-portrait-wrap">
          <div className="mentor-photo-label">
            <span /> EXPERIENCE MEETS DEDICATION
          </div>
          <div className="mentor-portrait">
            <img
              src={portrait}
              width="1254"
              height="1254"
              loading="lazy"
              decoding="async"
              alt="Dr Abdul Hamed — MRCEM UK exam preparation, critical and emergency medicine"
            />
          </div>
          <div className="mentor-caption">
            <span className="mentor-caption-icon">
              <Award size={24} />
            </span>
            <div>
              <strong>Your goal. Our mission.</strong>
              <span>Expert guidance for your MRCEM journey.</span>
            </div>
            <span className="mentor-caption-star" aria-hidden="true">
              ✦
            </span>
          </div>
        </div>
        <div className="mentor-copy">
          <span className="eyebrow">THE PERSON BEHIND YOUR PROGRESS</span>
          <h2 id="mentor-title">
            Our Mentor<span>.</span>
          </h2>
          <h3>Dr Abdul Hamed</h3>
          <div className="mentor-specialty">
            <Stethoscope size={17} /> Critical &amp; Emergency Medicine
          </div>
          <p>
            After completing his O levels and A levels at Sunshine Grammar School, Dr Abdul Hamed
            completed his MBBS from the University of Chittagong.
          </p>
          <p>
            He successfully secured FCPS Part 1 in Internal Medicine in January 2019. He enrolled in
            the MD (Critical Care Medicine) residency in 2021 and is currently at Phase B level. He
            completed MRCEM in January 2025.
          </p>
          <p>
            He brings more than four years of experience teaching for different competitive
            examinations through centres across the country.
          </p>
          <div className="mentor-milestones">
            <div>
              <GraduationCap size={21} />
              <strong>MRCEM</strong>
              <span>Completed January 2025</span>
            </div>
            <div>
              <BookOpen size={21} />
              <strong>4+ years</strong>
              <span>Teaching experience</span>
            </div>
          </div>
          <Link to="/courses" className="btn btn-dark">
            Learn with our mentor <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function VideoSection() {
  const [playing, setPlaying] = useState(false);
  return (
    <section className="video-section" id="watch-video" aria-labelledby="video-title">
      <div className="container video-grid">
        <div className="video-copy">
          <span className="eyebrow">A CLOSER LOOK AT YOUR NEXT CHAPTER</span>
          <h2 id="video-title">
            Find your focus.
            <br />
            <em>See the possibilities.</em>
          </h2>
          <p>
            Get to know Mission MRCEM and take the next step in your preparation. Watch the video,
            then explore a course that fits your journey.
          </p>
          <a
            href={videoUrl}
            className="video-external-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Youtube size={21} /> Watch on YouTube <ArrowUpRight size={17} />
          </a>
          <div className="video-note">
            <Quote size={25} aria-hidden="true" />
            <span>
              Learn from experience.
              <br />
              <strong>Practise with purpose.</strong>
            </span>
          </div>
        </div>
        <div className="video-card">
          <div className="video-card-bar">
            <span className="video-live-dot" /> MISSION MRCEM <span>WATCH &amp; DISCOVER</span>
          </div>
          <div className="video-player">
            {playing ? (
              <iframe
                src="https://www.youtube-nocookie.com/embed/UJjp2ocB1ZI?autoplay=1&rel=0"
                title="Mission MRCEM video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button
                type="button"
                className="video-play-button"
                onClick={() => setPlaying(true)}
                aria-label="Play Mission MRCEM video"
              >
                <img src={portrait} alt="" loading="lazy" decoding="async" />
                <span className="video-poster-shade" />
                <span className="video-play-icon">
                  <Play size={30} fill="currentColor" />
                </span>
                <span className="video-play-caption">
                  A new chapter starts with you.<small>Press play to watch on this page</small>
                </span>
              </button>
            )}
          </div>
          <div className="video-card-footer">
            <span>Your MRCEM journey, one step at a time.</span>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open video on YouTube"
            >
              <ArrowRight size={17} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
