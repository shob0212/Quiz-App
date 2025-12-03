"use client"

import React, { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import './picker.css'

interface PickerProps {
  options: (string | number)[]
  value: string | number
  onChange: (value: string | number) => void
  disabled?: boolean
}

const Picker: React.FC<PickerProps> = ({ options, value, onChange, disabled }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    axis: 'y',
    containScroll: 'trimSnaps',
  })

  const handleSelect = useCallback(() => {
    if (!emblaApi) return
    const selectedSnap = emblaApi.selectedScrollSnap()
    onChange(options[selectedSnap])
  }, [emblaApi, options, onChange])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', handleSelect)
    emblaApi.on('reInit', handleSelect)

    return () => {
      emblaApi.off('select', handleSelect)
      emblaApi.off('reInit', handleSelect)
    }
  }, [emblaApi, handleSelect])

  useEffect(() => {
    if (emblaApi) {
      const selectedIndex = options.indexOf(value)
      if (emblaApi.selectedScrollSnap() !== selectedIndex) {
        emblaApi.scrollTo(selectedIndex, 0)
      }
    }
  }, [emblaApi, value, options])

  return (
    <div className={`picker ${disabled ? 'picker--disabled' : ''}`}>
      <div className="picker__viewport" ref={emblaRef}>
        <div className="picker__container">
          {options.map((option, index) => (
            <div
              className="picker__slide mt-4"
              key={index}
            >
              {option}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Picker
