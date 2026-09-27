import { useState } from 'react';
import { NavLink, Link, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  CreditCard,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Brand, Loading } from './UI';
import { errorMessage } from '../lib/api';
import { SiteFooter } from './SiteFooter';
export function Protected({ admin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
export function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="public-app">
      <header className="public-header">
        <div className="public-header-inner">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
          >
            <Menu />
          </button>
          <nav className={open ? 'public-nav open' : 'public-nav'}>
            <NavLink to="/" end onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/courses" onClick={() => setOpen(false)}>
              Our courses
            </NavLink>
            <a href="/#our-mentor" onClick={() => setOpen(false)}>
              Our mentor
            </a>
            <a href="/#how-it-works" onClick={() => setOpen(false)}>
              How it works
            </a>
            <Link
              to={user ? '/dashboard' : '/login'}
              className="btn btn-dark"
              onClick={() => setOpen(false)}
            >
              {user ? 'My dashboard' : 'Sign in'}
              <ArrowUpRight size={16} />
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
const studentLinks = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/my-courses', label: 'My courses', icon: BookOpen },
  { to: '/courses', label: 'Explore courses', icon: GraduationCap },
  { to: '/results', label: 'Results & history', icon: ChartNoAxesCombined },
  { to: '/payments', label: 'My payments', icon: CreditCard },
];
const adminLinks = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/exams', label: 'Exams', icon: Layers },
  { to: '/admin/questions', label: 'Question bank', icon: FileQuestion },
  { to: '/admin/subjects', label: 'Subjects', icon: GraduationCap },
  { to: '/admin/users', label: 'Doctors', icon: Users },
  { to: '/admin/enrollments', label: 'Enrollments', icon: ShieldCheck },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/results', label: 'Results & grading', icon: ChartNoAxesCombined },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];
export function Workspace({ admin = false }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const links = admin ? adminLinks : studentLinks;
  const current =
    links.find((l) => l.to === location.pathname)?.label ||
    (location.pathname.includes('/attempts/') || location.pathname.includes('/exams/')
      ? location.pathname.endsWith('/result')
        ? 'Exam result'
        : 'Exam room'
      : location.pathname.includes('/admin/results/')
        ? 'Result review'
        : location.pathname.includes('/import')
          ? 'Import questions'
          : 'My profile');
  async function logout() {
    try {
      await signOut();
      navigate('/login');
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <div className="workspace">
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">{admin ? 'ADMIN WORKSPACE' : 'YOUR LEARNING SPACE'}</div>
        <nav className="side-nav">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/dashboard'}
              onClick={() => setOpen(false)}
            >
              <Icon size={19} />
              {label}
              <ChevronRight size={15} className="nav-chevron" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!admin && (
            <div className="sidebar-note">
              <span className="note-star">✳</span>
              <h4>One step closer.</h4>
              <p>Your next chapter in emergency medicine starts with today's practice.</p>
              <Link to="/courses">
                Find your next course <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
          {user?.role === 'admin' && (
            <Link className="switch-workspace" to={admin ? '/dashboard' : '/admin'}>
              <ShieldCheck size={17} />
              {admin ? 'Doctor workspace' : 'Admin workspace'}
            </Link>
          )}
          <NavLink className="profile-link" to="/profile">
            <span className="avatar">
              {user?.name
                .replace(/^Dr\. /, '')
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span>
              <strong>{user?.name}</strong>
              <small>{admin ? 'Administrator' : 'Your profile & account'}</small>
            </span>
            <ChevronRight size={15} />
          </NavLink>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </button>
            <span>{admin ? 'Administration' : 'My workspace'}</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="header-actions">
            <span className="header-date">
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <button className="icon-button" onClick={logout} aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {error && <div className="alert">{error}</div>}
        <main className="workspace-content">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>Made for your next milestone.</span>
          <span>
            Mission MRCEM <span className="footer-dot">•</span> Learn with purpose
          </span>
        </footer>
      </div>
    </div>
  );
}
