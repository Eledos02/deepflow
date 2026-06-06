import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="DeepFlow home">
      <Image
        className="brand__image"
        src="/deepflow-logo-512.png"
        alt=""
        aria-hidden="true"
        width={512}
        height={128}
        priority
      />
    </Link>
  );
}
