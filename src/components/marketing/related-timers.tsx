import Link from "next/link";

import { ArrowIcon, TimerIcon } from "@/components/ui/icons";
import {
  getRelatedTimerMinutes,
  getTimerPath,
  type TimerMinutes,
} from "@/config/timers";

type RelatedTimersProps = {
  minutes: TimerMinutes;
};

export function RelatedTimers({ minutes }: RelatedTimersProps) {
  const relatedTimers = getRelatedTimerMinutes(minutes);

  return (
    <section className="section related-timers">
      <div className="shell shell--narrow">
        <div className="section-heading section-heading--center">
          <span className="eyebrow">Related timers</span>
          <h2>Choose another countdown.</h2>
          <p>
            Match the timer to the task, your energy, and the amount of attention
            you want to protect.
          </p>
        </div>
        <div className="related-timer-grid">
          {relatedTimers.map((relatedMinutes) => (
            <Link
              className="related-timer-card"
              href={getTimerPath(relatedMinutes)}
              key={relatedMinutes}
            >
              <span className="related-timer-card__icon">
                <TimerIcon />
              </span>
              <span>
                <strong>{relatedMinutes} Minute Timer</strong>
                <small>Free online countdown</small>
              </span>
              <ArrowIcon />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
