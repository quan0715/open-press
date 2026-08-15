interface BackCoverProps {
  src?: string;
  alt?: string;
  className?: string;
}

export default function AmaoBackCover({
  src = "/openpress/media/back-cover.jpg",
  alt = "Amao Coffee Roasters Back Cover Art",
  className = "",
}: BackCoverProps) {
  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[#faf6ef] ${className}`}
      data-openpress-component="AmaoBackCover"
      aria-label="Amao Coffee Menu Back Cover"
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
