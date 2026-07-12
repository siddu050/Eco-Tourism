import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, Link, useLocation } from 'react-router-dom';
import { Compass, Map, Mountain, PlaneTakeoff } from 'lucide-react';
import ecoTourismLogo from './assets/eco-tourism-logo.svg';
import './index.css';

const Home = React.lazy(() => import('./pages/Home'));
const Auth = React.lazy(() => import('./pages/Auth'));
const LocationDetails = React.lazy(() => import('./pages/LocationDetails'));
const Discover = React.lazy(() => import('./pages/Discover'));
const Guides = React.lazy(() => import('./pages/Guides'));
const About = React.lazy(() => import('./pages/About'));
const Maps = React.lazy(() => import('./pages/Maps'));
const BookingPage = React.lazy(() => import('./pages/BookingPage'));
const BookingConfirmation = React.lazy(() => import('./pages/BookingConfirmation'));
const MyTrips = React.lazy(() => import('./pages/MyTrips'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const Chatbot = React.lazy(() => import('./components/Chatbot'));

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/discover', label: 'Discover' },
  { to: '/guides', label: 'Travel Guides' },
  { to: '/maps', label: 'Maps' },
  { to: '/about', label: 'About' },
];

const highlights = [
  { icon: Compass, text: 'Eco-conscious routes across India' },
  { icon: Map, text: 'Nature, heritage, and local storytelling' },
  { icon: Mountain, text: 'Slow travel with scenic stays and trails' },
  { icon: PlaneTakeoff, text: 'Thoughtful trip planning from search to stay' },
];

function ScrollToTop() {
  const { pathname, search } = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}

function App() {
  const [user, setUser] = React.useState(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    return token && username ? { username } : null;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <Router>
      <ScrollToTop />
      <div className="app-shell">
        <header className="site-header">
          <div className="site-header__inner">
            <Link to="/" className="brand-mark">
              <img src={ecoTourismLogo} alt="Eco-Tourism logo" className="brand-mark__logo" />
              <span className="brand-mark__copy">
                <span className="brand-mark__eyebrow">Eco-Tourism</span>
                <span className="brand-mark__title">Indian Journeys</span>
              </span>
            </Link>

            <nav className="site-nav">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `site-nav__link${isActive ? ' site-nav__link--active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
              {user && (
                <>
                  <NavLink
                    to="/favorites"
                    className={({ isActive }) => `site-nav__link${isActive ? ' site-nav__link--active' : ''}`}
                  >
                    Favorites
                  </NavLink>
                  <NavLink
                    to="/my-trips"
                    className={({ isActive }) => `site-nav__link${isActive ? ' site-nav__link--active' : ''}`}
                  >
                    My Trips
                  </NavLink>
                </>
              )}
            </nav>

            <div className="site-header__actions">
              {user ? (
                <div className="user-chip">
                  <span className="user-chip__label">Signed in as {user.username}</span>
                  <button type="button" onClick={handleLogout} className="btn-secondary">
                    Logout
                  </button>
                </div>
              ) : (
                <Link to="/auth" className="btn-primary">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          <React.Suspense fallback={<div className="status-panel">Loading page...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/favorites" element={<Favorites user={user} />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/guides" element={<Guides />} />
              <Route path="/maps" element={<Maps />} />
              <Route path="/admin" element={<Navigate to="/" replace />} />
              <Route path="/about" element={<About />} />
              <Route path="/auth" element={<Auth setUser={setUser} />} />
              <Route path="/location/:id/book" element={<BookingPage user={user} />} />
              <Route path="/booking-confirmation/:bookingId" element={<BookingConfirmation user={user} />} />
              <Route path="/my-trips" element={<MyTrips user={user} />} />
              <Route path="/location/:id" element={<LocationDetails user={user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </main>

        <footer className="site-footer">
          <div className="site-footer__grid">
            <div className="site-footer__hero">
              <div className="site-footer__brand-lockup">
                <img src={ecoTourismLogo} alt="Eco-Tourism logo" className="site-footer__logo" />
                <div>
                  <p className="section-eyebrow">Eco-Tourism</p>
                  <span className="site-footer__brand-name">Indian Journeys</span>
                </div>
              </div>
              <h2>Travel India with a lighter footprint and a richer story.</h2>
              <div className="site-footer__contact">
                <span className="site-footer__contact-label">Customer Care</span>
                <a href="tel:9347466496" className="site-footer__contact-number">9347466496</a>
                <span className="site-footer__contact-note">Available for booking help, trip support, and travel queries.</span>
              </div>
              <div className="site-footer__actions">
                <Link to="/discover" className="btn-primary">Explore destinations</Link>
                <Link to="/guides" className="btn-secondary">View travel guides</Link>
              </div>
            </div>

            <div className="site-footer__side">
              <div className="site-footer__highlights">
                {highlights.map(({ icon: Icon, text }) => (
                  <div key={text} className="footer-feature">
                    <Icon size={18} />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="site-footer__bottom">
            <span>Indian Journeys for mindful travelers</span>
            <span>Scenic stays, local stories, and sustainable escapes</span>
          </div>
        </footer>

        <React.Suspense fallback={null}>
          <Chatbot />
        </React.Suspense>
      </div>
    </Router>
  );
}

export default App;
