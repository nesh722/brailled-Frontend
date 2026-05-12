import { useCallback, useEffect, useRef, useState } from "react";

/** Image data for the Bunifu stills gallery carousel */
const GALLERY_IMAGES = [
  // { src: "/bunifu%20stills/IMG_1980.jpg", alt: "BrailleEd workshop - students learning robotics" },
  { src: "/bunifu%20stills/IMG_1985.jpg", alt: "Hands-on robotics training session with participants" },
  { src: "/bunifu%20stills/IMG_1988.jpg", alt: "Classroom demonstration of accessible robotics equipment" },
  // { src: "/bunifu%20stills/IMG_2014.jpg", alt: "Group of learners engaged in robotics program" },
  // { src: "/bunifu%20stills/IMG_2077.jpg", alt: "BrailleEd facilitator with students during training" },
  { src: "/bunifu%20stills/IMG_2098.jpg", alt: "Students working with programmable robotics equipment" },
  // { src: "/bunifu%20stills/IMG_2126.jpg", alt: "Robotics learning in action at inclusive classroom" },
] as const;

const AUTO_PLAY_INTERVAL = 2500;  //  2.5 second

export function GalleryCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const totalImages = GALLERY_IMAGES.length;

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index % totalImages);
    setIsAutoPlaying(false);
  }, [totalImages]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
    setIsAutoPlaying(false);
  }, [totalImages]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalImages);
    setIsAutoPlaying(false);
  }, [totalImages]);

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalImages);
    }, AUTO_PLAY_INTERVAL);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, totalImages]);

  // Resume auto-play after 8 seconds of inactivity
  useEffect(() => {
    const resumeAutoPlayTimer = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 8000);

    return () => clearTimeout(resumeAutoPlayTimer);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    carouselRef.current?.addEventListener("keydown", handleKeyDown);
    return () => {
      carouselRef.current?.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToPrevious, goToNext]);

  return (
    <div
      className="gallery-carousel"
      ref={carouselRef}
      role="region"
      aria-label="Photo gallery carousel of our work and workshops"
      tabIndex={0}
    >
      {/* Main carousel container */}
      <div className="carousel-container">
        <div className="carousel-track">
          {GALLERY_IMAGES.map((image, index) => (
            <div
              key={image.src}
              className={`carousel-slide ${index === currentIndex ? "is-active" : ""}`}
              aria-hidden={index !== currentIndex ? "true" : "false"}
            >
              <img
                src={image.src}
                alt={image.alt}
                width={1200}
                height={800}
                loading={index === currentIndex ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}
        </div>

        {/* Previous button */}
        <button
          className="carousel-button carousel-button-prev"
          onClick={goToPrevious}
          aria-label="Previous image"
          title="Previous image (← key)"
        >
          <span className="carousel-button-icon">‹</span>
        </button>

        {/* Next button */}
        <button
          className="carousel-button carousel-button-next"
          onClick={goToNext}
          aria-label="Next image"
          title="Next image (→ key)"
        >
          <span className="carousel-button-icon">›</span>
        </button>
      </div>

      {/* Dot navigation */}
      <div className="carousel-dots" role="group" aria-label="Slide navigation">
        {GALLERY_IMAGES.map((_, index) => (
          <button
            key={index}
            className={`carousel-dot ${index === currentIndex ? "is-active" : ""}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${index + 1} of ${totalImages}`}
            aria-current={index === currentIndex ? "page" : undefined}
          />
        ))}
      </div>

      {/* Slide counter */}
      <div className="carousel-counter" aria-live="polite" aria-atomic="true">
        {currentIndex + 1} / {totalImages}
      </div>

      {/* Auto-play indicator */}
      <p className="carousel-info">
        {/* Use ← → arrow keys or click buttons to navigate. Images auto-play every 5 seconds. */}
      </p>
    </div>
  );
}
