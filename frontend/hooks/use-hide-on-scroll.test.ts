import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useHideOnScroll } from './use-hide-on-scroll'

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  window.dispatchEvent(new Event('scroll'))
}

describe('useHideOnScroll', () => {
  afterEach(() => {
    scrollTo(0)
  })

  it('starts visible', () => {
    const { result } = renderHook(() => useHideOnScroll())
    expect(result.current).toBe(false)
  })

  it('hides after scrolling down past the threshold', () => {
    const { result } = renderHook(() => useHideOnScroll())

    act(() => scrollTo(200))

    expect(result.current).toBe(true)
  })

  it('shows again after scrolling up', () => {
    const { result } = renderHook(() => useHideOnScroll())

    act(() => scrollTo(200))
    expect(result.current).toBe(true)

    act(() => scrollTo(150))

    expect(result.current).toBe(false)
  })

  it('ignores small scroll movements', () => {
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
    const { result } = renderHook(() => useHideOnScroll())

    act(() => scrollTo(103))

    expect(result.current).toBe(false)
  })

  it('shows when scrolled back near the top', () => {
    const { result } = renderHook(() => useHideOnScroll())

    act(() => scrollTo(200))
    expect(result.current).toBe(true)

    act(() => scrollTo(10))

    expect(result.current).toBe(false)
  })
})
