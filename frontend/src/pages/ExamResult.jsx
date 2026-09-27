import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock3, FileCheck2, Trophy, X } from 'lucide-react';
import { Alert, Badge, Field, Loading, PageTitle } from '../components/UI';
import { api, date, errorMessage, useResource } from '../lib/api';
export function ExamResult({ admin = false }) {
  const { id } = useParams();
  const r = useResource(admin ? `/admin/results/${id}` : `/exam-attempts/${id}/result`);
  const result = r.data;
  return (
    <>
      <Link className="text-link" to={admin ? '/admin/results' : '/results'}>
        <ArrowLeft size={16} />
        All results
      </Link>
      <Alert message={r.error} />
      {r.loading ? (
        <Loading />
      ) : (
        result && (
          <>
            <PageTitle
              eyebrow={admin ? `RESULT FOR ${result.user?.name}` : result.course_title}
              title={result.title}
              text={`Submitted ${date(result.submitted_at)}${result.status === 'expired' ? ' · Finished at the time limit' : ''}`}
            />
            {!result.result_visible ? (
              <div className="panel padded">
                <FileCheck2 size={30} />
                <h2>Your exam is submitted.</h2>
                <p>{result.message}</p>
              </div>
            ) : (
              <>
                <div className="result-summary">
                  <div
                    className="result-ring"
                    style={{ '--score': `${Math.max(0, Math.min(100, result.percentage || 0))}%` }}
                  >
                    <div>
                      <strong>{result.percentage === null ? '—' : `${result.percentage}%`}</strong>
                      <span>{result.pending_count ? 'AWAITING GRADING' : 'YOUR RESULT'}</span>
                    </div>
                  </div>
                  <div>
                    <Badge
                      tone={result.pending_count ? 'amber' : result.passed ? 'green' : 'neutral'}
                    >
                      {result.pending_count ? (
                        <>
                          <Clock3 size={13} />
                          Manual review pending
                        </>
                      ) : result.passed ? (
                        <>
                          <Trophy size={13} />
                          Pass mark reached
                        </>
                      ) : (
                        'Keep building your knowledge'
                      )}
                    </Badge>
                    <h2>
                      {result.pending_count
                        ? 'One more step to your result.'
                        : result.passed
                          ? 'A step forward. Well done.'
                          : 'Every attempt teaches you something.'}
                    </h2>
                    <p>
                      {result.pending_count
                        ? `${result.pending_count} written response${result.pending_count === 1 ? '' : 's'} awaiting review. Your current score is provisional.`
                        : 'Take a moment to reflect, review your answers, and plan your next practice session.'}
                    </p>
                    <span className="result-marks">
                      <strong>{result.score}</strong> / {result.total_marks} marks <span>·</span>{' '}
                      Pass mark: {result.pass_mark}
                    </span>
                  </div>
                </div>
                <div className="result-counts">
                  <div>
                    <span className="result-dot green" />
                    Correct choices<strong>{result.correct_count}</strong>
                  </div>
                  <div>
                    <span className="result-dot red" />
                    Incorrect choices<strong>{result.wrong_count}</strong>
                  </div>
                  <div>
                    <span className="result-dot gray" />
                    Unanswered<strong>{result.unanswered_count}</strong>
                  </div>
                  <div>
                    <span className="result-dot amber" />
                    Pending grading<strong>{result.pending_count}</strong>
                  </div>
                </div>
                {result.review_visible ? (
                  <section className="content-section">
                    <div className="section-heading">
                      <div>
                        <h2>A closer look at your answers.</h2>
                        <p>Use each question as a starting point for your next step.</p>
                      </div>
                    </div>
                    {result.questions.map((q, i) => (
                      <ReviewQuestion
                        key={q.id}
                        question={q}
                        index={i}
                        admin={admin}
                        attemptId={result.id}
                        onGraded={r.reload}
                      />
                    ))}
                  </section>
                ) : (
                  <div className="panel padded">
                    <p>Answer review is disabled for this exam.</p>
                  </div>
                )}
                <div className="result-bottom">
                  <Link
                    className="btn btn-dark"
                    to={admin ? '/admin/results' : `/exams/${result.exam_id}`}
                  >
                    {admin ? 'Back to results' : 'Back to exam'}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </>
            )}
          </>
        )
      )}
    </>
  );
}
function ReviewQuestion({ question: q, index, admin, attemptId, onGraded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const a = q.answer;
  async function grade(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      await api.put(`/admin/results/${attemptId}/grade/${q.id}`, values);
      onGraded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="panel review-question">
      <div className="review-heading">
        <span className="eyebrow">PROMPT {String(index + 1).padStart(2, '0')}</span>
        <Badge
          tone={
            a?.grading_status === 'pending' ? 'amber' : a?.is_correct === false ? 'red' : 'green'
          }
        >
          {q.question_type === 'information'
            ? 'Information'
            : a?.grading_status === 'pending'
              ? 'Awaiting grading'
              : `${a?.marks_awarded ?? 0} / ${q.marks} marks`}
        </Badge>
      </div>
      <h3>{q.question_text}</h3>
      {q.question_type === 'single_choice' ? (
        <div className="review-options">
          {q.options.map((o) => (
            <div
              className={`${o.is_correct ? 'correct ' : ''}${a?.selected_option_id === o.id && !o.is_correct ? 'incorrect' : ''}`}
              key={o.id}
            >
              <span>{o.option_text}</span>
              <span>
                {a?.selected_option_id === o.id && <small>Your answer</small>}
                {o.is_correct ? (
                  <Check size={17} />
                ) : a?.selected_option_id === o.id ? (
                  <X size={17} />
                ) : null}
              </span>
            </div>
          ))}
          {!a?.selected_option_id && <p className="muted">No answer submitted.</p>}
        </div>
      ) : q.question_type === 'text_response' ? (
        <>
          <div className="written-response">
            <span className="eyebrow">SUBMITTED RESPONSE</span>
            <p>{a?.text_answer || 'No response submitted.'}</p>
          </div>
          {a?.feedback && (
            <div className="explanation">
              <strong>Reviewer feedback</strong>
              <p>{a.feedback}</p>
            </div>
          )}
          {admin && (
            <form className="grade-form" onSubmit={grade}>
              <Alert message={error} />
              <Field label={`Awarded marks (out of ${q.marks})`}>
                <input
                  name="marks_awarded"
                  type="number"
                  min={0}
                  max={q.marks}
                  step="0.01"
                  required
                  defaultValue={a?.marks_awarded ?? ''}
                />
              </Field>
              <Field label="Feedback (optional)">
                <textarea
                  name="feedback"
                  rows={3}
                  maxLength={10000}
                  defaultValue={a?.feedback || ''}
                />
              </Field>
              <button className="btn btn-dark" disabled={busy}>
                {busy ? 'Saving…' : a?.grading_status === 'graded' ? 'Update grade' : 'Save grade'}
              </button>
            </form>
          )}
        </>
      ) : null}
      {q.explanation && (
        <div className="explanation">
          <strong>Explanation</strong>
          <p>{q.explanation}</p>
        </div>
      )}
    </article>
  );
}
