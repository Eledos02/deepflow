import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="DeepFlow home">
      <span className="brand__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>DeepFlow</span>
    </Link>
  );
}
