export function BookCover({
  title,
  author,
  color,
  size = "md",
}: {
  title: string;
  author: string;
  color: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      role="img"
      aria-label={`Cover of ${title} by ${author}`}
      className={`flex aspect-[2/3] flex-col justify-between rounded-md p-4 text-white shadow-md ${
        size === "lg" ? "w-56" : "w-full"
      }`}
      style={{ backgroundColor: color }}
    >
      <span className={`font-serif font-semibold leading-tight ${size === "lg" ? "text-2xl" : "text-lg"}`}>
        {title}
      </span>
      <span className="text-xs uppercase tracking-wider opacity-90">{author}</span>
    </div>
  );
}
