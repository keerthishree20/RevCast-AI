interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
}

export default function ROASBadge({ value, size = "md" }: Props) {
  const color =
    value >= 4 ? "bg-green-100 text-green-800" :
    value >= 2.5 ? "bg-blue-100 text-blue-800" :
    value >= 1 ? "bg-yellow-100 text-yellow-800" :
    "bg-red-100 text-red-800";

  const sizeClass =
    size === "sm" ? "text-xs px-1.5 py-0.5" :
    size === "lg" ? "text-base px-3 py-1.5 font-bold" :
    "text-sm px-2 py-1";

  return (
    <span className={`inline-block rounded-full font-medium ${color} ${sizeClass}`}>
      {value.toFixed(2)}x
    </span>
  );
}
