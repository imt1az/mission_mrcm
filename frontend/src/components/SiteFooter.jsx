import { Link } from 'react-router-dom';
import { ArrowUpRight, Facebook, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { Brand } from './UI';

export function SiteFooter() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-accent" />
      <div className="container footer-main">
        <div className="footer-about">
          <Brand light />
          <h2>About MRCEM Primary</h2>
          <p>
            MRCEM is an internationally recognised qualification that can open doors to your future.
            We care about our students and strive to make learning as approachable and engaging as
            possible.
          </p>
          <div className="footer-socials">
            <a
              href="https://www.facebook.com/share/1CzSdcA77E/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Dr. Md Abdul Hamed Jasham on Facebook"
            >
              <Facebook size={18} />
            </a>
            <a
              href="https://youtu.be/UJjp2ocB1ZI"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch Mission MRCEM on YouTube"
            >
              <Youtube size={20} />
            </a>
            <a href="mailto:Jabdulhamed@gmail.com" aria-label="Email Dr Abdul Hamed">
              <Mail size={18} />
            </a>
          </div>
        </div>
        <div className="footer-links">
          <h2>Your next step</h2>
          <Link to="/courses">
            Explore courses <ArrowUpRight size={14} />
          </Link>
          <a href="/#our-mentor">
            Meet your mentor <ArrowUpRight size={14} />
          </a>
          <a href="/#watch-video">
            Watch the video <ArrowUpRight size={14} />
          </a>
          <a href="/#how-it-works">
            How it works <ArrowUpRight size={14} />
          </a>
          <Link to="/register">
            Create an account <ArrowUpRight size={14} />
          </Link>
          <Link to="/login">
            Student sign in <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="footer-contact">
          <h2>Contact Info</h2>
          <div className="footer-contact-row">
            <span className="footer-contact-icon">
              <MapPin size={19} />
            </span>
            <div>
              <span>FIND US</span>
              <p>Banghabandhu Sheikh Mujib Medical University</p>
            </div>
          </div>
          <a className="footer-contact-row" href="mailto:Jabdulhamed@gmail.com">
            <span className="footer-contact-icon">
              <Mail size={19} />
            </span>
            <div>
              <span>EMAIL US</span>
              <p>Jabdulhamed@gmail.com</p>
            </div>
          </a>
          <a className="footer-contact-row" href="tel:+8801705466994">
            <span className="footer-contact-icon">
              <Phone size={19} />
            </span>
            <div>
              <span>LET’S TALK</span>
              <p>+8801-705-466-994</p>
            </div>
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>
          © 2024 Developed by{' '}
          <a href="mailto:imtiazemon625@gmail.com">
            Imtiaz Ahmed Chowdhury
          </a>
          . All Rights Reserved.
        </p>
        <p>
          WhatsApp:{' '}
          <a href="https://wa.me/8801684277944" target="_blank" rel="noopener noreferrer">
            01684277944
          </a>
          {' · '}Email: <a href="mailto:imtiazemon625@gmail.com">imtiazemon625@gmail.com</a>
        </p>
        <p>
          Site Owner:{' '}
          <a
            href="https://www.facebook.com/share/1CzSdcA77E/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dr. Md Abdul Hamed Jasham <ArrowUpRight size={12} />
          </a>
        </p>
      </div>
    </footer>
  );
}
