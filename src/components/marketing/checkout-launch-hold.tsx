export function CheckoutHeldButton({
  className = "button button--dark button--full",
}: {
  className?: string;
}) {
  return (
    <div className="billing-action">
      <button
        aria-disabled="true"
        className={`${className} pricing-checkout-disabled`}
        disabled
        type="button"
      >
        Coming soon
      </button>
    </div>
  );
}

export function FounderWaitlistLink() {
  return (
    <a
      className="button button--light button--full"
      href="#founding-member"
    >
      Join Founder waitlist
    </a>
  );
}
