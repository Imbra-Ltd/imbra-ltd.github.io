import { useState } from "react";

interface Props {
  endpoint: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm({ endpoint }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!endpoint) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        const json = await res.json().catch(() => ({}));
        setErrorMsg(json?.error ?? "Submission failed. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="contact-form-success">
        <p>Message sent. We'll get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="contact-form-row">
        <div className="contact-form-field">
          <label htmlFor="cf-name">Name</label>
          <input id="cf-name" name="name" type="text" required autoComplete="name" />
        </div>
        <div className="contact-form-field">
          <label htmlFor="cf-email">Email</label>
          <input id="cf-email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>
      <div className="contact-form-field">
        <label htmlFor="cf-topic">What are you working on?</label>
        <select id="cf-topic" name="topic" required>
          <option value="" disabled>Select a topic…</option>
          <option value="OT/IT Integration">OT/IT Integration</option>
          <option value="PLC / DCS Engineering">PLC / DCS Engineering</option>
          <option value="Data Pipeline / Historian">Data Pipeline / Historian</option>
          <option value="Protocol SDK / Imbra Connect">Protocol SDK / Imbra Connect</option>
          <option value="Support & Maintenance">Support &amp; Maintenance</option>
          <option value="Something else">Something else</option>
        </select>
      </div>
      <div className="contact-form-field">
        <label htmlFor="cf-message">Message</label>
        <textarea id="cf-message" name="message" rows={4} required />
      </div>
      {status === "error" && (
        <p className="contact-form-error">{errorMsg}</p>
      )}
      <button
        type="submit"
        className="btn-white"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}