import { courseTheme } from '../lib/courseTheme';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Children, cloneElement, isValidElement, useId } from 'react';
import { human, money } from '../lib/api';
export function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="Mission MRCEM home">
      <span className="brand-logo-frame">
        <img className="brand-logo" src="/images/hamed-logo.png" alt="Hamed — Critical & Emergency Medicine" width="500" height="347" />
      </span>
    </Link>
  );
}
export function Badge({ children, tone = 'green' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Status({ value }) {
  return (
    <Badge
      tone={
        ['inactive', 'rejected', 'expired', 'cancelled'].includes(value)
          ? 'red'
          : ['draft', 'pending', 'in_progress'].includes(value)
            ? 'amber'
            : 'green'
      }
    >
      {human(value)}
    </Badge>
  );
}
export function Alert({ message, success = false }) {
  return message ? (
    <div role={success ? 'status' : 'alert'} className={`alert ${success ? 'alert-success' : ''}`}>
      {message}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={22} className="spin" /> Loading your workspace…
    </div>
  );
}
export function Empty({ title, text, children }) {
  return (
    <div className="empty">
      <span className="icon-tile">
        <BookOpen />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function PageTitle({ eyebrow, title, text, children }) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children && <div className="title-actions">{children}</div>}
    </div>
  );
}
export function Field({ label, children, hint }) {
  const id = useId();
  const controls = Children.map(children, function connect(child) {
    if (!isValidElement(child)) return child;
    if (['input', 'select', 'textarea'].includes(child.type)) {
      return cloneElement(child, { id, 'aria-describedby': hint ? `${id}-hint` : undefined });
    }
    return child.props.children
      ? cloneElement(child, {}, Children.map(child.props.children, connect))
      : child;
  });
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {controls}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-box">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="icon-button"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
export function Pagination({ page, last, onChange }) {
  return last > 1 ? (
    <div className="pagination">
      <button
        type="button"
        className="btn btn-outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span>
        Page {page} of {last}
      </span>
      <button
        type="button"
        className="btn btn-outline"
        disabled={page >= last}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  ) : null;
}
export function CourseArt({ variant = 0, small = false }) {
  return (
    <div className={`course-art art-${variant % 3} ${small ? 'art-small' : ''}`} aria-hidden="true">
      <div className="art-grid" />
      <svg viewBox="0 0 300 170" fill="none">
        <circle cx="150" cy="85" r="57" stroke="currentColor" strokeWidth="1" opacity=".35" />
        <circle cx="150" cy="85" r="72" stroke="currentColor" strokeDasharray="3 7" opacity=".25" />
        {variant % 3 === 0 ? (
          <>
            <path
              d="M131 46h38v20h20v38h-20v20h-38v-20h-20V66h20z"
              fill="currentColor"
              opacity=".85"
            />
            <path
              d="M97 85h34l10-17 15 33 11-16h36"
              stroke="var(--art-bg)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : variant % 3 === 1 ? (
          <>
            <path
              d="M117 114V61c12-7 23-6 33 1 10-7 23-8 33-1v53c-12-7-22-6-33 0-11-6-22-7-33 0z"
              fill="currentColor"
              opacity=".7"
            />
            <path
              d="M150 64v47m-22-38 12 3m-12 10 12 3m20-13 12-3m-12 16 12-3"
              stroke="var(--art-bg)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M150 42l40 17v30c0 23-40 40-40 40s-40-17-40-40V59z"
              fill="currentColor"
              opacity=".75"
            />
            <path
              d="M127 85h13l7-13 9 26 7-13h13"
              stroke="var(--art-bg)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        <path
          d="M53 42v12m-6-6h12m187 69v12m-6-6h12"
          stroke="currentColor"
          opacity=".6"
          strokeWidth="2"
        />
      </svg>
      <span className="art-label">
        MISSION MRCEM <span>✦</span>
      </span>
    </div>
  );
}
export function CourseCard({ course, enrolled = false, index = 0 }) {
  return (
    <article className="course-card" style={courseTheme(course)}>
      <Link to={`/courses/${course.slug}`} tabIndex={-1} aria-hidden="true">
        <CourseArt variant={course.id - 1} />
      </Link>
      <div className="course-card-body">
        <div className="card-kicker">
          {enrolled ? (
            <Badge>
              <Check size={12} /> Enrolled
            </Badge>
          ) : (
            <Badge tone={course.course_type === 'paid' ? 'purple' : 'green'}>
              {course.course_type === 'free' ? 'Free course' : 'Premium'}
            </Badge>
          )}
        </div>
        <h3>
          <Link to={`/courses/${course.slug}`}>{course.title}</Link>
        </h3>
        <p>{course.short_description}</p>
        <div className="course-card-footer">
          <span>
            <BookOpen size={15} />
            {course.exams_count || course.exams?.length || 0} practice exams
          </span>
          <strong>{course.course_type === 'free' ? 'Free' : money(course.price)}</strong>
        </div>
        <Link className="course-cta" to={`/courses/${course.slug}`}>
          {enrolled ? 'Continue learning' : 'Explore course'}
          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}
export function StudyNote() {
  return (
    <div className="study-note">
      <Sparkles size={20} />
      <div>
        <h4>A little progress, every day.</h4>
        <p>Short, focused practice sessions can fit around even your busiest shifts.</p>
      </div>
    </div>
  );
}
