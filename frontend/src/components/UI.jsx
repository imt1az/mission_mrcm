import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Children, cloneElement, isValidElement, useId } from 'react';
import { human, money } from '../lib/api';
export function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="Mission MRCEM home">
      <span className="brand-mark">
        M<span>+</span>
      </span>
      <span>
        MISSION<span className="brand-sub">MRCEM</span>
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
  const Icon = [Stethoscope, BookOpen, ShieldCheck][variant % 3];
  return (
    <div className={`course-art art-${variant % 3} ${small ? 'art-small' : ''}`} aria-hidden="true">
      <Icon className="course-art-symbol" size={54} strokeWidth={1.6} />
      <span className="art-label">MISSION MRCEM</span>
    </div>
  );
}
export function CourseCard({ course, enrolled = false, index = 0 }) {
  return (
    <article className={`course-card course-tone-${index % 3}`}>
      <Link to={`/courses/${course.slug}`} tabIndex={-1} aria-hidden="true">
        <CourseArt variant={index} />
      </Link>
      <div className="course-card-body">
        <div className="card-kicker">
          <span>
            {course.slug.includes('primary')
              ? 'THE FOUNDATIONS'
              : course.slug.includes('sba')
                ? 'CLINICAL PRACTICE'
                : 'CONTINUING LEARNING'}
          </span>
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
