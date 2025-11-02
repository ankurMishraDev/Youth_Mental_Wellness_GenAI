'use client';

import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = dotRef.current;
    if (!cursor || !dot) return;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let dotX = 0;
    let dotY = 0;

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      if (!isVisible) {
        setIsVisible(true);
      }
    };

    // Mouse enter/leave handlers for visibility
    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    // Check if element is interactive
    const isInteractive = (element: Element | null): boolean => {
      if (!element) return false;
      
      const interactiveTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'];
      const interactiveRoles = ['button', 'link'];
      
      return (
        interactiveTags.includes(element.tagName) ||
        interactiveRoles.includes(element.getAttribute('role') || '') ||
        element.classList.contains('cursor-pointer') ||
        element.classList.contains('clickable') ||
        element.hasAttribute('onClick') ||
        element.hasAttribute('data-clickable')
      );
    };

    // Mouse over handler for hover effect
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (isInteractive(target)) {
        cursor.classList.add('hovering');
      }
    };

    // Mouse out handler
    const handleMouseOut = (e: MouseEvent) => {
      cursor.classList.remove('hovering');
    };

    // Mouse down/up for click effect
    const handleMouseDown = () => {
      cursor.classList.add('clicking');
    };

    const handleMouseUp = () => {
      cursor.classList.remove('clicking');
    };

    // Smooth animation loop
    const animate = () => {
      // Smooth follow for main cursor (with easing)
      const ease = 0.15;
      cursorX += (mouseX - cursorX) * ease;
      cursorY += (mouseY - cursorY) * ease;

      // Faster follow for dot
      const dotEase = 0.3;
      dotX += (mouseX - dotX) * dotEase;
      dotY += (mouseY - dotY) * dotEase;

      // Update positions
      cursor.style.transform = `translate(${cursorX - 12}px, ${cursorY - 12}px)`;
      dot.style.transform = `translate(${dotX - 3}px, ${dotY - 3}px)`;

      requestAnimationFrame(animate);
    };

    // Start animation loop
    const animationId = requestAnimationFrame(animate);

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isVisible]);

  return (
    <>
      <div
        ref={cursorRef}
        className="custom-cursor"
        style={{
          opacity: isVisible ? 0.95 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
      <div
        ref={dotRef}
        className="custom-cursor-dot"
        style={{
          opacity: isVisible ? 0.9 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
    </>
  );
}
