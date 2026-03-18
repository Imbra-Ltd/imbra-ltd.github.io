import { useState, useEffect, useRef } from "react";

interface Link {
  label: string;
  target?: string;
  href?: string;
}

interface Props {
  links: Link[];
  cta: Link;
}

export default function HamburgerMenu({ links, cta }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() { setOpen(false); }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        className={`hamburger ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <span /><span /><span />
      </button>
      <div className={`mobile-menu ${open ? "open" : ""}`}>
        {links.map(l => (
          <a key={l.label} href={l.href ?? `#${l.target}`} className="mobile-menu-link" onClick={close}>
            {l.label}
          </a>
        ))}
        <a href={`#${cta.target}`} className="mobile-menu-cta" onClick={close}>
          {cta.label}
        </a>
      </div>
    </>
  );
}