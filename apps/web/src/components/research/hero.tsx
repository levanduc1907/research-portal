"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@repo/ui/components/ui/button";
import {
  type CarouselApi,
  Carousel,
  CarouselAutoplay,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@repo/ui/components/ui/carousel";
// Official campus photography from illinois.edu, supplied for this portal.
const slides = [
  {
    image: "/images/illinois-campus-1.jpg",
    title: "Discovery starts at Illinois.",
    text: "Meet the people and ideas shaping research across our campus.",
    alt: "University of Illinois Urbana-Champaign campus",
  },
  {
    image: "/images/illinois-campus-10.jpg",
    title: "A community of curious minds.",
    text: "Explore the expertise behind Illinois research.",
    alt: "Campus at the University of Illinois Urbana-Champaign",
  },
  {
    image: "/images/illinois-research-park.jpg",
    title: "Ideas find a home here.",
    text: "Discover research and collaboration at Illinois Research Park.",
    alt: "Illinois Research Park campus",
  },
  {
    image: "/images/illinois-champaign-urbana.jpg",
    title: "Discover Champaign-Urbana.",
    text: "Get to know the community Illinois calls home.",
    alt: "Champaign-Urbana, home to the University of Illinois",
  },
];
export function Hero(): React.JSX.Element {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const autoplay = useRef(
    CarouselAutoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );

  useEffect(() => {
    if (!api) return;
    const updateIndex = (): void => setIndex(api.selectedScrollSnap());
    updateIndex();
    api.on("select", updateIndex);
    api.on("reInit", updateIndex);

    return () => {
      api.off("select", updateIndex);
      api.off("reInit", updateIndex);
    };
  }, [api]);

  return (
    <section
      className="hero-wrap"
      aria-label="Research highlights"
    >
      <Carousel
        className="campus-hero"
        opts={{ loop: true }}
        plugins={[autoplay.current]}
        setApi={setApi}
      >
        <CarouselContent className="hero-track">
          {slides.map((slide, slideIndex) => (
            <CarouselItem
              className="hero-slide"
              key={slide.image}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="hero-image"
                src={slide.image}
                alt={slide.alt}
                fetchPriority={slideIndex === 0 ? "high" : "auto"}
                draggable={false}
              />
              <div className="hero-shade" />
              <div className="hero-copy">
                <span className="eyebrow">Discovery starts here</span>
                <h1>{slide.title}</h1>
                <p>{slide.text}</p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="slider-controls">
          <div className="slide-dots">
            {slides.map((s, i) => (
              <Button
                key={s.title}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Show slide ${i + 1}: ${s.title}`}
                aria-current={i === index ? "true" : undefined}
                className={i === index ? "active" : ""}
                onClick={() => api?.scrollTo(i)}
              />
            ))}
          </div>
          <div className="slide-arrows">
            <span>
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(slides.length).padStart(2, "0")}
            </span>
            <CarouselPrevious className="hero-arrow hero-arrow-previous" />
            <CarouselNext className="hero-arrow hero-arrow-next" />
          </div>
        </div>
      </Carousel>
    </section>
  );
}
