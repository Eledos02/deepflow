import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found">
      <div>
        <span className="eyebrow">404</span>
        <h1>This page lost focus.</h1>
        <p>The timer is still right where you left it.</p>
        <Link className="button button--dark" href="/tools/focus-timer">
          Open focus timer
        </Link>
      </div>
    </section>
  );
}
