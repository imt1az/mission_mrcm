import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Clock3,
  Flag,
  Info,
  LoaderCircle,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Alert, Badge, Loading } from '../components/UI';
import { api, errorMessage, useResource } from '../lib/api';
export function ExamRoom() {
  const { id } = useParams();
  const r = useResource(`/exam-attempts/${id}`);
  const navigate = useNavigate();
  useEffect(() => {
    if (r.data && r.data.status !== 'in_progress')
      navigate(`/attempts/${r.data.id}/result`, { replace: true });
  }, [r.data, navigate]);
  return (
    <>
      <Alert message={r.error} />
      {r.loading ? (
        <Loading />
      ) : r.data?.status === 'in_progress' ? (
        <Room key={r.data.id} attempt={r.data} />
      ) : null}
    </>
  );
}
function Room({ attempt }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(attempt.answers.map((a) => [a.question_id, a])),
  );
  const [flagged, setFlagged] = useState(new Set());
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Date.parse(attempt.expires_at) - Date.parse(attempt.server_now)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const offset = useRef(Date.parse(attempt.server_now) - Date.now());
  const pending = useRef(new Map());
  const inFlight = useRef(null);
  const finishing = useRef(false);
  const autoTried = useRef(false);
  const q = attempt.questions[index];
  const flush = useCallback(async () => {
    if (inFlight.current) {
      return inFlight.current;
    }
    if (!pending.current.size) return;
    const work = async () => {
      setSaving(true);
      try {
        while (pending.current.size) {
          const [key, value] = pending.current.entries().next().value;
          await api.put(`/exam-attempts/${attempt.id}/answer`, {
            question_id: key,
            selected_option_id: value.selected_option_id,
            text_answer: value.text_answer,
          });
          if (pending.current.get(key) === value) pending.current.delete(key);
        }
        setError('');
      } catch (e) {
        setError(errorMessage(e));
        throw e;
      } finally {
        setSaving(false);
        setUnsaved(pending.current.size > 0);
      }
    };
    inFlight.current = work();
    try {
      await inFlight.current;
    } finally {
      inFlight.current = null;
    }
  }, [attempt.id]);
  useEffect(() => {
    const pendingAnswers = pending.current;
    const saveBeforeNavigation = (event) => {
      if (
        !pending.current.size ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      void flush()
        .then(() => navigate(destination.pathname + destination.search + destination.hash))
        .catch(() => {});
    };
    document.addEventListener('click', saveBeforeNavigation, true);
    return () => {
      document.removeEventListener('click', saveBeforeNavigation, true);
      if (pendingAnswers.size && !finishing.current) void flush().catch(() => {});
    };
  }, [flush, navigate]);
  useEffect(() => {
    const clock = setInterval(
      () =>
        setRemaining(Math.max(0, Date.parse(attempt.expires_at) - (Date.now() + offset.current))),
      250,
    );
    const saver = setInterval(() => {
      if (!finishing.current && pending.current.size && !inFlight.current)
        void flush().catch(() => {});
    }, 900);
    return () => {
      clearInterval(clock);
      clearInterval(saver);
    };
  }, [attempt.expires_at, flush]);
  useEffect(() => {
    const prevent = (e) => {
      if (pending.current.size) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, []);
  const submit = useCallback(
    async (expired = false) => {
      if (finishing.current) return;
      finishing.current = true;
      setSubmitting(true);
      setError('');
      try {
        if (!expired) await flush();
        else if (inFlight.current) await inFlight.current.catch(() => {});
        await api.post(`/exam-attempts/${attempt.id}/submit`);
        navigate(`/attempts/${attempt.id}/result`, { replace: true });
      } catch (e) {
        setError(errorMessage(e));
        finishing.current = false;
        setSubmitting(false);
        setSubmitOpen(false);
      }
    },
    [attempt.id, flush, navigate],
  );
  useEffect(() => {
    if (remaining <= 0 && !autoTried.current) {
      autoTried.current = true;
      void submit(true);
    }
  }, [remaining, submit]);
  function change(value) {
    const a = { question_id: q.id, selected_option_id: null, text_answer: null, ...value };
    setAnswers((old) => ({ ...old, [q.id]: a }));
    pending.current.set(q.id, a);
    setUnsaved(true);
  }
  async function move(next) {
    try {
      await flush();
      setIndex(next);
    } catch {
      /* Keep the current question visible so the response can be retried. */
    }
  }
  function flag() {
    setFlagged((old) => {
      const next = new Set(old);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
  }
  const isAnswered = (id) =>
    answers[id]?.selected_option_id != null || !!answers[id]?.text_answer?.trim();
  const answered = attempt.questions.filter(
    (question) => question.question_type !== 'information' && isAnswered(question.id),
  ).length;
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const timer = `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <div className="exam-room">
      <div className="exam-room-heading">
        <div>
          <span className="eyebrow">YOUR FOCUS SPACE</span>
          <h1>{attempt.title}</h1>
          <p>Take it one question at a time.</p>
        </div>
        <div
          className={`exam-timer ${remaining < 300000 ? 'timer-warning' : ''}`}
          role="timer"
          aria-label={`${minutes} minutes remaining`}
        >
          <Clock3 size={21} />
          <div>
            <span>TIME REMAINING</span>
            <strong>{timer}</strong>
          </div>
        </div>
      </div>
      <Alert message={error} />
      <div className="exam-layout">
        <section className="question-panel">
          <div className="question-toolbar">
            <span className="question-number">
              QUESTION {String(index + 1).padStart(2, '0')}{' '}
              <span>OF {String(attempt.questions.length).padStart(2, '0')}</span>
            </span>
            <Badge tone="neutral">
              {q.question_type === 'information'
                ? 'Information'
                : `${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}`}
            </Badge>
            <button className={`flag-button ${flagged.has(q.id) ? 'flagged' : ''}`} onClick={flag}>
              <Flag size={16} />
              {flagged.has(q.id) ? 'Flagged' : 'Flag for review'}
            </button>
          </div>
          <div className="question-body">
            <div className="eyebrow">{q.subject || 'GENERAL'}</div>
            <h2>{q.question_text}</h2>
            {q.question_type === 'single_choice' ? (
              <>
                <p className="answer-hint">Select the single best answer.</p>
                <div className="answer-options">
                  {q.options.map((o, i) => (
                    <label
                      key={o.id}
                      className={`answer-option ${answers[q.id]?.selected_option_id === o.id ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={o.id}
                        checked={answers[q.id]?.selected_option_id === o.id}
                        disabled={submitting || remaining <= 0}
                        onChange={() => change({ selected_option_id: o.id })}
                      />
                      <span className="option-label">
                        {i < 26 ? String.fromCharCode(65 + i) : i + 1}
                      </span>
                      <span>{o.option_text}</span>
                      <span className="option-check">
                        {answers[q.id]?.selected_option_id === o.id && <Check size={13} />}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  className="text-link clear-answer"
                  disabled={submitting || remaining <= 0 || !isAnswered(q.id)}
                  onClick={() => change({ selected_option_id: null })}
                >
                  Clear selection
                </button>
              </>
            ) : q.question_type === 'text_response' ? (
              <>
                <label className="field">
                  <span>Your response</span>
                  <textarea
                    aria-label="Your response"
                    rows={8}
                    maxLength={30000}
                    value={answers[q.id]?.text_answer || ''}
                    onChange={(e) => change({ text_answer: e.target.value })}
                    disabled={submitting || remaining <= 0}
                    placeholder="Take a moment to organise your thoughts…"
                  />
                </label>
                <p className="answer-hint">
                  <Info size={15} />
                  This response will be reviewed and graded by an administrator.
                </p>
              </>
            ) : (
              <div className="information-note">
                <Info size={20} />
                Read this question, then continue when you’re ready. No answer is required.
              </div>
            )}
          </div>
          <div className="question-footer">
            <button
              className="btn btn-outline"
              disabled={index === 0 || submitting}
              onClick={() => void move(index - 1)}
            >
              <ArrowLeft size={16} />
              Previous
            </button>
            <span className="save-indicator">
              {saving ? (
                <>
                  <LoaderCircle size={15} className="spin" />
                  Saving…
                </>
              ) : unsaved ? (
                <>
                  <Clock3 size={15} />
                  Unsaved changes
                </>
              ) : (
                <>
                  <CheckCheck size={16} />
                  All answers saved
                </>
              )}
            </span>
            {index < attempt.questions.length - 1 ? (
              <button
                className="btn btn-dark"
                disabled={submitting}
                onClick={() => void move(index + 1)}
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="btn btn-dark"
                disabled={submitting}
                onClick={() => setSubmitOpen(true)}
              >
                Review & submit
                <Check size={16} />
              </button>
            )}
          </div>
        </section>
        <aside className="exam-sidebar">
          <div className="panel padded">
            <div className="section-heading compact">
              <h3>Your progress</h3>
              <span>
                {answered}/{attempt.total_questions}
              </span>
            </div>
            <div className="progress-track">
              <span
                style={{ width: `${(100 * answered) / Math.max(1, attempt.total_questions)}%` }}
              />
            </div>
            <p className="muted small">Answerable questions completed</p>
            <div className="question-palette">
              {attempt.questions.map((question, i) => (
                <button
                  key={question.id}
                  aria-label={`Go to question ${i + 1}`}
                  className={`${index === i ? 'current ' : ''}${isAnswered(question.id) ? 'answered ' : ''}${flagged.has(question.id) ? 'is-flagged ' : ''}${question.question_type === 'information' ? 'is-info' : ''}`}
                  onClick={() => void move(i)}
                >
                  {i + 1}
                  {flagged.has(question.id) && <span />}
                </button>
              ))}
            </div>
            <div className="palette-legend">
              <span>
                <i className="answered" />
                Answered
              </span>
              <span>
                <i />
                Unanswered
              </span>
              <span>
                <i className="flagged" />
                Flagged
              </span>
              <span>
                <i className="info" />
                Information
              </span>
            </div>
            <button
              className="btn btn-dark btn-full"
              disabled={submitting}
              onClick={() => (remaining <= 0 ? void submit(true) : setSubmitOpen(true))}
            >
              {submitting ? 'Submitting…' : remaining <= 0 ? 'Finish expired exam' : 'Submit exam'}
              <Send size={15} />
            </button>
          </div>
          <div className="exam-reassurance">
            <ShieldCheck size={19} />
            <p>
              Your time is saved on the server. You can return to this attempt until the deadline.
            </p>
          </div>
          <Link
            to="/results"
            className="text-link"
            onClick={(e) => {
              if (pending.current.size) {
                e.preventDefault();
                void flush()
                  .then(() => navigate('/results'))
                  .catch(() => {});
              }
            }}
          >
            Return to my workspace
          </Link>
        </aside>
      </div>
      {submitOpen && (
        <div className="modal-backdrop">
          <section
            className="modal small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
          >
            <button
              className="modal-close icon-button"
              aria-label="Close"
              onClick={() => setSubmitOpen(false)}
            >
              <X size={20} />
            </button>
            <span className="icon-tile">
              <Send />
            </span>
            <h2 id="submit-title">Ready to submit?</h2>
            <p>
              You’ve answered {answered} of {attempt.total_questions} questions.
              {flagged.size > 0 ? ` You have ${flagged.size} flagged questions.` : ''} You won’t be
              able to change your answers after submission.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                disabled={submitting}
                onClick={() => setSubmitOpen(false)}
              >
                Keep reviewing
              </button>
              <button className="btn btn-dark" disabled={submitting} onClick={() => void submit()}>
                {submitting ? 'Submitting…' : 'Submit exam'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
