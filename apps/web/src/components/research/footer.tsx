import { ArrowUp, ExternalLink } from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { BlockILogo } from "./illinois-logo";

const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/Illinois1867", Icon: FaFacebookF },
  { label: "Instagram", href: "https://www.instagram.com/illinois1867/", Icon: FaInstagram },
  { label: "X", href: "https://x.com/Illinois_Alma", Icon: FaXTwitter },
  { label: "LinkedIn", href: "https://www.linkedin.com/school/university-of-illinois-urbana-champaign/", Icon: FaLinkedinIn },
  { label: "YouTube", href: "https://www.youtube.com/user/Illinois1867", Icon: FaYoutube },
  { label: "TikTok", href: "https://www.tiktok.com/@illinois1867", Icon: FaTiktok },
];

const footerGroups = [
  {
    title: "Explore Campus",
    links: [
      ["University Admissions", "https://www.admissions.illinois.edu/"],
      ["Careers at Illinois", "https://jobs.illinois.edu/"],
      ["University News", "https://news.illinois.edu/"],
      ["Visit Campus", "https://illinois.edu/visit/"],
    ],
  },
  {
    title: "Connect with Illinois",
    links: [
      ["University Alumni", "https://uiaa.org/"],
      ["Giving at Illinois", "https://giving.illinois.edu/"],
      ["University Calendars", "https://illinois.edu/resources/calendars.html"],
      ["University Directory", "https://directory.illinois.edu/"],
    ],
  },
  {
    title: "Access University Resources",
    links: [
      ["Emergency Services", "https://police.illinois.edu/emergency-preparedness/"],
      ["McKinley Health Center", "https://mckinley.illinois.edu/"],
      ["Connie Frank CARE Center", "https://wecare.illinois.edu/"],
      ["University Library", "https://www.library.illinois.edu/"],
    ],
  },
] as const;

const legalLinks = [
  ["Privacy Policy", "https://www.vpaa.uillinois.edu/resources/web_privacy"],
  ["Copyright", "https://illinois.edu/copyright/"],
  ["Consumer Information", "https://provost.illinois.edu/student-consumer-information/"],
  ["Website Feedback", "https://illinois.edu/about/contact.html"],
  ["Accessibility", "https://illinois.edu/about/accessibility.html"],
] as const;

export function Footer(): React.JSX.Element {
  return (
    <footer className="portal-footer">
      <nav className="footer-social" aria-label="Illinois social media">
        {socialLinks.map(({ label, href, Icon }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
            <Icon aria-hidden="true" />
          </a>
        ))}
      </nav>

      <div className="footer-main">
        <div className="portal-container footer-main-inner">
          <a className="footer-brand" href="https://illinois.edu/" target="_blank" rel="noreferrer">
            <BlockILogo className="footer-block-i" />
            <span>ILLINOIS</span>
          </a>
          <div className="footer-groups">
            {footerGroups.map((group) => (
              <section key={group.title}>
                <h2>{group.title}</h2>
                <ul>
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} target="_blank" rel="noreferrer">{label}</a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-legal">
        <div className="portal-container footer-legal-inner">
          <a className="footer-cookie-link" href="https://www.vpaa.uillinois.edu/resources/web_privacy" target="_blank" rel="noreferrer">
            About Cookies
          </a>
          <nav aria-label="Legal information">
            {legalLinks.map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer">
                {label}
                {label === "Website Feedback" ? <ExternalLink aria-hidden="true" size={13} /> : null}
              </a>
            ))}
          </nav>
          <a className="footer-to-top" href="#top" aria-label="Back to top">
            <ArrowUp aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
