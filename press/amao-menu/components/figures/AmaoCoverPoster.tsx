interface CoverPosterProps {
  src?: string;
  alt?: string;
  className?: string;
}

export default function AmaoCoverPoster({
  src = "/openpress/media/cover.jpg",
  alt = "Amao Coffee Roasters Cover Art",
  className = "",
}: CoverPosterProps) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[#faf6ef] ${className}`}
      data-openpress-component="AmaoCoverPoster"
      aria-label="Amao Coffee Menu Cover"
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
