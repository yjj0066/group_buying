"use client"

import { useEffect, useState } from "react"

type PriceRangeFilterProps = {
  minBound: number
  maxBound: number
  minValue: number | null
  maxValue: number | null
  onChange: (next: { minPrice: number | null; maxPrice: number | null }) => void
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const PriceRangeFilter = ({
  minBound,
  maxBound,
  minValue,
  maxValue,
  onChange,
}: PriceRangeFilterProps) => {
  const floor = Math.min(minBound, maxBound)
  const ceiling = Math.max(minBound, maxBound, floor + 1000)
  const [localMin, setLocalMin] = useState(minValue ?? floor)
  const [localMax, setLocalMax] = useState(maxValue ?? ceiling)

  useEffect(() => {
    setLocalMin(minValue ?? floor)
    setLocalMax(maxValue ?? ceiling)
  }, [minValue, maxValue, floor, ceiling])

  const commitRange = (nextMin: number, nextMax: number) => {
    const sortedMin = Math.min(nextMin, nextMax)
    const sortedMax = Math.max(nextMin, nextMax)

    setLocalMin(sortedMin)
    setLocalMax(sortedMax)

    onChange({
      minPrice: sortedMin <= floor ? null : sortedMin,
      maxPrice: sortedMax >= ceiling ? null : sortedMax,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px] font-medium text-[#6B7280]">
          최소
          <input
            type="number"
            min={floor}
            max={ceiling}
            value={localMin}
            onChange={(event) => {
              const parsed = Number(event.target.value)

              if (Number.isNaN(parsed)) {
                return
              }

              commitRange(parsed, localMax)
            }}
            className="bb-input h-10"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-medium text-[#6B7280]">
          최대
          <input
            type="number"
            min={floor}
            max={ceiling}
            value={localMax}
            onChange={(event) => {
              const parsed = Number(event.target.value)

              if (Number.isNaN(parsed)) {
                return
              }

              commitRange(localMin, parsed)
            }}
            className="bb-input h-10"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 px-1">
        <input
          type="range"
          min={floor}
          max={ceiling}
          step={500}
          value={localMin}
          onChange={(event) =>
            commitRange(Number(event.target.value), localMax)
          }
          className="h-2 w-full cursor-pointer accent-[#6B46E5]"
        />
        <input
          type="range"
          min={floor}
          max={ceiling}
          step={500}
          value={localMax}
          onChange={(event) =>
            commitRange(localMin, Number(event.target.value))
          }
          className="h-2 w-full cursor-pointer accent-[#6B46E5]"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
        <span>{floor.toLocaleString("ko-KR")}원</span>
        <span className="font-semibold text-[#4338CA]">
          {localMin.toLocaleString("ko-KR")} ~ {localMax.toLocaleString("ko-KR")}원
        </span>
        <span>{ceiling.toLocaleString("ko-KR")}원</span>
      </div>
    </div>
  )
}

export default PriceRangeFilter
