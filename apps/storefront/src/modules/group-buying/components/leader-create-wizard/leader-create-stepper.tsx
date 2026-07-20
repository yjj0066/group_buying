"use client"

import { BbSteps } from "@modules/design-system"

import { LEADER_CREATE_WIZARD_STEPS } from "./constants"

type LeaderCreateStepperProps = {
  currentIndex: number
}

export const LeaderCreateStepper = ({ currentIndex }: LeaderCreateStepperProps) => (
  <BbSteps steps={[...LEADER_CREATE_WIZARD_STEPS]} currentIndex={currentIndex} />
)

export default LeaderCreateStepper
