import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, FileCheck2 } from 'lucide-react';
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
import { date, useResource } from '../lib/api';
import { courseTheme } from '../lib/courseTheme';

export function AdminResults() {
  const [params, setParams] = useSearchParams();
  const courseId = params.get('course_id');
  const examId = params.get('exam_id');
  const results = !!examId || params.get('view') === 'all';
  const stage = results ? 'results' : courseId ? 'result-exams' : 'result-courses';
  const resource = useResource(`/admin/${stage}?${params}`);
  const options = useResource('/admin/filter-options');
  const rows = resource.data?.data || [];
  const course = options.data?.courses?.find((c) => String(c.id) === courseId);
  const title = results
    ? 'Student results'
    : courseId
      ? course?.title || 'Exams'
      : 'Results by course';
  function filter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }
  function clear() {
    const next = new URLSearchParams();
    if (courseId) next.set('course_id', courseId);
    if (examId) next.set('exam_id', examId);
    if (params.get('exam_title')) next.set('exam_title', params.get('exam_title'));
    if (params.get('view')) next.set('view', params.get('view'));
    setParams(next);
  }
  return (
    <div className="result-browser">
      <PageTitle title={title} eyebrow="RESULTS & GRADING">
        <Link className="btn btn-outline" to="/admin/results?view=all">
          All student results
        </Link>
      </PageTitle>
      <nav className="result-breadcrumbs" aria-label="Results navigation">
        <Link to="/admin/results" aria-current={!courseId && !results ? 'page' : undefined}>
          1. Courses
        </Link>
        <ArrowRight size={15} />
        {courseId ? (
          <Link
            to={`/admin/results?course_id=${courseId}`}
            aria-current={!results ? 'page' : undefined}
          >
            2. Exams
          </Link>
        ) : (
          <span>2. Exams</span>
        )}
        <ArrowRight size={15} />
        <span aria-current={results ? 'page' : undefined}>3. Student results</span>
      </nav>
      {results && params.get('exam_title') && (
        <h2 className="selected-exam-title">{params.get('exam_title')}</h2>
      )}
      <div className="catalog-toolbar browse-filters">
        <SearchBox
          value={params.get('search') || ''}
          onChange={(v) => filter('search', v)}
          placeholder={
            results ? 'Student name, email or exam' : courseId ? 'Search exams' : 'Search courses'
          }
        />
        {!courseId && !results && (
          <select
            aria-label="Course type"
            value={params.get('type') || ''}
            onChange={(e) => filter('type', e.target.value)}
          >
            <option value="">All course types</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        )}
        {(courseId || results) && (
          <select
            aria-label="Filter status"
            value={params.get('status') || ''}
            onChange={(e) => filter('status', e.target.value)}
          >
            <option value="">All statuses</option>
            {(results
              ? ['in_progress', 'submitted', 'expired']
              : ['draft', 'published', 'inactive']
            ).map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        )}
        {results && (
          <>
            <Field label="From date">
              <input
                type="date"
                value={params.get('date_from') || ''}
                onChange={(e) => filter('date_from', e.target.value)}
              />
            </Field>
            <Field label="To date">
              <input
                type="date"
                value={params.get('date_to') || ''}
                onChange={(e) => filter('date_to', e.target.value)}
              />
            </Field>
            <select
              aria-label="Sort results"
              value={params.get('sort') || ''}
              onChange={(e) => filter('sort', e.target.value)}
            >
              <option value="">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={params.get('pending') === '1'}
                onChange={(e) => filter('pending', e.target.checked ? '1' : '')}
              />
              Needs grading
            </label>
          </>
        )}
        <button className="btn btn-outline btn-sm" onClick={clear}>
          Reset filters
        </button>
      </div>
      <Alert message={resource.error || options.error} />
      {resource.loading ? (
        <Loading />
      ) : (
        <>
          {results && resource.data?.summary && (
            <div className="admin-stats result-browser-stats">
              {Object.entries(resource.data.summary).map(([key, value]) => (
                <div className="admin-stat" key={key}>
                  <span>{key.replaceAll('_', ' ')}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
          {!rows.length ? (
            <Empty title="No matching records" text="Try adjusting your filters." />
          ) : results ? (
            <div className="panel table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student / Exam</th>
                    <th>Score</th>
                    <th>Answers</th>
                    <th>Status</th>
                    <th>Dates</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong className="table-title">{a.user?.name}</strong>
                        <small>{a.user?.email}</small>
                        <small>
                          {a.exam_title || a.exam?.title} · Attempt #{a.id}
                        </small>
                      </td>
                      <td>
                        <strong>
                          {a.status === 'in_progress' ? '—' : `${a.score} / ${a.total_marks}`}
                        </strong>
                        <small>{a.percentage !== null ? `${a.percentage}%` : 'In progress'}</small>
                        {a.pending_count > 0 ? (
                          <Badge tone="amber">Provisional</Badge>
                        ) : (
                          a.passed !== null && (
                            <Badge tone={a.passed ? 'green' : 'red'}>
                              {a.passed ? 'Passed' : 'Below pass mark'}
                            </Badge>
                          )
                        )}
                      </td>
                      <td>
                        {a.status === 'in_progress' ? (
                          '—'
                        ) : (
                          <>
                            <small>
                              {a.correct_count} correct · {a.wrong_count} wrong
                            </small>
                            <small>{a.unanswered_count} unanswered</small>
                            {a.pending_count > 0 && <strong>{a.pending_count} to grade</strong>}
                          </>
                        )}
                      </td>
                      <td>
                        <Status value={a.status} />
                      </td>
                      <td>
                        <small>Started {date(a.started_at)}</small>
                        <small>Submitted {date(a.submitted_at)}</small>
                      </td>
                      <td>
                        {a.status === 'in_progress' ? (
                          <span>In progress</span>
                        ) : (
                          <Link
                            className="btn btn-outline btn-sm"
                            to={`/admin/results/${a.id}`}
                            state={{ resultsBack: `/admin/results?${params}` }}
                          >
                            Review <ArrowRight size={14} />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={courseId ? 'course-grid' : 'results-course-list'}>
              {rows.map((row) => (
                <Link
                  key={row.id}
                  className="result-browse-card"
                  style={courseTheme(courseId ? { id: row.course_id } : row)}
                  to={`/admin/results?${new URLSearchParams(courseId ? { course_id: courseId, exam_id: row.id, exam_title: row.title } : { course_id: row.id })}`}
                >
                  <span className="browse-icon">{courseId ? <FileCheck2 /> : <BookOpen />}</span>
                  <h2>{row.title}</h2>
                  <div className="inline-facts">
                    <Status value={row.status} />
                    {row.deleted_at && <Badge>Archived</Badge>}
                  </div>
                  <div className="browse-counts">
                    {!courseId && (
                      <span>
                        <strong>{row.exams_count}</strong> Exams
                      </span>
                    )}
                    <span>
                      <strong>{row.attempts_count}</strong> Attempts
                    </span>
                    {courseId && (
                      <span>
                        <strong>{row.grading_count}</strong> To grade
                      </span>
                    )}
                  </div>
                  <span className="text-link">
                    {courseId ? 'View student results' : 'View exams'} <ArrowRight size={17} />
                  </span>
                </Link>
              ))}
            </div>
          )}
          {resource.data && (
            <Pagination
              page={Number(params.get('page') || 1)}
              last={resource.data.last_page}
              onChange={(p) => filter('page', String(p))}
            />
          )}
        </>
      )}
    </div>
  );
}
