import Image from "next/image";

type BrandLogoProps = {
  variant?: "principal" | "mark";
  className?: string;
  priority?: boolean;
  size?: number;
};

const SRC = {
  principal: "/brand/logo-principal.png",
  mark: "/brand/logo-mark.png",
} as const;

export function BrandLogo({
  variant = "mark",
  className = "",
  priority = false,
  size,
}: BrandLogoProps) {
  const isPrincipal = variant === "principal";
  const wh = size ?? (isPrincipal ? 220 : 44);
  return (
    <Image
      src={SRC[variant]}
      alt="Sacha Wasi"
      width={wh}
      height={wh}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
