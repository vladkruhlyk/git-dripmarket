"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "sending" | "done" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not subscribe right now.");

      setStatus("done");
      setMessage("You're in. Watch your inbox for new drops.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not subscribe right now.");
    }
  }

  return (
    <form className="hp-footer__signup" onSubmit={subscribe}>
      <div className="hp-footer__form">
        <input
          type="email"
          placeholder="Your email"
          aria-label="Email for newsletter"
          required
          value={email}
          onChange={event => {
            setEmail(event.target.value);
            if (status !== "idle") setStatus("idle");
            if (message) setMessage("");
          }}
        />
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "..." : "SUBSCRIBE"}
        </button>
      </div>
      {message && (
        <p className={`hp-footer__form-status${status === "error" ? " hp-footer__form-status--error" : ""}`} aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}
