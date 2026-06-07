import Image from "next/image";
import Link from "next/link";

type BrandProps = {
  variant?: "default" | "inverse";
};

export function Brand({ variant = "default" }: BrandProps) {
  return (
    <Link className="brand" href="/" aria-label="DeepFlow home">
      <Image
        className="brand__image"
        src={
          variant === "inverse"
            ? "/deepflow-logo-white.png"
            : "/deepflow-logo-512.png"
        }
        alt=""
        aria-hidden="true"
        width={512}
        height={128}
        priority
      />
    </Link>
  );
}
