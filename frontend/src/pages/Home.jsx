import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { ArrowRight, BookOpen, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { CourseCard, Alert, Loading } from '../components/UI';
import { useResource } from '../lib/api';
import { MentorSection, VideoSection } from '../components/MentorSection';
import { HomeHero } from '../components/HomeHero';
export function Home() {
  const courses = useResource('/courses');
  const home = useRef(null);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || !('IntersectionObserver' in window)) return;
    const animations = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        if (motion.matches) return;
        const animation = target.animate(
          [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { threshold: 0.08 });
    home.current.querySelectorAll(':scope > section:not(.landing-hero), .feature-strip').forEach(el => observer.observe(el));
    const stopMotion = () => {
      if (motion.matches) {
        observer.disconnect();
        animations.forEach(animation => animation.cancel());
      }
    };
    motion.addEventListener('change', stopMotion);
    return () => {
      observer.disconnect();
      animations.forEach(animation => animation.cancel());
      motion.removeEventListener('change', stopMotion);
    };
  }, []);
  return (
    <div className="home-page" ref={home}>
      <HomeHero />
      <div className="feature-strip">
        <div className="container">
          <span>
            <BookOpen size={19} />
            Focused course pathways
          </span>
          <span>
            <Clock3 size={19} />
            Timed exam practice
          </span>
          <span>
            <ShieldCheck size={19} />
            Feedback that guides you
          </span>
        </div>
      </div>
      <section className="container section" id="courses">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR STARTING POINT</span>
            <h2>A course for your next step.</h2>
            <p>Build your foundations or put your knowledge into practice.</p>
          </div>
          <Link className="text-link" to="/courses">
            Explore all courses
            <ArrowRight size={17} />
          </Link>
        </div>
        <Alert message={courses.error} />
        {courses.loading ? (
          <Loading />
        ) : (
          <div className="course-grid">
            {courses.data?.data.slice(0, 3).map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        )}
      </section>
      <MentorSection />
      <VideoSection />
      <section className="how-section" id="how-it-works">
        <div className="container section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A CLEARER PATH FORWARD</span>
              <h2>Less friction. More learning.</h2>
            </div>
            <p>
              Start where you are.
              <br />
              Build from there.
            </p>
          </div>
          <div className="steps-grid">
            {[
              [
                '01',
                'Find your focus',
                'Choose the course that fits your current stage and your next goal.',
              ],
              [
                '02',
                'Make practice a habit',
                'Work through timed exams in a calm, focused learning space.',
              ],
              [
                '03',
                'Know your next step',
                'Review your results, reflect on feedback, and keep moving forward.',
              ],
            ].map(([n, t, p]) => (
              <div key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container home-bottom">
        <Sparkles />
        <h2>Make room for your next milestone.</h2>
        <Link className="btn btn-dark" to="/register">
          Start your journey
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
