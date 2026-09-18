import { useEffect, useRef, useState } from 'react'

const SHOW_NEAR_TOP_THRESHOLD = 16
const DIRECTION_THRESHOLD = 8

/**
 * Tracks scroll direction to drive a hide-on-scroll-down / show-on-scroll-up
 * UI pattern (e.g. a sticky top bar). Small movements are ignored via
 * DIRECTION_THRESHOLD so jitter doesn't toggle visibility, and the element is
 * always shown near the top of the page regardless of direction.
 */
export function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    lastScrollY.current = window.scrollY

    function handleScroll() {
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY.current

      if (currentScrollY <= SHOW_NEAR_TOP_THRESHOLD) {
        setHidden(false)
      } else if (delta > DIRECTION_THRESHOLD) {
        setHidden(true)
      } else if (delta < -DIRECTION_THRESHOLD) {
        setHidden(false)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return hidden
}
