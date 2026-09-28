import { Modal } from '../components/Modal';
import { courseTheme } from '../lib/courseTheme';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  Clock3,
  FileCheck2,
  GraduationCap,
  Play,
  ShieldCheck,
} from 'lucide-react';
import {
  Alert,
  Badge,
  CourseArt,
  CourseCard,
  Empty,
  Field,
  Loading,
  PageTitle,
  Pagination,
  SearchBox,
  Status,
  StudyNote,
} from '../components/UI';
import { api, date, errorMessage, money, useResource } from '../lib/api';
import { useAuth } from '../context/AuthContext';
export function Dashboard() {
  const { user } = useAuth();
  const resource = useResource('/dashboard');
  const d = resource.data;
  const isActive = (en) =>
    en.status === 'active' && (!en.expires_at || new Date(en.expires_at) > new Date());
  const activeCourse = d?.enrollments.find(isActive)?.course;
  const featured = d
    ? [
        ...d.enrollments.map((en) => ({ course: en.course, enrolled: isActive(en) })),
        ...d.available_courses
          .filter((c) => !d.enrollments.some((en) => en.course.id === c.id))
          .map((course) => ({ course, enrolled: false })),
      ].slice(0, 3)
    : [];
  return (
    <div className="student-dashboard">
      <PageTitle title={`Welcome back, ${user?.name.replace(/^Dr\.\s*/, '').split(' ')[0]}.`} />
      <Alert message={resource.error} />
      {resource.loading ? (
        <Loading />
      ) : (
        d && (
          <>
            {/* <div className="dashboard-hero">
              <div>
                <h2>{activeCourse ? 'Continue learning' : 'Start your preparation'}</h2>
                <p>{activeCourse ? activeCourse.title : 'Choose a course to start practising.'}</p>
             
              </div>
              <div className="dashboard-hero-art" aria-hidden="true">
                <div className="hero-ring" />
                <div className="hero-ring ring-two" />
                <BookOpen size={70} strokeWidth={1.5} />
              </div>
            </div> */}
            <div className="stats-grid">
              <Stat icon={<BookOpen size={22} />} label="Active courses" value={d.enrolled_count} />
              <Stat icon={<FileCheck2 size={22} />} label="Exam attempts" value={d.attempt_count} />
              <Stat
                icon={<ChartNoAxesCombined size={22} />}
                label="Average score"
                value={d.average_score === null ? '—' : `${d.average_score}%`}
              />
            </div>
            {/* <section className="content-section">
              <div className="section-heading compact">
                <h2>Courses</h2>
                <Link to="/my-courses" className="text-link">
                  My courses <ArrowRight size={16} />
                </Link>
              </div>
              {featured.length ? (
                <div className="course-grid">
                  {featured.map((en, i) => (
                    <CourseCard
                      key={en.course.id}
                      course={en.course}
                      index={i}
                      enrolled={en.enrolled}
                    />
                  ))}
                </div>
              ) : (
                <Empty title="No courses yet" text="Browse available courses to get started.">
                  <Link className="btn btn-dark" to="/courses">
                    Browse courses <ArrowRight size={16} />
                  </Link>
                </Empty>
              )}
            </section> */}
            <section className="panel content-section dashboard-recent">
              <div className="panel-heading">
                <h3>Recent exams</h3>
                <Link to="/results" className="text-link">
                  View results <ArrowUpRight size={16} />
                </Link>
              </div>
              <HistoryList attempts={d.recent_attempts} />
            </section>
          </>
        )
      )}
    </div>
  );
}
function Stat({ icon, label, value }) {
  return (
    <div className="stat-card">
      <span className="icon-tile">{icon}</span>
      <div>
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
export function HistoryList({ attempts }) {
  return attempts.length ? (
    <div className="history-list">
      {attempts.map((a) => (
        <Link
          className="history-row"
          key={a.id}
          to={a.status === 'in_progress' ? `/attempts/${a.id}` : `/attempts/${a.id}/result`}
        >
          <span className="icon-tile">
            <FileCheck2 size={19} />
          </span>
          <span className="history-title">
            <strong>{a.title}</strong>
            <small>
              {date(a.started_at)}
              {a.pending_count ? ` · ${a.pending_count} awaiting grading` : ''}
            </small>
          </span>
          <span className="history-score">
            {a.score === null ? (
              <Status value={a.status} />
            ) : (
              <>
                <strong>
                  {a.score}
                  <small> / {a.total_marks}</small>
                </strong>
                <small>{a.pending_count ? 'Provisional score' : 'Earned marks'}</small>
              </>
            )}
          </span>
          <ArrowUpRight size={17} />
        </Link>
      ))}
    </div>
  ) : (
    <Empty title="No exams yet" text="Your exam attempts will appear here." />
  );
}
export function Courses() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const type = params.get('type') || '';
  const page = Number(params.get('page') || 1);
  const r = useResource(`/courses?${params.toString()}`);
  function filter(key, value) {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== 'page') p.delete('page');
    setParams(p, { replace: true });
  }
  return (
    <div className="container course-catalog">
      <PageTitle
        eyebrow="LEARN WITH PURPOSE"
        title="Your next step starts here."
        text="Find a course that meets you where you are, and takes you further."
      />
      <div className="catalog-toolbar">
        <div className="filter-tabs">
          {[
            ['', 'All courses'],
            ['free', 'Free courses'],
            ['paid', 'Premium courses'],
          ].map(([v, t]) => (
            <button
              key={v}
              className={type === v ? 'active' : ''}
              onClick={() => filter('type', v)}
            >
              {t}
            </button>
          ))}
        </div>
        <SearchBox
          value={search}
          onChange={(s) => filter('search', s)}
          placeholder="Find your course…"
        />
        <select
          aria-label="Sort courses"
          value={params.get('sort') || ''}
          onChange={(e) => filter('sort', e.target.value)}
        >
          <option value="">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
          <option value="price">Price: low to high</option>
        </select>
      </div>
      <Alert message={r.error} />
      {r.loading ? (
        <Loading />
      ) : r.data?.data.length ? (
        <>
          <div className="course-grid">
            {r.data.data.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
          <Pagination
            page={page}
            last={r.data.last_page}
            onChange={(p) => filter('page', String(p))}
          />
        </>
      ) : (
        <Empty title="No courses found" text="Try another search or explore all courses." />
      )}
      <StudyNote />
    </div>
  );
}
export function MyCourses() {
  const r = useResource('/my-courses');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const effectiveStatus = (row) =>
    row.status === 'active' && row.expires_at && new Date(row.expires_at) <= new Date()
      ? 'expired'
      : row.status;
  const rows = (r.data || []).filter(
    (row) =>
      (!status || effectiveStatus(row) === status) &&
      [row.course?.title, row.transaction_reference, row.payment_method]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR LEARNING LIBRARY"
        title="Room to grow."
        text="All your courses, in one focused space."
      >
        <Link className="btn btn-dark" to="/courses">
          Explore courses
          <ArrowUpRight size={17} />
        </Link>
      </PageTitle>
      <div className="catalog-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search courses" />
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">active</option>
          <option value="pending">pending</option>
          <option value="expired">expired</option>
          <option value="cancelled">cancelled</option>
        </select>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            setSearch('');
            setStatus('');
          }}
        >
          Reset filters
        </button>
      </div>
      <Alert message={r.error} />
      {r.loading ? (
        <Loading />
      ) : rows.length ? (
        <div className="course-grid">
          {rows.map((e, i) => (
            <div key={e.id}>
              {effectiveStatus(e) !== 'active' && (
                <div className="enrollment-status">
                  <Status value={effectiveStatus(e)} />
                </div>
              )}
              <CourseCard course={e.course} enrolled={effectiveStatus(e) === 'active'} index={i} />
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title={search || status ? 'No matching courses' : 'Find your first course'}
          text="Enroll in a course to begin your learning journey."
        >
          <Link className="btn btn-dark" to="/courses">
            Browse courses
          </Link>
        </Empty>
      )}
      <StudyNote />
    </>
  );
}
export function CourseDetails() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const r = useResource(`/courses/${slug}`);
  const enrolled = useResource(user ? '/my-courses' : null);
  const settings = useResource('/settings');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payment, setPayment] = useState(false);
  const c = r.data;
  const en = enrolled.data?.find((e) => e.course.id === c?.id);
  const active =
    en?.status === 'active' && (!en.expires_at || new Date(en.expires_at) > new Date());
  async function enroll() {
    if (!user) {
      navigate('/login', { state: { from: `/courses/${slug}` } });
      return;
    }
    if (c?.course_type === 'paid') {
      setError('');
      setPayment(true);
      return;
    }
    setBusy(true);
    try {
      await api.post(`/courses/${c?.id}/enroll`);
      enrolled.reload();
      setSuccess('You’re enrolled. Your next chapter is ready.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function pay(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const f = Object.fromEntries(new FormData(e.currentTarget));
      await api.post(`/courses/${c?.id}/payments`, f);
      setSuccess('Payment submitted. Your enrollment will activate after administrator approval.');
      setPayment(false);
      enrolled.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container course-detail" style={courseTheme(c)}>
      <Link className="text-link" to="/courses">
        <ArrowLeft size={16} />
        All courses
      </Link>
      <Alert message={r.error || (!payment ? error : '')} />
      <Alert message={success} success />
      {r.loading ? (
        <Loading />
      ) : (
        c && (
          <>
            <div className="course-detail-heading">
              <div>
                <div className="eyebrow">MRCEM EXAM PREPARATION</div>
                <h1>{c.title}</h1>
                <p>{c.short_description}</p>
                <div className="inline-facts">
                  <span>
                    <BookOpen size={17} />
                    {c.exams?.length} practice exams
                  </span>
                  <span>
                    <Clock3 size={17} />
                    Learn at your own pace
                  </span>
                  <Badge>{c.course_type === 'free' ? 'Free course' : 'Premium course'}</Badge>
                </div>
              </div>
            </div>
            <div className="course-detail-grid">
              <div>
                <section className="panel padded course-exams" aria-labelledby="course-exams-title">
                  <div className="section-heading compact">
                    <div>
                      <h2 id="course-exams-title">Practice exams</h2>
                    </div>
                    <Badge>{c.exams?.length} exams</Badge>
                  </div>
                  <div className="exam-list">
                    {c.exams?.map((ex, i) => (
                      <div key={ex.id} className="exam-list-item">
                        <span className="exam-index">{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <h3>{ex.title}</h3>
                          <p>
                            {ex.duration_minutes} minutes <span>·</span> {ex.questions_count}{' '}
                            questions <span>·</span> {ex.total_marks} marks
                          </p>
                        </div>
                        {active ? (
                          <Link className="btn btn-outline btn-sm" to={`/exams/${ex.id}`}>
                            View exam
                            <ArrowRight size={15} />
                          </Link>
                        ) : (
                          <ShieldCheck size={19} className="muted" />
                        )}
                      </div>
                    ))}
                    {!c.exams?.length && (
                      <Empty
                        title="More learning is on the way"
                        text="Practice exams will appear here when published."
                      />
                    )}
                  </div>
                </section>
                <section className="panel padded course-about">
                  <h2>About this course</h2>
                  <p className="prose-text">{c.description}</p>
                </section>
              </div>
              <aside>
                <div className="enroll-card">
                  <CourseArt variant={c.id - 1} />
                  <div className="enroll-card-body">
                    <span className="eyebrow">INVEST IN YOUR NEXT STEP</span>
                    <h2>{c.course_type === 'free' ? 'Free to learn.' : money(c.price)}</h2>
                    <p>
                      {c.course_type === 'free'
                        ? 'Create an account, enroll, and start your journey.'
                        : 'Submit your payment for administrator verification.'}
                    </p>
                    {active ? (
                      <div className="enrolled-notice">
                        <Check size={18} />
                        You’re enrolled
                      </div>
                    ) : en?.status === 'pending' ? (
                      <Alert success message="Your payment is awaiting approval." />
                    ) : (
                      <button
                        className="btn btn-dark btn-full"
                        disabled={busy || (enrolled.loading && !!user)}
                        onClick={enroll}
                      >
                        {busy
                          ? 'Please wait…'
                          : !user
                            ? 'Sign in to enroll'
                            : c.course_type === 'free'
                              ? 'Enroll for free'
                              : 'Submit payment'}
                        <ArrowRight size={17} />
                      </button>
                    )}
                    <ul className="course-benefits">
                      <li>
                        <Check size={16} />
                        Timed practice exams
                      </li>
                      <li>
                        <Check size={16} />
                        Progress and attempt history
                      </li>
                      <li>
                        <Check size={16} />
                        Review based on exam settings
                      </li>
                    </ul>
                  </div>
                </div>
                {payment && (
                  <Modal title="Payment details" busy={busy} onClose={() => setPayment(false)}>
                    <form className="payment-form" onSubmit={pay}>
                      <p>
                        <strong>
                          {c.title} · {money(c.price)}
                        </strong>
                      </p>
                      <Alert message={error} />
                      <p className="prose-text">{settings.data?.payment_instructions}</p>
                      <Field label="Payment method">
                        <select name="payment_method" required>
                          <option value="bKash">bKash</option>
                          <option value="Nagad">Nagad</option>
                          <option value="Bank transfer">Bank transfer</option>
                        </select>
                      </Field>
                      <Field label="Transaction reference">
                        <input name="transaction_reference" required maxLength={255} />
                      </Field>
                      <Field label="Payment date">
                        <input
                          name="paid_at"
                          type="date"
                          required
                          max={new Date().toISOString().slice(0, 10)}
                        />
                      </Field>
                      <button className="btn btn-dark btn-full" disabled={busy}>
                        Submit for approval
                      </button>
                    </form>
                  </Modal>
                )}
              </aside>
            </div>
          </>
        )
      )}
    </div>
  );
}
export function ExamInstructions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const r = useResource(`/exams/${id}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ex = r.data;
  async function start() {
    setBusy(true);
    try {
      const { data } = await api.post(`/exams/${id}/start`);
      navigate(
        data.status === 'in_progress' ? `/attempts/${data.id}` : `/attempts/${data.id}/result`,
      );
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  const ongoing = ex?.attempts.find((a) => a.status === 'in_progress');
  const exhausted = ex && !ongoing && ex.attempts.length >= ex.attempt_limit;
  return (
    <>
      <Link className="text-link" to="/my-courses">
        <ArrowLeft size={16} />
        My courses
      </Link>
      <Alert message={r.error || error} />
      {r.loading ? (
        <Loading />
      ) : (
        ex && (
          <>
            <PageTitle eyebrow={ex.course_title} title={ex.title} text={ex.description} />
            <div className="exam-intro-grid">
              <section className="panel padded">
                <div className="icon-tile">
                  <GraduationCap size={26} />
                </div>
                <h2>A moment to focus.</h2>
                <p>Settle in, take a breath, and give yourself room to think.</p>
                <div className="exam-facts">
                  <div>
                    <Clock3 />
                    <strong>{ex.duration_minutes} min</strong>
                    <span>Exam duration</span>
                  </div>
                  <div>
                    <BookOpen />
                    <strong>{ex.questions_count}</strong>
                    <span>Total questions</span>
                  </div>
                  <div>
                    <ChartNoAxesCombined />
                    <strong>{ex.total_marks}</strong>
                    <span>Possible marks</span>
                  </div>
                </div>
                <h3>Before you begin</h3>
                <ul className="instruction-list">
                  <li>Your timer continues if you refresh or close your browser.</li>
                  <li>Answers are saved as you work. Check the save indicator before leaving.</li>
                  <li>
                    The exam ends automatically at the deadline; late answers cannot be accepted.
                  </li>
                  <li>
                    {ex.negative_marking
                      ? `${ex.negative_mark_value} marks are deducted for an incorrect choice.`
                      : 'No marks are deducted for incorrect choices.'}
                  </li>
                  <li>
                    Written responses are reviewed by an administrator. A final result appears after
                    grading.
                  </li>
                  <li>
                    {ex.show_result
                      ? 'Your result will be available after submission.'
                      : 'Results are hidden for this exam.'}{' '}
                    {ex.show_result && ex.show_correct_answers ? 'Answer review is enabled.' : ''}
                  </li>
                </ul>
                <div className="start-exam-footer">
                  <span>
                    {ex.attempts.length} of {ex.attempt_limit} attempts used · Pass mark:{' '}
                    {ex.pass_mark}
                  </span>
                  <button className="btn btn-dark" onClick={start} disabled={busy || !!exhausted}>
                    {busy
                      ? 'Preparing your exam…'
                      : ongoing
                        ? 'Resume exam'
                        : exhausted
                          ? 'Attempt limit reached'
                          : 'Begin exam'}
                    <Play size={16} />
                  </button>
                </div>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Your previous attempts</h3>
                </div>
                <HistoryList attempts={ex.attempts} />
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}
export function Results() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const r = useResource(`/my-attempts?${new URLSearchParams({ page, search, status })}`);
  return (
    <>
      <PageTitle
        eyebrow="REFLECT. LEARN. KEEP GOING."
        title="Every attempt is progress."
        text="Review your exams and see how far you’ve come."
      />
      <div className="catalog-toolbar">
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search exams"
        />
        <select
          aria-label="Attempt status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All attempts</option>
          <option value="submitted">Submitted</option>
          <option value="expired">Expired</option>
          <option value="in_progress">In progress</option>
        </select>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            setSearch('');
            setStatus('');
            setPage(1);
          }}
        >
          Reset filters
        </button>
      </div>
      <Alert message={r.error} />
      {r.loading ? (
        <Loading />
      ) : (
        <section className="panel">
          <HistoryList attempts={r.data?.data || []} />
        </section>
      )}
      {r.data && <Pagination page={page} last={r.data.last_page} onChange={setPage} />}
    </>
  );
}
export function Profile() {
  const { user, setUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null);
  async function save(e, password = false) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.put(
        password ? '/auth/password' : '/auth/profile',
        Object.fromEntries(new FormData(form)),
      );
      if (!password) setUser(data);
      else form.reset();
      setSuccess(password ? data.message : 'Your profile has been updated.');
      setEditor(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your account."
        text="Keep your details up to date and your account secure."
      />
      <Alert message={!editor ? error : ''} />
      <Alert message={success} success />
      <div className="two-column">
        <section className="panel padded profile-summary">
          <h2>Personal details</h2>
          <p>
            <strong>{user?.name}</strong>
          </p>
          <p>{user?.email}</p>
          <button
            className="btn btn-dark"
            onClick={() => {
              setError('');
              setEditor('profile');
            }}
          >
            Edit profile
          </button>
        </section>
        <section className="panel padded profile-summary">
          <h2>Password</h2>
          <button
            className="btn btn-outline"
            onClick={() => {
              setError('');
              setEditor('password');
            }}
          >
            Change password
          </button>
        </section>
      </div>
      {editor === 'profile' && (
        <Modal title="Personal details" busy={busy} onClose={() => setEditor(null)}>
          <Alert message={error} />
          <form onSubmit={(e) => save(e)}>
            <Field label="Full name">
              <input name="name" required defaultValue={user?.name} />
            </Field>
            <Field label="Email address">
              <input name="email" type="email" required defaultValue={user?.email} />
            </Field>
            <button className="btn btn-dark" disabled={busy}>
              Save changes
            </button>
          </form>
        </Modal>
      )}
      {editor === 'password' && (
        <Modal title="Change password" busy={busy} onClose={() => setEditor(null)}>
          <Alert message={error} />
          <form onSubmit={(e) => save(e, true)}>
            <Field label="Current password">
              <input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field
              label="New password"
              hint="At least 10 characters, including a letter and a number."
            >
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
              />
            </Field>
            <Field label="Confirm new password">
              <input
                name="password_confirmation"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
              />
            </Field>
            <button className="btn btn-dark" disabled={busy}>
              Update password
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Payments() {
  const r = useResource('/my-payments');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const effectiveStatus = (row) =>
    row.status === 'active' && row.expires_at && new Date(row.expires_at) <= new Date()
      ? 'expired'
      : row.status;
  const rows = (r.data || []).filter(
    (row) =>
      (!status || effectiveStatus(row) === status) &&
      [row.course?.title, row.transaction_reference, row.payment_method]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR COURSE PAYMENTS"
        title="A clear record."
        text="Track your submitted payments and enrollment approvals."
      />
      <div className="catalog-toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search payments" />
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">pending</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
        </select>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            setSearch('');
            setStatus('');
          }}
        >
          Reset filters
        </button>
      </div>
      <Alert message={r.error} />
      {r.loading ? (
        <Loading />
      ) : rows.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Submitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.course.title}</strong>
                    <small>{p.review_note}</small>
                  </td>
                  <td>
                    {p.transaction_reference}
                    <small>{p.payment_method}</small>
                  </td>
                  <td>{money(p.amount)}</td>
                  <td>{date(p.paid_at)}</td>
                  <td>
                    <Status value={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={search || status ? 'No matching payments' : 'No payments yet'}
          text="Payments for premium courses will appear here."
        >
          <Link className="btn btn-outline" to="/courses?type=paid">
            Explore premium courses
          </Link>
        </Empty>
      )}
    </>
  );
}
