import { Modal } from '../components/Modal';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  Download,
  FileQuestion,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Empty,
  Field,
  Loading,
  PageTitle,
  Pagination,
  SearchBox,
  Status,
} from '../components/UI';
import { api, date, errorMessage, human, money, useResource } from '../lib/api';
export function AdminDashboard() {
  const r = useResource('/admin/dashboard');
  const d = r.data;
  return (
    <>
      <PageTitle
        eyebrow="MISSION MRCEM ADMINISTRATION"
        title="A clearer view of your platform."
        text="Manage the learning experience, from the first question to the next milestone."
      >
        <Link to="/admin/questions" className="btn btn-dark">
          <Plus size={17} />
          Manage questions
        </Link>
      </PageTitle>
      <Alert message={r.error} />
      {r.loading ? (
        <Loading />
      ) : (
        d && (
          <>
            <div className="admin-stats">
              {Object.entries(d.stats).map(([key, value]) => (
                <div className="admin-stat" key={key}>
                  <span>{human(key)}</span>
                  <strong>{String(value)}</strong>
                  <ArrowUpRight size={18} />
                </div>
              ))}
            </div>
            <div className="admin-quick-links">
              {[
                [
                  '/admin/courses',
                  'Shape your courses',
                  'Manage courses and learning pathways',
                  BookOpen,
                ],
                [
                  '/admin/questions',
                  'Build the question bank',
                  'Create, organise and import questions',
                  FileQuestion,
                ],
                [
                  '/admin/users',
                  'Support your doctors',
                  'View accounts and enrollment activity',
                  Users,
                ],
              ].map(([to, title, desc, Icon]) => {
                const I = Icon;
                return (
                  <Link key={String(to)} to={String(to)} className="panel">
                    <I size={24} />
                    <h3>{String(title)}</h3>
                    <p>{String(desc)}</p>
                    <ArrowRight size={18} />
                  </Link>
                );
              })}
            </div>
            <div className="two-column">
              <section className="panel">
                <div className="panel-heading">
                  <h3>Recent registrations</h3>
                  <Link className="text-link" to="/admin/users">
                    View all
                    <ArrowRight size={15} />
                  </Link>
                </div>
                {d.recent_users.map((u) => (
                  <div className="simple-row" key={u.id}>
                    <span className="avatar">{u.name.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <strong>{u.name}</strong>
                      <small>{u.email}</small>
                    </div>
                    <span>{date(u.created_at)}</span>
                  </div>
                ))}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Recent attempts</h3>
                  <Link className="text-link" to="/admin/results">
                    View all
                    <ArrowRight size={15} />
                  </Link>
                </div>
                {d.recent_attempts.length ? (
                  d.recent_attempts.map((a) => (
                    <div className="simple-row" key={a.id}>
                      <div>
                        <strong>{a.exam?.title}</strong>
                        <small>{a.user?.name}</small>
                      </div>
                      <Status value={a.status} />
                    </div>
                  ))
                ) : (
                  <Empty
                    title="Ready for the first attempt"
                    text="Exam activity will appear here."
                  />
                )}
              </section>
            </div>
            <section className="panel content-section">
              <div className="panel-heading">
                <h3>Recent payments</h3>
                <Link to="/admin/payments" className="text-link">
                  Review payments
                  <ArrowRight size={15} />
                </Link>
              </div>
              {d.recent_payments.length ? (
                d.recent_payments.map((p) => (
                  <div className="simple-row" key={p.id}>
                    <div>
                      <strong>
                        {p.user?.name} · {p.course?.title}
                      </strong>
                      <small>{p.transaction_reference}</small>
                    </div>
                    <strong>{money(p.amount)}</strong>
                    <Status value={p.status} />
                  </div>
                ))
              ) : (
                <Empty title="All caught up" text="Submitted course payments will appear here." />
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
const descriptions = {
  courses: 'Create learning pathways and manage course access.',
  exams: 'Build focused assessments with their own rules and timing.',
  questions: 'A flexible, shared library for all your exams.',
  subjects: 'Optional categories to keep your question bank organised.',
  users: 'Support the doctors learning on your platform.',
  enrollments: 'Manage access to courses and enrollment status.',
  payments: 'Review transaction references and activate paid enrollments.',
  results: 'Review attempts and grade written responses.',
};
const titles = {
  courses: 'Your courses.',
  exams: 'Your examinations.',
  questions: 'The question bank.',
  subjects: 'A little organisation.',
  users: 'Your learning community.',
  enrollments: 'Course enrollments.',
  payments: 'Payment reviews.',
  results: 'Results & manual grading.',
};
export function AdminList({ kind }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [subject, setSubject] = useState('');
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const filterOptions = useResource(
    ['exams', 'enrollments', 'payments'].includes(kind) ? '/admin/filter-options' : null,
  );
  const [edit, setEdit] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const path = `/admin/${kind}?${new URLSearchParams({ page, search, subject, status: filter, type: typeFilter, course_id: courseFilter })}`;
  const r = useResource(path);
  const subjects = useResource(kind === 'questions' ? '/admin/subjects' : null);
  const rows = Array.isArray(r.data) ? r.data : r.data?.data || [];
  const create = ['courses', 'exams', 'questions', 'subjects'].includes(kind);
  useEffect(() => {
    setPage(1);
    setSearch('');
    setSubject('');
    setFilter('');
    setTypeFilter('');
    setCourseFilter('');
    setEdit(null);
    setDetail(null);
    setError('');
    setSuccess('');
  }, [kind]);
  async function save(data) {
    setBusy(true);
    setError('');
    try {
      if (edit?.id) await api.put(`/admin/${kind}/${edit.id}`, data);
      else await api.post(`/admin/${kind}`, data);
      if (!edit?.id) {
        setSearch('');
        setSubject('');
        setFilter('');
        setTypeFilter('');
        setCourseFilter('');
        setPage(1);
        navigate(`/admin/${kind}`, { replace: true });
      }
      setEdit(null);
      setSuccess(
        !edit?.id && kind === 'courses'
          ? `Course created. ${data.status === 'published' ? 'It is now first in the public catalogue.' : 'Publish it when ready to show it in the public catalogue.'}`
          : 'Changes saved.',
      );
      window.scrollTo({ top: 0, behavior: 'instant' });
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(row) {
    if (
      !window.confirm(
        kind === 'subjects'
          ? 'Delete this subject? Its questions will become Uncategorized.'
          : 'Archive this item? Existing exam history will be preserved.',
      )
    )
      return;
    try {
      await api.delete(`/admin/${kind}/${row.id}`);
      setSuccess(kind === 'subjects' ? 'Subject removed.' : 'Item archived.');
      r.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function showUser(row) {
    setError('');
    try {
      const { data } = await api.get(`/admin/users/${row.id}`);
      setDetail(data);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <>
      <PageTitle eyebrow="ADMIN WORKSPACE" title={titles[kind]} text={descriptions[kind]}>
        {kind === 'questions' && (
          <Link className="btn btn-outline" to="/admin/questions/import">
            <Upload size={16} />
            Import Excel
          </Link>
        )}
        {create && (
          <button
            className="btn btn-dark"
            onClick={() => {
              setEdit({});
              setError('');
            }}
          >
            <Plus size={17} />
            Add{' '}
            {kind === 'subjects'
              ? 'subject'
              : kind === 'questions'
                ? 'question'
                : kind === 'courses'
                  ? 'course'
                  : 'exam'}
          </button>
        )}
      </PageTitle>
      <Alert message={!edit ? error || r.error : r.error} />
      <Alert message={success} success />
      <div className="catalog-toolbar">
        <SearchBox
          value={search}
          onChange={(s) => {
            setSearch(s);
            setPage(1);
          }}
          placeholder={`Search ${kind}…`}
        />
        {kind === 'questions' && (
          <select
            aria-label="Filter by subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All subjects</option>
            <option value="uncategorized">Uncategorized</option>
            {subjects.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter by status"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {(kind === 'payments'
            ? ['pending', 'approved', 'rejected']
            : kind === 'enrollments'
              ? ['pending', 'active', 'expired', 'cancelled']
              : ['users', 'subjects'].includes(kind)
                ? ['active', 'inactive']
                : ['draft', 'published', 'inactive']
          ).map((v) => (
            <option key={v} value={v}>
              {human(v)}
            </option>
          ))}
        </select>
        {['courses', 'questions'].includes(kind) && (
          <select
            aria-label="Filter by type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            {(kind === 'courses'
              ? ['free', 'paid']
              : ['single_choice', 'text_response', 'information']
            ).map((v) => (
              <option key={v} value={v}>
                {human(v)}
              </option>
            ))}
          </select>
        )}
        {['exams', 'enrollments', 'payments'].includes(kind) && (
          <select
            aria-label="Filter by course"
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All courses</option>
            {filterOptions.data?.courses?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.deleted_at ? ' (archived)' : ''}
              </option>
            ))}
          </select>
        )}
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            setSearch('');
            setSubject('');
            setFilter('');
            setTypeFilter('');
            setCourseFilter('');
            setPage(1);
          }}
        >
          Reset filters
        </button>
        <span className="muted small">{r.data?.total ?? rows.length} records</span>
      </div>
      {r.loading ? (
        <Loading />
      ) : rows.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  {kind === 'questions'
                    ? 'Question'
                    : kind === 'users'
                      ? 'Doctor'
                      : kind === 'results'
                        ? 'Exam / Doctor'
                        : kind === 'payments' || kind === 'enrollments'
                          ? 'Doctor / Course'
                          : 'Name'}
                </th>
                <th>Details</th>
                <th>{kind === 'results' ? 'Result' : 'Status'}</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong className="table-title">
                      {row.title ||
                        row.question_text ||
                        row.name ||
                        row.exam?.title ||
                        row.user?.name}
                    </strong>
                    <small>
                      {row.short_description ||
                        row.email ||
                        row.course?.title ||
                        row.user?.name ||
                        row.subject?.name ||
                        (kind === 'questions' ? 'Uncategorized' : '')}
                    </small>
                  </td>
                  <td>
                    {kind === 'courses' ? (
                      <>
                        {row.course_type === 'free' ? 'Free' : money(row.price)}
                        <small>
                          {row.exams_count} exams · {row.enrollments_count} enrollments
                        </small>
                      </>
                    ) : kind === 'exams' ? (
                      <>
                        {row.duration_minutes} minutes
                        <small>
                          {row.questions_count} questions · {row.total_marks} marks
                        </small>
                      </>
                    ) : kind === 'questions' ? (
                      <>
                        {human(row.question_type)}
                        <small>{row.options.length} options</small>
                      </>
                    ) : kind === 'subjects' ? (
                      `${row.questions_count} questions`
                    ) : kind === 'users' ? (
                      <>
                        {row.enrollments_count} courses<small>{row.attempts_count} attempts</small>
                      </>
                    ) : kind === 'payments' ? (
                      <>
                        {money(row.amount)}
                        <small>
                          {row.payment_method} · {row.transaction_reference}
                        </small>
                      </>
                    ) : kind === 'results' ? (
                      <>
                        {date(row.started_at)}
                        <small>
                          {row.pending_count > 0
                            ? `${row.pending_count} responses to grade`
                            : human(row.status)}
                        </small>
                      </>
                    ) : (
                      <>
                        Enrolled {date(row.enrolled_at)}
                        <small>Expires {date(row.expires_at)}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {kind === 'results' ? (
                      row.status === 'in_progress' ? (
                        <Status value={row.status} />
                      ) : (
                        <>
                          <strong>
                            {row.score} / {row.total_marks}
                          </strong>
                          {row.pending_count > 0 && <small>Provisional</small>}
                        </>
                      )
                    ) : (
                      <Status value={row.status} />
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {kind === 'results' ? (
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={row.status === 'in_progress'}
                          onClick={() => navigate(`/admin/results/${row.id}`)}
                        >
                          Review
                          <ArrowRight size={14} />
                        </button>
                      ) : (
                        <>
                          {kind === 'users' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => void showUser(row)}
                            >
                              Details
                            </button>
                          )}
                          <button
                            className="icon-button"
                            aria-label={`Edit ${row.title || row.name || kind}`}
                            title={kind === 'payments' ? 'Review payment' : 'Edit'}
                            disabled={kind === 'payments' && row.status !== 'pending'}
                            onClick={() => {
                              setEdit(row);
                              setError('');
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          {create && (
                            <button
                              className="icon-button danger"
                              aria-label={`Archive ${row.title || row.name || 'question'}`}
                              onClick={() => void remove(row)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="Nothing here just yet"
          text="New records will appear here. Try adjusting your filters."
        />
      )}
      {r.data?.last_page && <Pagination page={page} last={r.data.last_page} onChange={setPage} />}{' '}
      {edit && (
        <Modal
          title={`${edit.id ? 'Edit' : 'Create'} ${{ courses: 'course', exams: 'exam', questions: 'question', subjects: 'subject', users: 'account', payments: 'payment review', enrollments: 'enrollment' }[kind]}`}
          busy={busy}
          wide={['exams', 'questions'].includes(kind)}
          closeLabel="Close editor"
          onClose={() => setEdit(null)}
        >
          <Alert message={error} />
          {kind === 'questions' ? (
            <QuestionEditor row={edit} busy={busy} onSave={save} />
          ) : kind === 'exams' ? (
            <ExamEditor row={edit} busy={busy} onSave={save} />
          ) : (
            <SimpleEditor kind={kind} row={edit} busy={busy} onSave={save} />
          )}
        </Modal>
      )}
      {detail && (
        <Modal title={detail.name} closeLabel="Close details" onClose={() => setDetail(null)}>
          <p>{detail.email}</p>
          <h3>Enrolled courses</h3>
          {detail.enrollments.map((en) => (
            <div className="simple-row" key={en.id}>
              <strong>{en.course?.title}</strong>
              <Status value={en.status} />
            </div>
          ))}
          <h3>Exam attempts</h3>
          {detail.attempts.map((a) => (
            <div className="simple-row" key={a.id}>
              <span>{a.exam?.title}</span>
              {a.status === 'in_progress' ? (
                <Status value={a.status} />
              ) : (
                <Link to={`/admin/results/${a.id}`} className="text-link">
                  Review result
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          ))}
        </Modal>
      )}
    </>
  );
}
function SimpleEditor({ kind, row, onSave, busy }) {
  const [type, setType] = useState(row.course_type || 'free');
  function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (kind === 'courses') {
      data.price = type === 'free' ? 0 : Number(data.price);
      data.course_type = type;
    }
    if (kind === 'enrollments' && !data.expires_at) data.expires_at = null;
    void onSave(data);
  }
  return (
    <form onSubmit={submit}>
      {kind === 'courses' ? (
        <>
          <Field label="Course title">
            <input name="title" defaultValue={row.title} required maxLength={255} />
          </Field>
          <Field
            label="URL slug"
            hint="Lowercase letters, numbers and hyphens, for example mrcem-primary."
          >
            <input name="slug" defaultValue={row.slug} required pattern="[a-z0-9-]+" />
          </Field>
          <Field label="Short description">
            <textarea
              name="short_description"
              defaultValue={row.short_description}
              required
              maxLength={500}
              rows={2}
            />
          </Field>
          <Field label="Full description">
            <textarea
              name="description"
              defaultValue={row.description}
              required
              maxLength={30000}
              rows={5}
            />
          </Field>
          <div className="form-grid">
            <Field label="Course type">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </Field>
            {type === 'paid' && (
              <Field label="Price (BDT)">
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={row.price || ''}
                  required
                />
              </Field>
            )}
          </div>
        </>
      ) : kind === 'subjects' ? (
        <Field label="Subject name">
          <input name="name" defaultValue={row.name} required maxLength={150} />
        </Field>
      ) : kind === 'payments' ? (
        <>
          <div className="review-payment-summary">
            <h3>{row.course?.title}</h3>
            <p>
              {row.user?.name} · {row.user?.email}
            </p>
            <strong>{money(row.amount)}</strong>
            <p>
              {row.payment_method}: {row.transaction_reference}
            </p>
            <p>Paid on {date(row.paid_at)}</p>
          </div>
          <Field label="Review note">
            <textarea name="review_note" maxLength={2000} rows={3} />
          </Field>
        </>
      ) : kind === 'users' ? (
        <p>
          Account: <strong>{row.name}</strong>
          <br />
          {row.email}
        </p>
      ) : (
        <>
          <p>
            <strong>{row.user?.name}</strong>
            <br />
            {row.course?.title}
          </p>
          <Field label="Expires on (optional)">
            <input
              name="expires_at"
              type="date"
              defaultValue={row.expires_at?.slice(0, 10) || ''}
            />
          </Field>
        </>
      )}
      <Field label={kind === 'payments' ? 'Review decision' : 'Status'}>
        <select
          name="status"
          defaultValue={
            kind === 'payments'
              ? 'approved'
              : row.status || (['users', 'subjects'].includes(kind) ? 'active' : 'draft')
          }
        >
          {(kind === 'payments'
            ? ['approved', 'rejected']
            : kind === 'enrollments'
              ? ['pending', 'active', 'expired', 'cancelled']
              : ['users', 'subjects'].includes(kind)
                ? ['active', 'inactive']
                : ['draft', 'published', 'inactive']
          ).map((s) => (
            <option key={s} value={s}>
              {human(s)}
            </option>
          ))}
        </select>
      </Field>
      <div className="editor-footer">
        <span>
          {kind === 'payments'
            ? 'Approval activates the course enrollment.'
            : 'Changes are validated before saving.'}
        </span>
        <button className="btn btn-dark" disabled={busy}>
          <Save size={16} />
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
function QuestionEditor({ row, onSave, busy }) {
  const subjects = useResource('/admin/subjects');
  const [type, setType] = useState(row.question_type || 'single_choice');
  const [options, setOptions] = useState(
    (row.options || []).map((o) => ({ ...o, key: crypto.randomUUID() })),
  );
  function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    void onSave({
      ...f,
      subject_id: f.subject_id ? Number(f.subject_id) : null,
      question_type: type,
      options:
        type === 'single_choice'
          ? options.map((o, i) => ({
              option_text: o.option_text,
              sort_order: i,
              is_correct: !!o.is_correct,
            }))
          : [],
    });
  }
  function move(i, dir) {
    const next = [...options];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setOptions(next);
  }
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <Field label="Question type">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="single_choice">Single choice</option>
            <option value="text_response">Text response</option>
            <option value="information">Information question</option>
          </select>
        </Field>
        <Field label="Subject (optional)">
          <select name="subject_id" defaultValue={row.subject_id || ''}>
            <option value="">Uncategorized</option>
            {subjects.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.status === 'inactive' ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Question text">
        <textarea
          name="question_text"
          defaultValue={row.question_text}
          required
          rows={4}
          maxLength={30000}
        />
      </Field>
      {type === 'single_choice' ? (
        <section className="option-editor">
          <div className="section-heading compact">
            <div>
              <h3>Answer options</h3>
              <p>Add as many as you need. Select the correct answer.</p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                setOptions([
                  ...options,
                  { key: crypto.randomUUID(), option_text: '', is_correct: false },
                ])
              }
            >
              <Plus size={15} />
              Add option
            </button>
          </div>
          {options.length ? (
            options.map((o, i) => (
              <div className="option-editor-row" key={o.key}>
                <input
                  aria-label={`Option ${i + 1} is correct`}
                  type="radio"
                  name="correct_option"
                  checked={!!o.is_correct}
                  onChange={() =>
                    setOptions(options.map((x, j) => ({ ...x, is_correct: i === j })))
                  }
                />
                <span>{i + 1}</span>
                <input
                  aria-label={`Option ${i + 1} text`}
                  value={o.option_text}
                  required
                  maxLength={10000}
                  placeholder="Option text"
                  onChange={(e) =>
                    setOptions(
                      options.map((x, j) => (i === j ? { ...x, option_text: e.target.value } : x)),
                    )
                  }
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move option ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move option ${i + 1} down`}
                  disabled={i === options.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  className="icon-button danger"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => setOptions(options.filter((_, j) => i !== j))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          ) : (
            <div className="information-note">
              No options yet. You can save an incomplete draft. Publishing requires at least two
              options and one correct answer.
            </div>
          )}
        </section>
      ) : (
        <div className="information-note">
          {type === 'text_response'
            ? 'Doctors write their response. An administrator awards marks after submission.'
            : 'An information question is not scored and does not require an answer.'}
        </div>
      )}
      <Field label="Explanation (optional)">
        <textarea name="explanation" defaultValue={row.explanation} rows={3} maxLength={30000} />
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={row.status || 'draft'}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="inactive">Inactive</option>
        </select>
      </Field>
      <div className="editor-footer">
        <span>Subjects and options are optional for drafts.</span>
        <button className="btn btn-dark" disabled={busy}>
          <Save size={16} />
          {busy ? 'Saving…' : 'Save question'}
        </button>
      </div>
    </form>
  );
}
function ExamEditor(props) {
  const full = useResource(props.row.id ? `/admin/exams/${props.row.id}` : null);
  return props.row.id && full.loading ? (
    <Loading />
  ) : full.error ? (
    <Alert message={full.error} />
  ) : (
    <ExamForm {...props} row={full.data || props.row} />
  );
}
function ExamForm({ row, onSave, busy }) {
  const [coursePage, setCoursePage] = useState(1);
  const courses = useResource(`/admin/courses?page=${coursePage}`);
  const [allCourses, setAllCourses] = useState([]);
  useEffect(() => {
    if (courses.data) {
      setAllCourses((old) =>
        Array.from(new Map([...old, ...courses.data.data].map((c) => [c.id, c])).values()),
      );
      if (courses.data.current_page < courses.data.last_page)
        setCoursePage(courses.data.current_page + 1);
    }
  }, [courses.data]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const bank = useResource(`/admin/questions?search=${encodeURIComponent(search)}&page=${page}`);
  const [assigned, setAssigned] = useState(
    (row.questions || []).map((q) => ({ ...q, marks: q.pivot.marks })),
  );
  function move(i, dir) {
    const next = [...assigned];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setAssigned(next);
  }
  function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = Object.fromEntries(f);
    for (const key of [
      'negative_marking',
      'shuffle_questions',
      'shuffle_options',
      'show_result',
      'show_correct_answers',
    ])
      data[key] = f.has(key);
    for (const key of [
      'course_id',
      'duration_minutes',
      'pass_mark',
      'attempt_limit',
      'negative_mark_value',
    ])
      data[key] = Number(data[key] || 0);
    data.questions = assigned.map((q, i) => ({
      question_id: q.id,
      marks: q.question_type === 'information' ? 0 : Number(q.marks),
      sort_order: i,
    }));
    void onSave(data);
  }
  return (
    <form onSubmit={submit}>
      <Field label="Exam title">
        <input name="title" required defaultValue={row.title} />
      </Field>
      <Field label="Course">
        <select name="course_id" required defaultValue={row.course_id || ''}>
          <option value="">Select a course</option>
          {allCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea name="description" defaultValue={row.description} rows={2} />
      </Field>
      <div className="form-grid three-fields">
        {[
          ['duration_minutes', 'Duration (minutes)', 30],
          ['attempt_limit', 'Attempt limit', 3],
          ['pass_mark', 'Pass mark', 0],
        ].map(([key, label, fallback]) => (
          <Field key={key} label={String(label)}>
            <input
              name={String(key)}
              type="number"
              min={key === 'pass_mark' ? 0 : 1}
              step={key === 'pass_mark' ? '0.01' : '1'}
              defaultValue={row[String(key)] ?? fallback}
              required
            />
          </Field>
        ))}
      </div>
      <div className="exam-settings-grid">
        {[
          ['negative_marking', 'Deduct marks for incorrect choices', false],
          ['shuffle_questions', 'Shuffle questions', false],
          ['shuffle_options', 'Shuffle answer options', false],
          ['show_result', 'Show results after submission', true],
          ['show_correct_answers', 'Allow correct-answer review', true],
        ].map(([key, label, fallback]) => (
          <label className="checkbox-label" key={String(key)}>
            <input
              name={String(key)}
              type="checkbox"
              defaultChecked={row[String(key)] ?? fallback}
            />
            {String(label)}
          </label>
        ))}
      </div>
      <Field label="Deduction per incorrect choice">
        <input
          name="negative_mark_value"
          type="number"
          min={0}
          step="0.01"
          defaultValue={row.negative_mark_value || 0}
        />
      </Field>
      <section className="exam-assignment">
        <div className="section-heading compact">
          <h3>Assigned questions</h3>
          <Badge>
            {assigned.reduce(
              (n, q) => n + (q.question_type === 'information' ? 0 : Number(q.marks)),
              0,
            )}{' '}
            total marks
          </Badge>
        </div>
        {!assigned.length && <p className="muted">Choose questions from the bank below.</p>}
        {assigned.map((q, i) => (
          <div className="assignment-row" key={q.id}>
            <span className="exam-index">{i + 1}</span>
            <div>
              <strong>{q.question_text}</strong>
              <small>
                {human(q.question_type)} · {human(q.status)}
              </small>
            </div>
            <label className="marks-input">
              <span>Marks</span>
              <input
                aria-label={`Marks for question ${i + 1}`}
                type="number"
                min={q.question_type === 'information' ? 0 : 0.01}
                step="0.01"
                disabled={q.question_type === 'information'}
                value={q.question_type === 'information' ? 0 : q.marks}
                onChange={(e) =>
                  setAssigned(
                    assigned.map((x, j) => (i === j ? { ...x, marks: e.target.value } : x)),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="icon-button"
              aria-label="Move question up"
              disabled={i === 0}
              onClick={() => move(i, -1)}
            >
              <ArrowUp size={15} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Move question down"
              disabled={i === assigned.length - 1}
              onClick={() => move(i, 1)}
            >
              <ArrowDown size={15} />
            </button>
            <button
              type="button"
              className="icon-button danger"
              aria-label="Remove question"
              onClick={() => setAssigned(assigned.filter((_, j) => i !== j))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <div className="bank-picker">
          <SearchBox
            placeholder="Search question bank…"
            value={search}
            onChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
          />
          <Alert message={bank.error} />
          {bank.data?.data
            .filter((q) => !assigned.some((a) => a.id === q.id))
            .map((q) => (
              <div className="bank-row" key={q.id}>
                <span>
                  {q.question_text}
                  <small>
                    {human(q.question_type)} · {q.subject?.name || 'Uncategorized'} · {q.status}
                  </small>
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    setAssigned([
                      ...assigned,
                      { ...q, marks: q.question_type === 'information' ? 0 : 1 },
                    ])
                  }
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            ))}
          {bank.data && <Pagination page={page} last={bank.data.last_page} onChange={setPage} />}
        </div>
      </section>
      <Field label="Exam status">
        <select name="status" defaultValue={row.status || 'draft'}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="inactive">Inactive</option>
        </select>
      </Field>
      <div className="editor-footer">
        <span>Total marks are calculated from assigned questions.</span>
        <button className="btn btn-dark" disabled={busy}>
          <Save size={16} />
          {busy ? 'Saving…' : 'Save exam'}
        </button>
      </div>
    </form>
  );
}
export function AdminSettings() {
  const r = useResource('/settings');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/admin/settings', Object.fromEntries(new FormData(e.currentTarget)));
      setSuccess('Payment instructions updated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="PLATFORM SETTINGS"
        title="The finishing details."
        text="Set the payment instructions doctors see when joining a premium course."
      />
      <Alert message={error || r.error} />
      <Alert message={success} success />
      {r.loading ? (
        <Loading />
      ) : (
        <form className="panel padded settings-form" onSubmit={save}>
          <Field
            label="Payment instructions"
            hint="Include your payment method, account details, and any reference instructions."
          >
            <textarea
              name="payment_instructions"
              rows={8}
              maxLength={5000}
              required
              defaultValue={r.data?.payment_instructions}
            />
          </Field>
          <p className="muted">Course currency: {r.data?.currency}</p>
          <button className="btn btn-dark" disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      )}
    </>
  );
}
export function ImportQuestions() {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [skip, setSkip] = useState(false);
  async function template() {
    try {
      const { data } = await api.get('/admin/question-import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mission-mrcem-question-template.xlsx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function upload(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    setPreview(null);
    const f = new FormData(e.currentTarget);
    f.set('create_subjects', f.has('create_subjects') ? '1' : '0');
    try {
      const { data } = await api.post('/admin/question-import/preview', f);
      setPreview(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/admin/question-import/${preview?.id}/confirm`, {
        skip_invalid: skip,
      });
      setSuccess(`Imported ${data.imported} questions. Skipped ${data.skipped} invalid questions.`);
      setPreview(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="GROW YOUR QUESTION BANK"
        title="Bring your questions along."
        text="Import an Excel workbook, review the preview, then confirm."
      >
        <button className="btn btn-outline" onClick={() => void template()}>
          <Download size={17} />
          Download template
        </button>
      </PageTitle>
      <Alert message={error} />
      <Alert message={success} success />
      <div className="two-column">
        <form className="panel padded" onSubmit={upload}>
          <span className="icon-tile">
            <Upload />
          </span>
          <h2>Upload your workbook</h2>
          <p>
            Use the Questions sheet and an optional Options sheet. Blank subjects and variable
            option counts are supported.
          </p>
          <Field label="Excel workbook (.xlsx)">
            <input
              name="file"
              type="file"
              accept=".xlsx"
              required
              onChange={() => setPreview(null)}
            />
          </Field>
          <label className="checkbox-label">
            <input name="create_subjects" type="checkbox" defaultChecked />
            Create unknown subjects
          </label>
          <button className="btn btn-dark" disabled={busy}>
            {busy ? 'Processing…' : 'Preview import'}
            <ArrowRight size={16} />
          </button>
        </form>
        <section className="panel padded">
          <h3>A flexible format</h3>
          <ol className="instruction-list">
            <li>Give each question a unique question_key.</li>
            <li>Leave subject blank for Uncategorized questions.</li>
            <li>Add any number of option rows linked by question_key.</li>
            <li>
              Published single-choice questions need at least two options and exactly one correct
              answer.
            </li>
            <li>
              Text and information questions have no options. Incomplete single-choice questions can
              be saved as drafts.
            </li>
          </ol>
          <p className="muted small">
            Maximum 10 MB / 25,000 workbook rows per import. Previews expire after one hour.
          </p>
        </section>
      </div>
      {preview && (
        <section className="content-section">
          <div className="section-heading">
            <h2>Check your preview</h2>
            <div className="inline-facts">
              <Badge>{preview.valid_count} valid</Badge>
              <Badge tone="amber">{preview.skipped_count} skipped</Badge>
            </div>
          </div>
          {preview.errors.length > 0 && (
            <div className="import-errors">
              <h3>{preview.errors.length} issues to review</h3>
              {preview.errors.map((e, i) => (
                <p key={i}>
                  <strong>
                    {e.sheet} row {e.row}
                    {e.key ? ` (${e.key})` : ''}:
                  </strong>{' '}
                  {e.message}
                </p>
              ))}
            </div>
          )}
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Question</th>
                  <th>Options</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((q, i) => (
                  <tr key={i}>
                    <td>{q.key}</td>
                    <td>
                      {q.question_text}
                      <small>{q.subject}</small>
                    </td>
                    <td>{q.option_count}</td>
                    <td>
                      <Badge tone={q.valid ? 'green' : 'red'}>
                        {q.valid ? 'Ready' : 'Invalid'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="import-confirm">
            {preview.errors.length > 0 && (
              <label className="checkbox-label">
                <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
                Import valid questions only and skip invalid rows
              </label>
            )}
            <button
              className="btn btn-dark"
              disabled={busy || !preview.valid_count || (preview.errors.length > 0 && !skip)}
              onClick={() => void confirm()}
            >
              <Check size={17} />
              {busy ? 'Importing…' : `Confirm ${preview.valid_count} questions`}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
