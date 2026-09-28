import { Component, useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Protected, PublicLayout, Workspace } from './components/Layout';
import { AuthPage } from './pages/Auth';
import { Home } from './pages/Home';
import {
  Courses,
  CourseDetails,
  Dashboard,
  ExamInstructions,
  MyCourses,
  Payments,
  Profile,
  Results,
} from './pages/Learning';
import { ExamRoom } from './pages/ExamRoom';
import { ExamResult } from './pages/ExamResult';
import { AdminResults } from './admin/AdminResults';
import { AdminDashboard, AdminList, AdminSettings, ImportQuestions } from './admin/Admin';

class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="empty">
        <h1>Something interrupted this page.</h1>
        <p>Refresh to try again. Saved answers remain in your account.</p>
        <button className="btn btn-dark" onClick={() => window.location.reload()}>
          Refresh page
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetails />} />
        </Route>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
        <Route path="/reset-password" element={<AuthPage mode="reset" />} />
        <Route element={<Protected />}>
          <Route element={<Workspace />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/exams/:id" element={<ExamInstructions />} />
            <Route path="/exams/:id/start" element={<ExamInstructions />} />
            <Route path="/attempts/:id" element={<ExamRoom />} />
            <Route path="/attempts/:id/result" element={<ExamResult />} />
            <Route path="/results" element={<Results />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/payments" element={<Payments />} />
          </Route>
        </Route>
        <Route element={<Protected admin />}>
          <Route element={<Workspace admin />}>
            <Route path="/admin" element={<AdminDashboard />} />
            {['courses', 'exams', 'questions', 'subjects', 'users', 'enrollments', 'payments'].map(
              (kind) => (
                <Route
                  key={kind}
                  path={`/admin/${kind}`}
                  element={<AdminList key={kind} kind={kind} />}
                />
              ),
            )}
            <Route path="/admin/questions/import" element={<ImportQuestions />} />
            <Route path="/admin/results" element={<AdminResults />} />
            <Route path="/admin/results/:id" element={<ExamResult admin />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>
        <Route
          path="*"
          element={
            <div className="empty not-found">
              <span className="eyebrow">404 · A SMALL DETOUR</span>
              <h1>This page isn’t here.</h1>
              <p>Let’s get you back to your learning journey.</p>
              <Link className="btn btn-dark" to="/">
                Back to home
              </Link>
            </div>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}
