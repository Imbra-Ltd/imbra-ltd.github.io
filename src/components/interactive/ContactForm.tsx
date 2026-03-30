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
    <form className="contact-form" onSubmit={handleSubmit}>
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
          <option value="Data Integration & ETL">Data Integration &amp; ETL</option>
          <option value="Software Services & SDKs">Software Services &amp; SDKs</option>
          <option value="Application Refactoring">Application Refactoring</option>
          <option value="AI/ML-Augmented Engineering">AI/ML-Augmented Engineering</option>
          <option value="Testing & Quality Assurance">Testing &amp; Quality Assurance</option>
          <option value="Maintenance & Support">Maintenance &amp; Support</option>
          <option value="PLC & DCS Engineering">PLC &amp; DCS Engineering</option>
          <option value="DevOps & CI/CD">DevOps &amp; CI/CD</option>
          <option value="Industrial Security">Industrial Security</option>
          <option value="Training & Tutorials">Training &amp; Tutorials</option>
          <option value="Something else">Something else</option>
        </select>
      </div>
      <div className="contact-form-field">
        <label htmlFor="cf-message">Message</label>
        <textarea id="cf-message" name="message" rows={4} required />
      </div>
      <input type="text" name="_gotcha" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
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