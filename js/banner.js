// ===============================
// BANNER SLIDER
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const slider = document.getElementById("proSlider");
  if (!slider) return;

  const slides = document.querySelectorAll(".pro-slide");
  const dotsContainer = document.getElementById("proDots");

  let index = 0;
  let interval;

  // Create dots dynamically
  slides.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.addEventListener("click", () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll("span");

  function updateDots() {
    dots.forEach(dot => dot.classList.remove("active"));
    if (dots[index]) dots[index].classList.add("active");
  }

  function goToSlide(i) {
    index = i;
    slider.style.transform = `translateX(-${index * 100}%)`;
    updateDots();
  }

  function nextSlide() {
    index = (index + 1) % slides.length;
    goToSlide(index);
  }

  function startAutoSlide() {
    interval = setInterval(nextSlide, 3500);
  }

  function stopAutoSlide() {
    clearInterval(interval);
  }

  // Pause on hover
  slider.addEventListener("mouseenter", stopAutoSlide);
  slider.addEventListener("mouseleave", startAutoSlide);

  // Start
  updateDots();
  startAutoSlide();
});

// Click banner → open category filter on menu page
function openProduct(category) {
  // index.html is at root; menu.html lives in /pages/
  const base = window.location.pathname === "/" || window.location.pathname.endsWith("index.html")
    ? "pages/menu.html"
    : "menu.html";
  window.location.href = `${base}?category=${category}`;
}

// ===============================
// TESTIMONIAL AUTO-SCROLL
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const radios = ["c1", "c2", "c3"].map(id => document.getElementById(id)).filter(Boolean);
  if (!radios.length) return;

  let currentIndex = 0;
  let testimonialInterval;

  function nextTestimonial() {
    currentIndex = (currentIndex + 1) % radios.length;
    radios[currentIndex].checked = true;
  }

  function startTestimonialAuto() {
    testimonialInterval = setInterval(nextTestimonial, 4000);
  }

  function stopTestimonialAuto() {
    clearInterval(testimonialInterval);
  }

  // Pause on manual click
  radios.forEach((radio, i) => {
    radio.addEventListener("change", () => {
      currentIndex = i;
      stopTestimonialAuto();
      startTestimonialAuto(); // restart timer from this slide
    });
  });

  const carousel = document.querySelector(".carousel");
  if (carousel) {
    carousel.addEventListener("mouseenter", stopTestimonialAuto);
    carousel.addEventListener("mouseleave", startTestimonialAuto);
  }

  startTestimonialAuto();
});
