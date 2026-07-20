"use client"



import { useDictionary } from "@i18n/provider"

import { cn } from "@modules/design-system"

import {

  getParticipationProgressStageIndex,

  PARTICIPATION_PROGRESS_STAGES,

  type ParticipationProgressStage,

} from "@lib/util/participation-progress-stage"



type ParticipationProgressStepperProps = {

  stage: ParticipationProgressStage

  className?: string

}



const ParticipationProgressStepper = ({

  stage,

  className,

}: ParticipationProgressStepperProps) => {

  const t = useDictionary()

  const labels = t.account.participations.progressStages

  const currentIndex = getParticipationProgressStageIndex(stage)



  return (

    <div className={cn("flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4", className)}>

      <p className="text-sm font-bold text-[#111827]">

        {t.account.participations.progressTitle}

      </p>

      <ol className="grid grid-cols-5 gap-1">

        {PARTICIPATION_PROGRESS_STAGES.map((item, index) => {

          const isCurrent = index === currentIndex

          const isDone = index < currentIndex



          return (

            <li key={item} className="flex flex-col items-center gap-1.5">

              <span

                className={cn(

                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",

                  isCurrent

                    ? "bg-[#6B46E5] text-white"

                    : isDone

                      ? "bg-[#DDD6FE] text-[#6B46E5]"

                      : "bg-[#F3F4F6] text-[#9CA3AF]"

                )}

              >

                {index + 1}

              </span>

              <span

                className={cn(

                  "text-center text-[9px] font-semibold leading-tight",

                  isCurrent

                    ? "text-[#6B46E5]"

                    : isDone

                      ? "text-[#6B46E5]/70"

                      : "text-[#9CA3AF]"

                )}

              >

                {labels[item]}

              </span>

            </li>

          )

        })}

      </ol>

      <div className="grid grid-cols-5 gap-1">

        {PARTICIPATION_PROGRESS_STAGES.map((item, index) => {

          const isDone = index < currentIndex

          const isCurrent = index === currentIndex



          return (

            <div

              key={`bar-${item}`}

              className={cn(

                "h-1 rounded-full",

                isCurrent

                  ? "bg-[#6B46E5]"

                  : isDone

                    ? "bg-[#DDD6FE]"

                    : "bg-[#F3F4F6]"

              )}

            />

          )

        })}

      </div>

    </div>

  )

}



export default ParticipationProgressStepper

