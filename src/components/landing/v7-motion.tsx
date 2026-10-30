"use client";

import { useEffect } from "react";

export function V7Motion() {
  useEffect(() => {
    const header = document.getElementById("v7-header");
    const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 12);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sections = document.querySelectorAll<HTMLElement>("[data-v7-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) sections.forEach(section => section.classList.add("is-visible"));
    else {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } });
      }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
      sections.forEach(section => observer.observe(section));
      return () => { window.removeEventListener("scroll", updateHeader); observer.disconnect(); };
    }
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);
  return null;
}
