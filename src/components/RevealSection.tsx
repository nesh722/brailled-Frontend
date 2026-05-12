import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
};

/** Adds a one-time fade-up when the section enters the viewport. */
export function RevealSection({ children, className = "", id, "aria-labelledby": ariaLabelledBy }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className={`${className} land-reveal${visible ? " is-visible" : ""}`.trim()}
      aria-labelledby={ariaLabelledBy}
    >
      {children}
    </section>
  );
}
